// 1v1 defender brain against a REAL ball and a REAL player (world = mirrored camera space,
// metres, floor-relative; the camera is at z=0 and you attack TOWARD the camera, i.e. +z).
//
// The defender:
//   • perceives the ball with a reaction delay and (on harder levels) extrapolates its motion,
//   • keeps goal-side: between the ball and the camera, at a jockeying distance,
//   • backs off as you advance, but never closer than `minCamZ` to the camera,
//   • lunges for the ball when it's in reach — more often when your touch is heavy (ball far from your feet),
//   • a lunge WINS only if the ball is still where his foot lands (you can pull it away in real life),
//   • hitting your body without reaching the ball first = foul.

export const LEVELS = {
  easy:   { label: 'Easy',   speed: 1.3, accel: 3.5, reaction: 0.5, predict: 0.0, jockey: 0.9,  reach: 0.85, lungeRate: 0.4,  winR: 0.24, cooldown: 2.0, blockR: 0.2,  beatDx: 0.12 },
  medium: { label: 'Medium', speed: 2.1, accel: 7,  reaction: 0.28, predict: 0.4, jockey: 0.8,  reach: 1.0,  lungeRate: 0.95, winR: 0.34, cooldown: 1.5, blockR: 0.28, beatDx: 0.2 },
  hard:   { label: 'Hard',   speed: 2.9, accel: 12, reaction: 0.12, predict: 0.9, jockey: 0.72, reach: 1.1,  lungeRate: 1.6,  winR: 0.42, cooldown: 1.0, blockR: 0.34, beatDx: 0.26 },
};

export class Duel {
  constructor(level = 'medium') {
    this.cfg = LEVELS[level]; this.level = level;
    this.minCamZ = -1.6;   // closer than ~1.6 m a life-size man no longer fits in the frame
    this.reset({ x: 0, z: -2.5 });
  }
  setLevel(level) { this.cfg = LEVELS[level]; this.level = level; }

  reset(ball) {
    this.x = ball.x; this.z = Math.min(this.minCamZ, ball.z + this.cfg.jockey + 0.3);
    this.vx = 0; this.vz = 0; this.facing = 0;
    this.state = 'ready'; this.t = 0; this.cool = 1.2; this.hist = [];
    this.lunge = null; this.events = [];
  }

