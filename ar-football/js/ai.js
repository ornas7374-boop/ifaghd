// Defender brains.
//
// Every defender perceives the attacker with a reaction delay (history buffer), optionally
// predicts where the ball is going, and is given a ROLE each 0.25 s by a team coordinator:
//   PRESS  – closest goal-side defender: jockeys at ~0.6 m, tackles when the ball is exposed
//   COVER  – sits behind/beside the presser on the side the attacker is drifting to (lane block)
//   SWEEP  – deeper, on the ball→goal line, protects the space behind
//   ZONE   – holds a lane across the width (only used with 4–5 defenders / low cooperation)
// Per-defender states: MOVE → TACKLE (lunge) → RECOVER (cooldown), or FOOLED after a feint.

import { PITCH, AI_UNIT as U } from './config.js';

const V = {
  len: (x, z) => Math.hypot(x, z),
};

export class Defender {
  constructor(i, mesh) {
    this.i = i; this.mesh = mesh;
    this.x = 0; this.z = 0; this.vx = 0; this.vz = 0;
    this.state = 'MOVE'; this.timer = 0; this.cooldown = 0;
    this.role = 'PRESS';
    this.beaten = false;       // attacker got past him this attack
    this.touchedBall = false;  // during current tackle
    this.facing = 0;
    this.tx = 0; this.tz = 0;  // current target (debug)
  }
  get speed() { return V.len(this.vx, this.vz); }
}

export class DefenseAI {
  constructor() {
    this.history = []; // [{t, x, z, vx, vz, bx, bz}]
    this.defenders = [];
    this.coordT = 0;
  }

  setup(defenders, cfg, speedMul) { this.defenders = defenders; this.cfg = cfg; this.speedMul = speedMul; this.history.length = 0; }

  record(t, att, ball) {
    this.history.push({ t, x: att.x, z: att.z, vx: att.vx, vz: att.vz, bx: ball.x, bz: ball.z, bvx: ball.vx, bvz: ball.vz });
    while (this.history.length > 2 && t - this.history[0].t > 1.2) this.history.shift();
  }

  // What the defenders "see": the world `reaction` seconds ago, extrapolated by `predict`.
  perceive(t) {
    const want = t - this.cfg.reaction;
    let h = this.history[0];
    for (const e of this.history) { if (e.t <= want) h = e; else break; }
    if (!h) return null;
    const look = this.cfg.predict * 0.7; // seconds of extrapolation
    // Prediction uses the delayed snapshot, so an old read + fast cut = they guess wrong.
    return {
      x: h.x + h.vx * look, z: h.z + h.vz * look,
      bx: h.bx + (h.bvx * 0.6 + h.vx * 0.4) * look, bz: h.bz + (h.bvz * 0.6 + h.vz * 0.4) * look,
      vx: h.vx, vz: h.vz,
    };
  }

  // Assign roles. Cooperation decides how organised the shape is.
  coordinate(att) {
    const live = this.defenders.filter((d) => d.state !== 'FOOLED' || d.timer < 0.2);
    const goalSide = (d) => d.z < att.z + 0.5 * U;
    const byDist = [...live].sort((a, b) => V.len(a.x - att.x, a.z - att.z) - V.len(b.x - att.x, b.z - att.z));
    const coop = this.cfg.coop;
    let presser = byDist.find(goalSide) || byDist[0];
    for (const d of this.defenders) d.role = coop < 0.25 ? 'PRESS' : 'ZONE';
    if (!presser) return;
    presser.role = 'PRESS';
    if (coop < 0.25) return; // easy: everyone just chases (with gaps from engage range)
    const rest = byDist.filter((d) => d !== presser);
    if (rest[0]) rest[0].role = 'COVER';
    if (rest[1]) rest[1].role = 'SWEEP';
    // A beaten defender that is behind the play chases back as a second presser on hard.
    for (const d of rest) if (d.beaten && coop > 0.8 && V.len(d.x - att.x, d.z - att.z) < 6 * U) d.role = 'PRESS';
  }

