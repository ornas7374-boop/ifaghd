// Pressing defenders in WORLD space (metres, x right / z back, the phone's start is the origin).
// They attack at once: sprint at your ball, jockey in front of it along your direction of travel,
// lunge when it is loose, chase you if you beat them, and a fresh defender steps up straight after.
// Difficulty is a continuous LEVEL (1–10), not three presets, so the coach can tune it to you.

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function cfgFromLevel(level) {
  const t = clamp((level - 1) / 9, 0, 1);
  return {
    sprint: lerp(2.5, 4.6, t), accel: lerp(5, 13, t),
    reaction: lerp(0.42, 0.1, t), predict: lerp(0, 0.95, t),
    reach: lerp(0.85, 1.15, t), jockey: lerp(0.95, 0.7, t),
    lungeRate: lerp(0.45, 1.9, t), winR: lerp(0.22, 0.42, t), cooldown: lerp(2.2, 0.85, t),
    blockR: lerp(0.2, 0.34, t), beatDx: lerp(0.13, 0.27, t), grace: 0.9,
    count: level < 4 ? 1 : level < 8 ? 2 : 3,
  };
}

export class Agent {
  constructor(id, cfg, pos) {
    this.id = id; this.cfg = cfg; this.x = pos.x; this.z = pos.z; this.vx = 0; this.vz = 0;
    this.state = 'charge'; this.t = 0; this.cool = cfg.grace; this.hist = []; this.lunge = null;
    this.facing = 0; this.age = 0; this.beatenReported = false; this.ctx = null;
  }
  get speed() { return Math.hypot(this.vx, this.vz); }

  update(dt, now, W, others, ev) {
    const c = this.cfg, { user, f, ball } = W, l = { x: -f.z, z: f.x };
    this.t += dt; this.age += dt; this.cool = Math.max(0, this.cool - dt);
    // delayed + extrapolated view of the ball
    this.hist.push({ now, x: ball.x, z: ball.z, vx: ball.vx, vz: ball.vz });
    while (this.hist.length > 2 && now - this.hist[0].now > 1.0) this.hist.shift();
    let h = this.hist[0]; for (const e of this.hist) { if (e.now <= now - c.reaction) h = e; else break; }
    const look = c.predict * 0.45, bx = h.x + h.vx * look, bz = h.z + h.vz * look;
    const dBall = Math.hypot(ball.x - this.x, ball.z - this.z);
    const ballFromUser = Math.hypot(ball.x - user.x, ball.z - user.z);
    const exposed = ballFromUser > 1.05;
    let tx = this.x, tz = this.z, vmax = c.sprint, acc = c.accel;
    // depth/lateral of the ball relative to this defender along the user's direction of travel
    const rx = ball.x - this.x, rz = ball.z - this.z, depth = rx * f.x + rz * f.z, lat = rx * l.x + rz * l.z;

    switch (this.state) {
      case 'charge': {
        // run straight at where the ball will be, arriving on the far side of it
        const T = clamp(dBall / c.sprint, 0.2, 0.9);
        tx = bx + h.vx * T * c.predict + f.x * c.jockey * 0.7; tz = bz + h.vz * T * c.predict + f.z * c.jockey * 0.7;
        if (dBall < 1.5) this.state = 'jockey';
        break;
      }
      case 'jockey': {
        tx = bx + f.x * c.jockey; tz = bz + f.z * c.jockey;
        if (this.cool <= 0 && dBall < c.reach && ball.seen) {
          const rate = c.lungeRate * (exposed ? 2.3 : 1) * (dBall < c.reach * 0.7 ? 1.5 : 1);
          if (Math.random() < rate * dt) {
            const lead = 0.12 + c.predict * 0.15;
            this.lunge = { x: ball.x + ball.vx * lead, z: ball.z + ball.vz * lead, t: 0, body: false, exposed, ballDist: ballFromUser };
            this.state = 'lunge'; this.t = 0; ev.push({ type: 'lunge', agent: this });
          }
        }
        break;
      }
      case 'lunge': {
        const L = this.lunge; L.t += dt;
        const dx = L.x - this.x, dz = L.z - this.z, dl = Math.hypot(dx, dz) || 1;
        tx = L.x - (dx / dl) * 0.45; tz = L.z - (dz / dl) * 0.45; vmax = c.sprint * 1.6; acc = c.accel * 2.5;
        if (Math.hypot(user.x - this.x, user.z - this.z) < 0.42) L.body = true;
        if (L.t >= 0.45) {
          const foot = { x: this.x + (dx / dl) * 0.55, z: this.z + (dz / dl) * 0.55 };
          const miss = Math.hypot(ball.x - foot.x, ball.z - foot.z);
          if (miss < c.winR && ball.seen) { this.state = 'won'; this.t = 0; ev.push({ type: 'won', how: 'lunge', agent: this, exposed: L.exposed, ballDist: L.ballDist }); }
          else if (L.body && miss > 0.55) { this.state = 'recover'; this.t = 0; this.cool = c.cooldown + 0.6; ev.push({ type: 'foul', agent: this }); }
          else { this.state = 'recover'; this.t = 0; this.cool = c.cooldown; ev.push({ type: 'miss', agent: this }); }
        }
        break;
      }
      case 'recover': vmax = c.sprint * 0.4; if (this.t > 0.6) this.state = 'charge'; break;      // straight back at you
      case 'won': vmax = 0.7; tx = ball.x; tz = ball.z; break;
      case 'chase': {
        tx = ball.x - f.x * 0.9; tz = ball.z - f.z * 0.9; vmax = c.sprint * 0.85;
        if (this.t > 2.6) this.state = 'gone';
        break;
      }
      default: break;
    }

    // ball driven into his body → he blocks it and wins it
    if ((this.state === 'jockey' || this.state === 'charge' || this.state === 'recover') && ball.seen && dBall < c.blockR) {
      this.state = 'won'; this.t = 0; ev.push({ type: 'won', how: 'block', agent: this, exposed, ballDist: ballFromUser });
    }
    // you got the ball past him: it is behind his line and clear of his reach sideways
    if ((this.state === 'jockey' || this.state === 'recover' || this.state === 'charge') && ball.seen && depth > 0.25 && Math.abs(lat) > c.beatDx && dBall < 2.2) {   // ball now AHEAD of him along your travel
      this.state = 'chase'; this.t = 0; ev.push({ type: 'beaten', agent: this });
    }

    // steering (arrive), never inside you or on top of a team-mate
    let dvx = tx - this.x, dvz = tz - this.z; const dl = Math.hypot(dvx, dvz);
    const want = this.state === 'won' ? Math.min(vmax, dl * 3) : Math.min(vmax, 1.2 + dl * 3);
    dvx = dl > 1e-3 ? (dvx / dl) * want : 0; dvz = dl > 1e-3 ? (dvz / dl) * want : 0;
    for (const o of others) { if (o === this) continue; const sx = this.x - o.x, sz = this.z - o.z, sl = Math.hypot(sx, sz); if (sl < 1.0 && sl > 1e-3) { dvx += (sx / sl) * (1 - sl) * 3; dvz += (sz / sl) * (1 - sl) * 3; } }
    let ax = dvx - this.vx, az = dvz - this.vz; const al = Math.hypot(ax, az), am = acc * dt;
    if (al > am) { ax *= am / al; az *= am / al; }
    this.vx += ax; this.vz += az;
    this.x += this.vx * dt; this.z += this.vz * dt;
    if (this.state !== 'lunge') {
      const sx = this.x - user.x, sz = this.z - user.z, sl = Math.hypot(sx, sz);
      if (sl < 0.6 && sl > 1e-3) { this.x = user.x + (sx / sl) * 0.6; this.z = user.z + (sz / sl) * 0.6; }
    }
    const fx = this.state === 'chase' ? this.vx : ball.x - this.x, fz = this.state === 'chase' ? this.vz : ball.z - this.z;
    if (Math.hypot(fx, fz) > 0.05) {
      const want2 = Math.atan2(-fx, -fz); let da = want2 - this.facing;
      while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      this.facing += da * Math.min(1, dt * 9);
    }
  }
}