  // ball: {x,z,vx,vz,seen}; feet: {x,z} | null (your live feet position)
  update(dt, now, ball, feet) {
    const c = this.cfg, ev = this.events;
    this.t += dt; this.cool = Math.max(0, this.cool - dt);
    this.hist.push({ now, x: ball.x, z: ball.z, vx: ball.vx || 0, vz: ball.vz || 0 });
    while (this.hist.length > 2 && now - this.hist[0].now > 1.0) this.hist.shift();
    // delayed perception + prediction
    let h = this.hist[0]; for (const e of this.hist) { if (e.now <= now - c.reaction) h = e; else break; }
    const look = c.predict * 0.5;
    const px = h.x + h.vx * look, pz = h.z + h.vz * look;

    let tx = this.x, tz = this.z, vmax = c.speed, acc = c.accel;
    const dBall = Math.hypot(ball.x - this.x, ball.z - this.z);
    const exposed = feet ? Math.hypot(ball.x - feet.x, ball.z - feet.z) > 0.55 : false;

    if (this.state === 'ready' || this.state === 'jockey') {
      this.state = 'jockey';
      tx = px; tz = Math.min(this.minCamZ, pz + c.jockey);
      // Lunge decision
      if (this.cool <= 0 && dBall < c.reach && ball.seen !== false) {
        const pinned = this.z >= this.minCamZ - 0.05;
        const rate = c.lungeRate * (exposed ? 2.4 : 1) * (dBall < c.reach * 0.7 ? 1.5 : 1) * (pinned ? 2.5 : 1);
        if (Math.random() < rate * dt) {
          const lead = 0.12 + c.predict * 0.15;
          this.lunge = { x: ball.x + (ball.vx || 0) * lead, z: ball.z + (ball.vz || 0) * lead, t: 0, touchedBody: false };
          this.state = 'lunge'; ev.push({ type: 'lunge' });
        }
      }
    } else if (this.state === 'lunge') {
      const L = this.lunge; L.t += dt;
      // step toward the ball with the leading foot
      const dx = L.x - this.x, dz = L.z - this.z, dl = Math.hypot(dx, dz) || 1;
      tx = L.x - (dx / dl) * 0.45; tz = L.z - (dz / dl) * 0.45; vmax = c.speed * 1.7; acc = c.accel * 2.5;
      if (feet && Math.hypot(feet.x - this.x, feet.z - this.z) < 0.42) L.touchedBody = true;
      if (L.t >= 0.45) {
        const foot = { x: this.x + (dx / dl) * 0.55, z: this.z + (dz / dl) * 0.55 };
        const miss = Math.hypot(ball.x - foot.x, ball.z - foot.z);
        if (miss < c.winR && ball.seen !== false) { this.state = 'won'; this.t = 0; ev.push({ type: 'won' }); }
        // foul = he went through YOUR body and clearly missed the ball (you running into him isn't his foul)
        else if (L.touchedBody && miss > 0.55) { this.state = 'recover'; this.t = 0; this.cool = c.cooldown + 0.6; ev.push({ type: 'foul' }); }
        else { this.state = 'recover'; this.t = 0; this.cool = c.cooldown; ev.push({ type: 'miss' }); }
      }
    } else if (this.state === 'recover') {
      vmax = c.speed * 0.35; tx = this.x; tz = this.z;
      if (this.t > 0.8) this.state = 'jockey';
    } else if (this.state === 'beaten') {
      vmax = c.speed * 0.5; tx = this.x - Math.sign(ball.x - this.x) * 0.3; tz = this.z;
    } else if (this.state === 'won') {
      vmax = 0.6; tx = ball.x; tz = ball.z + 0.3; // stands over the ball
    }

    // Ball driven straight into his body → he blocks it and wins it.
    if ((this.state === 'jockey' || this.state === 'recover') && ball.seen !== false && Math.hypot(ball.x - this.x, ball.z - this.z) < c.blockR) {
      this.state = 'won'; this.t = 0; ev.push({ type: 'won', how: 'block' });
    }
    // You beat him: the ball is past his line toward the camera, outside his reach.
    if ((this.state === 'jockey' || this.state === 'recover') && ball.seen !== false && ball.z > this.z + 0.2 && Math.abs(ball.x - this.x) > c.beatDx) {
      this.state = 'beaten'; this.t = 0; ev.push({ type: 'beaten' });
    }

    // move (arrive steering), never through your body
    let dvx = tx - this.x, dvz = tz - this.z; const dl = Math.hypot(dvx, dvz);
    const want = Math.min(vmax, dl * 3);
    dvx = dl > 1e-3 ? (dvx / dl) * want : 0; dvz = dl > 1e-3 ? (dvz / dl) * want : 0;
    let ax = dvx - this.vx, az = dvz - this.vz; const al = Math.hypot(ax, az), am = acc * dt;
    if (al > am) { ax *= am / al; az *= am / al; }
    this.vx += ax; this.vz += az;
    this.x += this.vx * dt; this.z += this.vz * dt;
    if (feet && this.state !== 'lunge') {
      const sx = this.x - feet.x, sz = this.z - feet.z, sl = Math.hypot(sx, sz);
      if (sl < 0.5 && sl > 1e-3) { this.x = feet.x + (sx / sl) * 0.5; this.z = feet.z + (sz / sl) * 0.5; }
    }
    this.z = Math.min(this.minCamZ, this.z);
    // face the ball
    const want2 = Math.atan2(-(ball.x - this.x), -(ball.z - this.z));
    let da = want2 - this.facing; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    this.facing += da * Math.min(1, dt * 7);
    const out = this.events; this.events = []; return out;
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
}