  update(dt, t, att, ball, owner, events) {
    const cfg = this.cfg;
    this.coordT -= dt;
    if (this.coordT <= 0) { this.coordT = 0.25; this.coordinate(att); }
    const P = this.perceive(t);
    if (!P) return;
    const gx = 0, gz = PITCH.goalZ;
    const maxV = cfg.speed * this.speedMul;
    const accel = cfg.accel * this.speedMul;
    const attackerHasBall = owner === 'A';
    const lateralDir = Math.sign(P.vx) || 0;

    for (const d of this.defenders) {
      d.cooldown = Math.max(0, d.cooldown - dt);
      d.timer = Math.max(0, d.timer - dt);
      if (d.state === 'TACKLE' && d.timer <= 0) { d.state = 'RECOVER'; d.timer = 0.45; d.cooldown = cfg.tackleCooldown; }
      if ((d.state === 'RECOVER' || d.state === 'FOOLED') && d.timer <= 0) d.state = 'MOVE';

      let tx = d.x, tz = d.z, speedCap = maxV, acc = accel;
      // vector ball → goal
      const bgx = gx - P.bx, bgz = gz - P.bz, bgl = V.len(bgx, bgz) || 1;
      const ux = bgx / bgl, uz = bgz / bgl;
      const dBall = V.len(ball.x - d.x, ball.z - d.z);
      const dAtt = V.len(att.x - d.x, att.z - d.z);

      if (owner === d.i) {
        // Defender won the ball: carry it away from goal.
        tx = d.x + (d.x > 0 ? 1 : -1) * 2 * U; tz = d.z + 6 * U; speedCap = maxV * 0.8;
      } else if (d.state === 'TACKLE') {
        // Smarter defenders keep correcting the lunge toward where the ball is going.
        const lead = 0.15 + cfg.predict * 0.15, k = Math.min(1, cfg.predict * dt * 7);
        d.lungeX += (ball.x + ball.vx * lead - d.lungeX) * k; d.lungeZ += (ball.z + ball.vz * lead - d.lungeZ) * k;
        tx = d.lungeX; tz = d.lungeZ; speedCap = maxV * 1.55; acc = accel * 2.2;
      } else if (d.state === 'FOOLED') {
        // Wrong-footed: keep sliding the wrong way, barely able to steer.
        tx = d.x + d.vx; tz = d.z + d.vz; acc = accel * 0.15;
      } else if (d.state === 'RECOVER') {
        tx = d.x; tz = d.z; acc = accel * 0.6; speedCap = maxV * 0.4;
      } else if (!attackerHasBall && owner !== 'A' && typeof owner !== 'number') {
        // Loose ball: nearest two race to it, others hold shape.
        const rank = [...this.defenders].sort((a, b) => V.len(ball.x - a.x, ball.z - a.z) - V.len(ball.x - b.x, ball.z - b.z)).indexOf(d);
        if (rank < 2) { tx = ball.x + ball.vx * 0.3; tz = ball.z + ball.vz * 0.3; }
        else { tx = P.bx + ux * 8 * U; tz = P.bz + uz * 8 * U; }
      } else if (typeof owner === 'number') {
        // Teammate has it: jog to support.
        tx = d.x; tz = d.z + 2 * U; speedCap = maxV * 0.4;
      } else {
        const engaged = dAtt < cfg.engageRange || d.role !== 'PRESS' || cfg.coop > 0.25;
        switch (d.role) {
          case 'PRESS': {
            if (!engaged) { tx = d.homeX; tz = d.homeZ; speedCap = maxV * 0.5; break; }
            // Goal-side jockey point in front of the ball; closer on higher aggression.
            const jockey = (1.7 - cfg.aggression * 0.3) * U;
            tx = P.bx + ux * jockey; tz = P.bz + uz * jockey;
            if (d.beaten) { tx = P.bx; tz = P.bz; } // chase from behind
            break;
          }
          case 'COVER': {
            // Second line, shifted to the side the attacker is moving toward (lane block).
            const side = lateralDir * 2.6 * U * cfg.laneBlock;
            tx = P.bx + ux * 5 * U + side; tz = P.bz + uz * 5 * U;
            break;
          }
          case 'SWEEP': {
            tx = P.bx * 0.6 + ux * 10 * U; tz = P.bz + uz * 10 * U;
            break;
          }
          default: { // ZONE: hold a lane across the width at a depth between ball and goal
            const lanes = [-11, 11, -5, 5, 0].map((v) => v * U * 0.6);
            const lane = lanes[d.i % lanes.length];
            tx = lane + (P.bx - lane) * 0.35 * cfg.laneBlock;
            tz = Math.max(gz + 6 * U, Math.min(d.homeZ, P.bz - 9 * U));
          }
        }
        if (d.beaten && d.role !== 'PRESS') { tx = (tx + P.bx) / 2; tz = Math.min(tz, P.bz - 3 * U); }

        // Tackle decision (presser, or anyone very close).
        if (d.cooldown <= 0 && dBall < cfg.tackleRange && (d.role === 'PRESS' || dBall < 1.2 * U)) {
          const exposed = V.len(ball.x - att.x, ball.z - att.z) > 0.9 * U * 1.4; // heavy touch = bait
          // Attacker running straight at me = easy read → commit.
          const closing = -((att.x - d.x) * att.vx + (att.z - d.z) * att.vz) / (dAtt || 1);
          const rate = (exposed ? 4 : 1.6) + (closing > 3 * U * 1.4 ? 2.5 : 0);
          const chance = rate * cfg.aggression * dt;
          if (Math.random() < chance) {
            d.state = 'TACKLE'; d.timer = 0.42; d.touchedBall = false;
            const lead = 0.15 + cfg.predict * 0.15;
            d.lungeX = ball.x + ball.vx * lead; d.lungeZ = ball.z + ball.vz * lead;
            events.push({ type: 'tackleStart', d });
          }
        }
      }

      // Steering: arrive at target.
      let dx = tx - d.x, dz = tz - d.z; const dl = V.len(dx, dz);
      const desiredSpeed = d.state === 'TACKLE' ? speedCap : Math.min(speedCap, dl * 2.2 / U * 0.6);
      let dvx = dl > 1e-3 ? (dx / dl) * desiredSpeed : 0, dvz = dl > 1e-3 ? (dz / dl) * desiredSpeed : 0;
      // Separation from teammates
      for (const o of this.defenders) {
        if (o === d) continue;
        const sx = d.x - o.x, sz = d.z - o.z, sl = V.len(sx, sz);
        const sep = 2.2 * U * 1.3; if (sl < sep && sl > 1e-3) { dvx += (sx / sl) * (sep - sl) * 4; dvz += (sz / sl) * (sep - sl) * 4; }
      }
      // Don't run through the attacker unless tackling
      if (d.state !== 'TACKLE' && dAtt < 0.75 && dAtt > 1e-3) {
        dvx += ((d.x - att.x) / dAtt) * (0.75 - dAtt) * 6; dvz += ((d.z - att.z) / dAtt) * (0.75 - dAtt) * 6;
      }
      let ax = dvx - d.vx, az = dvz - d.vz; const al = V.len(ax, az), amax = acc * dt;
      if (al > amax) { ax = (ax / al) * amax; az = (az / al) * amax; }
      d.vx += ax; d.vz += az;
      const sp = d.speed, cap = d.state === 'TACKLE' ? maxV * 1.55 : maxV;
      if (sp > cap) { d.vx *= cap / sp; d.vz *= cap / sp; }
      d.x += d.vx * dt; d.z += d.vz * dt;
      d.x = Math.max(-PITCH.halfWidth, Math.min(PITCH.halfWidth, d.x));
      d.z = Math.max(PITCH.goalZ + 0.3, Math.min(PITCH.backZ, d.z));
      d.tx = tx; d.tz = tz;
      // Face the ball
      const fx = ball.x - d.x, fz = ball.z - d.z;
      const want = Math.atan2(-fx, -fz);
      let da = want - d.facing; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      d.facing += da * Math.min(1, dt * 8);
    }
  }