export class Press {
  constructor(level = 2) { this.agents = []; this.nid = 1; this.setLevel(level); this.spawnQueue = []; this.freeze = 0; }
  setLevel(level) { this.level = level; this.cfg = cfgFromLevel(level); for (const a of this.agents) a.cfg = this.cfg; }

  // ahead of the user (the way they are looking/going), a few metres away, slightly to a side
  spawn(W, delay = 0) { this.spawnQueue.push({ at: delay, W }); }
  _make(W) {
    const { user, f } = W, l = { x: -f.z, z: f.x }, d = 3.2 + Math.random() * 1.0, s = (Math.random() - 0.5) * 2.2;
    const a = new Agent(this.nid++, this.cfg, { x: user.x + f.x * d + l.x * s, z: user.z + f.z * d + l.z * s });
    a.facing = Math.atan2(-(user.x - a.x), -(user.z - a.z)); this.agents.push(a); return a;
  }
  reset(W) { this.agents.length = 0; this.spawnQueue.length = 0; this.freeze = 0; for (let i = 0; i < this.cfg.count; i++) this.spawn(W, i * 0.9); }

  update(dt, now, W) {
    const ev = [];
    // deferred spawns
    for (const q of this.spawnQueue) q.at -= dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= 0) { this._make(W); this.spawnQueue.shift(); }
    for (const a of this.agents) {
      if (this.freeze > 0 && a.state !== 'won') { a.vx *= 0.9; a.vz *= 0.9; continue; }
      a.update(dt, now, W, this.agents, ev);
    }
    this.freeze = Math.max(0, this.freeze - dt);
    for (const e of ev) {
      if (e.type === 'won') { this.freeze = 1.6; for (const o of this.agents) if (o !== e.agent) o.state = 'recover'; this.restartAt = now + 1.6; }
    }
    if (this.restartAt && now >= this.restartAt) { this.restartAt = 0; this.agents.length = 0; this.spawnQueue.length = 0; for (let i = 0; i < this.cfg.count; i++) this.spawn(W, 0.4 + i * 0.9); }
    // retire chasers that gave up, keep the number of attackers topped up
    const before = this.agents.length;
    this.agents = this.agents.filter((a) => a.state !== 'gone');
    const alive = this.agents.filter((a) => a.state !== 'chase').length + this.spawnQueue.length;
    if (!this.restartAt) for (let i = alive; i < this.cfg.count; i++) this.spawn(W, 0.5);
    void before;
    return ev;
  }
}