  // Attacker made a sharp cut/feint in direction `dir`.
  onFeint(att, dir) {
    const out = [];
    for (const d of this.defenders) {
      if (d.state === 'TACKLE') continue;
      const dl = V.len(att.x - d.x, att.z - d.z);
      if (dl > 5.5 * U * 1.2 || d.z > att.z + U) continue; // only defenders in front and close are affected
      if (Math.random() < this.cfg.readFeint) continue; // read it
      d.state = 'FOOLED'; d.timer = this.cfg.foolTime;
      // momentum the wrong way
      d.vx = -dir * Math.max(1.1, Math.abs(d.vx)); d.vz *= 0.5;
      out.push(d);
    }
    return out;
  }
}

// Goalkeeper: stays on the line between ball and goal centre, dives at shots within reach.
export class Goalkeeper {
  constructor(mesh) { this.mesh = mesh; this.x = 0; this.z = PITCH.goalZ + 0.4; this.vx = 0; this.vz = 0; this.dive = 0; this.diveDir = 0; this.facing = Math.PI; }
  reset() { this.x = 0; this.z = PITCH.goalZ + 0.4; this.vx = 0; this.vz = 0; this.dive = 0; }
  update(dt, ball, cfg) {
    const g = PITCH.goalZ;
    const dz = Math.max(0.3, ball.z - g);
    // narrow the angle: come off the line a bit as the ball approaches
    const off = Math.min(1.2, Math.max(0.35, 4 / dz));
    let tx = (ball.x / dz) * off * 1.1, tz = g + off;
    tx = Math.max(-PITCH.goalHalfWidth + 0.2, Math.min(PITCH.goalHalfWidth - 0.2, tx));
    // React to a shot heading for goal (after a reaction delay that depends on difficulty)
    const shotIncoming = ball.vz < -3 && ball.z < g + 8;
    if (!shotIncoming) this.shotSeen = 0;
    else if (this.dive <= 0) {
      this.shotSeen = (this.shotSeen || 0) + dt;
      const tHit = (ball.z - g) / -ball.vz;
      const hitX = ball.x + ball.vx * tHit;
      if (this.shotSeen > (1 - cfg.gkReflex) * 0.4 && Math.abs(hitX) < PITCH.goalHalfWidth + 0.2 && tHit < 1.2) { this.dive = 0.7; this.diveX = hitX; }
    }
    if (shotIncoming && this.dive <= 0) {
      this.vx *= 0.8; // set position, wait for the read
    } else if (this.dive > 0) {
      this.dive -= dt;
      // Dive speed limits how far he gets before the ball arrives.
      const dir = Math.sign(this.diveX - this.x);
      this.vx += (dir * 2.0 * cfg.gkReflex - this.vx) * Math.min(1, dt * 12);
      if (Math.abs(this.diveX - this.x) < 0.1) this.vx *= 0.5;
    } else {
      this.vx += ((tx - this.x) * 3 - this.vx) * Math.min(1, dt * 6);
    }
    this.vz = (tz - this.z) * 3;
    this.x += this.vx * dt; this.z += this.vz * dt;
  }
}
