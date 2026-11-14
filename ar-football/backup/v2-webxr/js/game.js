// Match simulation: attacker movement, ball physics, possession, tackles, fouls, goals, stats.
import * as THREE from 'three';
import { PITCH, ATTACKER, DIFFICULTY } from './config.js';
import { makePlayer, animatePlayer, playKick, makeBall } from './models.js';
import { DefenseAI, Defender, Goalkeeper } from './ai.js';

// Offsets from the kick-off point (arena metres).
const FORMATIONS = {
  1: [[0, -3]],
  2: [[-0.8, -2.6], [1, -5]],
  3: [[0, -2.3], [-1.5, -4.3], [1.5, -6]],
  4: [[-0.8, -2.1], [1.3, -3.6], [-1.5, -5.1], [0.8, -6.6]],
  5: [[0, -1.9], [-1.8, -3.1], [1.8, -4.3], [-1, -5.6], [1, -6.8]],
};
const BALL_R = 0.11;
const len = Math.hypot;

export class Game {
  // root: THREE.Group of the arena (anchored in the real world by the AR layer).
  constructor(root, sfx, ui) {
    this.root = root; this.sfx = sfx; this.ui = ui;
    const scene = root;
    this.attMesh = makePlayer({ shirt: 0x1d5fd6, shorts: 0xffffff, socks: 0x1d5fd6, skin: 0xc68c5f, number: '10' });
    scene.add(this.attMesh);
    this.ballMesh = makeBall(); scene.add(this.ballMesh);
    this.gkMesh = makePlayer({ shirt: 0xf2c200, shorts: 0x222222, socks: 0xf2c200, skin: 0xa8734f, boots: 0x333333, number: '1', numberColor: '#222' });
    scene.add(this.gkMesh);

    const ring = (color, r) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.02; scene.add(m); return m;
    };
    this.attRing = ring(0x5fb4ff, 0.45);
    this.ballRing = ring(0xffe066, 0.22);
    this.defMeshes = []; this.defRings = [];
    this.ai = new DefenseAI();
    this.gk = new Goalkeeper(this.gkMesh);
    this._v = new THREE.Vector3(); this._q = new THREE.Quaternion();
    this.state = 'idle';
  }

  // ---------- setup ----------
  newMatch(settings) {
    this.settings = settings;
    this.cfg = DIFFICULTY[settings.difficulty];
    const n = settings.defenders;
    // (re)build defender meshes
    for (const m of this.defMeshes) this.root.remove(m);
    for (const r of this.defRings) this.root.remove(r);
    this.defMeshes = []; this.defRings = [];
    const skins = [0x8d5a3b, 0xe0b48a, 0x6b4128, 0xc99a70, 0x4f2f1d];
    this.defenders = [];
    for (let i = 0; i < n; i++) {
      const m = makePlayer({ shirt: 0xc8102e, shorts: 0x111111, socks: 0xc8102e, skin: skins[i], number: String([4, 5, 3, 2, 6][i]) });
      this.root.add(m); this.defMeshes.push(m);
      const r = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.45, 28), new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.6, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = 0.02; this.root.add(r); this.defRings.push(r);
      this.defenders.push(new Defender(i, m));
    }
    this.ai.setup(this.defenders, this.cfg, settings.speedMul);
    this.gkMesh.visible = settings.goalkeeper;
    this.stats = { goals: 0, dribbles: 0, losses: 0, fouls: 0, feints: 0, touches: 0, shots: 0, saves: 0, poss: 0, playT: 0 };
    this.timeLeft = settings.roundSec;
    this.t = 0;
    this.startAttack();
  }

  startAttack(freeKick = null) {
    const a = (this.att ||= {});
    a.x = freeKick ? freeKick.x : 0; a.z = freeKick ? freeKick.z : PITCH.startZ;
    a.vx = 0; a.vz = 0; a.hx = 0; a.hz = -1;
    const b = (this.ball ||= {});
    b.x = a.x; b.z = a.z - 0.5; b.y = BALL_R; b.vx = 0; b.vz = 0; b.vy = 0;
    this.owner = 'A';
    this.lastTouch = this.t;
    this.shotLive = false;
    const form = FORMATIONS[this.defenders.length];
    this.defenders.forEach((d, i) => {
      if (freeKick) {
        // Free kick: keep shape but nobody within 7 m of the ball.
        const dx = d.x - a.x, dz = d.z - a.z, dl = len(dx, dz) || 1;
        if (dl < 2.5) { d.x = a.x + (dx / dl) * 2.5; d.z = Math.max(PITCH.goalZ + 0.5, Math.min(a.z - 1.5, a.z + (dz / dl) * 2.5)); }
      } else {
        const [fx, fz] = form[i];
        d.x = fx + (Math.random() - 0.5) * 0.8; d.z = PITCH.startZ + fz;
        d.beaten = false; d.engaged = false;
      }
      d.homeX = form[i][0]; d.homeZ = PITCH.startZ + form[i][1];
      d.vx = 0; d.vz = 0; d.state = 'MOVE'; d.timer = 0; d.cooldown = 0.8;
    });
    if (!freeKick) this.attackStartZ = a.z;
    this.gk.reset();
    this.state = 'countdown'; this.stateT = freeKick ? 0.9 : 1.6;
    this.ui.flash(freeKick ? 'ضربة حرة' : 'انطلق!', 'info', this.stateT);
  }

  // ---------- main update ----------
  update(dt, intent) {
    if (this.state === 'idle' || this.state === 'over') return;
    this.t += dt;
    const a = this.att, b = this.ball;

    if (this.state === 'countdown') {
      this.stateT -= dt;
      intent = { steer: 0, run: 0, depth: 0, events: [] };
      if (this.stateT <= 0) { this.state = 'play'; this.sfx.whistle(); }
    } else {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.endMatch(); return; }
    }
    if (this.state === 'dead') {
      this.stateT -= dt;
      intent = { steer: 0, run: 0, depth: 0, events: [] };
      if (this.stateT <= 0) { const fk = this.pendingFreeKick; this.pendingFreeKick = null; this.startAttack(fk); }
    }
    const playing = this.state === 'play';
    // Possession clock: live play, plus the dead time after a defender won the ball.
    if (playing || (this.state === 'dead' && typeof this.owner === 'number')) { this.stats.playT += dt; if (this.owner === 'A') this.stats.poss += dt; }

    this._moveAttacker(dt, intent);
    if (playing) for (const e of intent.events) this._handleEvent(e);
    this._moveBall(dt);

    // AI
    this.ai.record(this.t, a, b);
    if (this.state !== 'countdown') {
      const aiEvents = [];
      this.ai.update(dt, this.t, a, b, this.owner, aiEvents);
      for (const e of aiEvents) if (e.type === 'tackleStart' && playing) this.ui.flashSmall('⚠ تدخّل!', 'warn');
      if (this.settings.goalkeeper) this.gk.update(dt, b, this.cfg);
    }
    if (playing) this._rules(dt);
    this._sync(dt);
  }

  _moveAttacker(dt, it) {
    const a = this.att, hasBall = this.owner === 'A';
    const top = hasBall ? ATTACKER.dribbleSpeed : ATTACKER.maxSpeed;
    let vzT = -it.run * top * (1 + 0.2 * Math.max(0, it.depth));
    if (it.depth < -0.4) vzT = ATTACKER.backSpeed * -it.depth; // step back → retreat / drag back
    const vxT = it.steer * ATTACKER.lateralSpeed;
    let ax = vxT - a.vx, az = vzT - a.vz; const al = len(ax, az), am = ATTACKER.accel * dt;
    if (al > am) { ax *= am / al; az *= am / al; }
    a.vx += ax; a.vz += az;
    a.x += a.vx * dt; a.z += a.vz * dt;
    a.x = Math.max(-PITCH.halfWidth + 0.3, Math.min(PITCH.halfWidth - 0.3, a.x));
    a.z = Math.max(PITCH.goalZ + 0.4, Math.min(PITCH.backZ, a.z));
    const sp = len(a.vx, a.vz);
    if (sp > 0.6) { a.hx += (a.vx / sp - a.hx) * Math.min(1, dt * 8); a.hz += (a.vz / sp - a.hz) * Math.min(1, dt * 8); }
    else { a.hx += (0 - a.hx) * dt * 2; a.hz += (-1 - a.hz) * dt * 2; }
    const hl = len(a.hx, a.hz) || 1; a.hx /= hl; a.hz /= hl;
    a.steer = it.steer;
    // body-vs-body: defenders can't overlap the attacker
    for (const d of this.defenders) {
      const dx = a.x - d.x, dz = a.z - d.z, dl = len(dx, dz), min = 0.58;
      if (dl < min && dl > 1e-4) { const p = (min - dl) / 2; a.x += (dx / dl) * p; a.z += (dz / dl) * p; d.x -= (dx / dl) * p; d.z -= (dz / dl) * p; }
    }
  }

  _handleEvent(e) {
    const a = this.att, b = this.ball;
    const dBall = len(b.x - a.x, b.z - a.z);
    if (e.type === 'touch') {
      if (dBall < ATTACKER.controlRadius && b.y < 0.5) {
        if (this.owner !== 'A' && typeof this.owner !== 'number') this.owner = 'A';
        if (this.owner === 'A') {
          const tx = a.x + a.hx * 0.45, tz = a.z + a.hz * 0.45;
          b.vx = a.vx * 1.05 + (tx - b.x) * 2.6 + a.hx * 0.3;
          b.vz = a.vz * 1.05 + (tz - b.z) * 2.6 + a.hz * 0.3;
          this.lastTouch = this.t; this.stats.touches++;
          if (this.t - (this._lastTouchSfx || 0) > 0.12) { this.sfx.touch(); this._lastTouchSfx = this.t; }
        }
      }
    } else if (e.type === 'kick') {
      if (dBall < ATTACKER.controlRadius + 0.3 && b.y < 0.6 && (this.owner === 'A' || this.owner === null)) {
        const p = e.power ?? 0.8;
        playKick(this.attMesh, e.foot === 'L' ? -1 : 1);
        this.sfx.kick();
        if (a.z < PITCH.goalZ + PITCH.shootRange) {
          // Shot: aim follows your lean/side-step at the moment of the kick.
          // Aim: your lean/side-step at the moment of the kick; standing straight = far side from the keeper.
          const st = a.steer || 0;
          const G = PITCH.goalHalfWidth;
          const side = Math.abs(st) > 0.2 ? st * G * 0.85 : -(Math.sign(this.gk.x) || (Math.random() < 0.5 ? -1 : 1)) * G * 0.75;
          const aimX = Math.max(-G * 0.95, Math.min(G * 0.95, side + (Math.random() - 0.5) * (1.8 - p) * G * 0.5));
          const dx = aimX - b.x, dz = PITCH.goalZ - 0.3 - b.z, dl = len(dx, dz);
          const sp = 6 + 4 * p;
          b.vx = (dx / dl) * sp; b.vz = (dz / dl) * sp; b.vy = 0.6 + p * 1.2 + dl * 0.05;
          this.owner = null; this.shotLive = true; this.stats.shots++;
          this.ui.flashSmall('تسديدة!', 'info');
        } else {
          // Knock-on: push the ball into space and chase it.
          const sp = 3.2 + 2 * p;
          b.vx = a.hx * sp + a.vx * 0.3; b.vz = a.hz * sp + a.vz * 0.3; b.vy = 0.5;
          this.owner = null; this.lastTouch = this.t;
        }
      }
    } else if (e.type === 'feint') {
      a.vx += e.dir * 1.2;
      this.stats.feints++;
      const fooled = this.ai.onFeint(a, e.dir);
      if (fooled.length) { this.sfx.whoosh(); this.ui.flashSmall(fooled.length > 1 ? `تمويه! خدعت ${fooled.length} مدافعين` : 'تمويه! المدافع انخدع', 'good'); }
      else this.ui.flashSmall('تمويه', 'info');
    }
  }

  _moveBall(dt) {
    const a = this.att, b = this.ball;
    if (this.owner === 'A') {
      // Close-control assist; stronger right after a touch, weak if you stop touching.
      const fresh = Math.exp(-(this.t - this.lastTouch) / 0.8);
      const assist = 0.3 + 0.7 * fresh;
      const tx = a.x + a.hx * 0.45, tz = a.z + a.hz * 0.45;
      b.vx += ((tx - b.x) * 6 + (a.vx - b.vx) * 3.5) * dt * assist;
      b.vz += ((tz - b.z) * 6 + (a.vz - b.vz) * 3.5) * dt * assist;
      if (len(b.x - a.x, b.z - a.z) > ATTACKER.looseRadius) { this.owner = null; this.ui.flashSmall('الكرة ابتعدت عنك', 'warn'); }
    } else if (typeof this.owner === 'number') {
      const d = this.defenders[this.owner];
      const fx = -Math.sin(d.facing), fz = -Math.cos(d.facing);
      b.vx += ((d.x + fx * 0.4 - b.x) * 10 + (d.vx - b.vx) * 5) * dt;
      b.vz += ((d.z + fz * 0.4 - b.z) * 10 + (d.vz - b.vz) * 5) * dt;
    }
    // vertical
    if (b.y > BALL_R + 0.001 || b.vy > 0) {
      b.vy -= 9.81 * dt; b.y += b.vy * dt;
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy) > 0.8 ? -b.vy * 0.5 : 0; }
    }
    const onGround = b.y <= BALL_R + 0.01;
    const fr = Math.exp(-dt * (onGround ? 1.1 : 0.08));
    b.vx *= fr; b.vz *= fr;
    b.x += b.vx * dt; b.z += b.vz * dt;
  }

  _rules(dt) {
    const a = this.att, b = this.ball, cfg = this.cfg;
    const fresh = Math.exp(-(this.t - this.lastTouch) / 0.8);

    // Loose ball: attacker regains by reaching it
    if (this.owner === null && len(b.x - a.x, b.z - a.z) < 0.6 && b.y < 0.5 && !this.shotLive) { this.owner = 'A'; this.lastTouch = this.t; }

    for (const d of this.defenders) {
      const dBall = len(b.x - d.x, b.z - d.z), dBody = len(a.x - d.x, a.z - d.z);
      if (dBody < 1.8) d.engaged = true;

      // Dribble success: you got goal-side of an engaged defender while keeping the ball.
      if (!d.beaten && this.owner === 'A' && d.engaged && a.z < d.z - 0.6) {
        d.beaten = true; this.stats.dribbles++;
        this.sfx.whoosh(); this.sfx.cheer(false);
        this.ui.flash('مراوغة ناجحة ✓', 'good', 0.9);
      }

      if (d.state === 'TACKLE' && !d.touchedBall) {
        const relV = len(d.vx - a.vx, d.vz - a.vz);
        if (dBall < 0.55 && b.y < 0.5) {
          d.touchedBall = true;
          // Is your body between the defender and the ball? (shielding)
          const ax = a.x - d.x, az = a.z - d.z, bx = b.x - d.x, bz = b.z - d.z;
          const cos = (ax * bx + az * bz) / ((len(ax, az) * len(bx, bz)) || 1);
          const shielded = cos > 0.85 && len(ax, az) < len(bx, bz);
          const exposed = len(b.x - a.x, b.z - a.z) > 0.6;
          let p = cfg.tackleSuccess * (0.55 + 0.45 * (1 - fresh)) * (exposed ? 1.25 : 1) * (shielded ? 0.45 : 1);
          if (this.owner !== 'A') p = 0.95;
          if (Math.random() < p) { this._lose(d); return; }
          // Survived: ball pokes a little, defender is off balance.
          b.vx += (Math.random() - 0.5) * 1; b.vz += (Math.random() - 0.5) * 1;
          d.state = 'RECOVER'; d.timer = 0.9;
          this.ui.flashSmall('نجوت من التدخل!', 'good'); this.sfx.whoosh();
        } else if (dBody < 0.62 && relV > 1.2 && this.owner === 'A') {
          // Contact with your body before the ball = foul.
          this._foul(d); return;
        }
      } else if (this.owner === null && !this.shotLive && dBall < 0.5 && b.y < 0.5) {
        this._lose(d, true); return;
      } else if (this.owner === null && this.shotLive && dBall < 0.42 && b.y < 0.9) {
        // blocked shot
        this.shotLive = false; b.vx *= -0.3; b.vz *= -0.3; this.ui.flashSmall('تسديدة مصدودة', 'warn');
      }
    }

    // Goalkeeper save / claim
    if (this.settings.goalkeeper) {
      const g = this.gk, dg = len(b.x - g.x, b.z - g.z);
      const reach = g.dive > 0 ? 0.42 : 0.3;
      if (dg < reach && b.y < 1.0 && (this.shotLive || this.owner === null)) {
        if (this.shotLive) { this.stats.saves++; this._dead('تصدّى الحارس!', 'warn', 1.8); this.sfx.groan(); b.vz = 2.5; b.vx = (Math.random() - 0.5) * 3; b.vy = 1; }
        else { this.stats.losses++; this._dead('الحارس أمسك الكرة', 'bad', 1.6); this.sfx.groan(); b.vx = 0; b.vz = 0; }
        this.shotLive = false; return;
      }
    }

    // Goal / out
    if (b.z < PITCH.goalZ) {
      if (Math.abs(b.x) < PITCH.goalHalfWidth - BALL_R && b.y < PITCH.goalHeight) {
        this.stats.goals++; b.vz *= 0.15; b.vx *= 0.3;
        this.sfx.whistle(true); this.sfx.cheer(true);
        this._dead('هدف!!', 'goal', 2.6); return;
      }
      this._dead(this.shotLive ? 'تسديدة خارج المرمى' : 'خارج الملعب', 'warn', 1.5); return;
    }
    if (Math.abs(b.x) > PITCH.halfWidth + 0.4 || b.z > PITCH.backZ + 1) { this._dead('خارج الملعب', 'warn', 1.5); return; }
    if (this.shotLive && len(b.vx, b.vz) < 1) this.shotLive = false;
  }

  _lose(d, loose = false) {
    this.owner = d.i; this.stats.losses++;
    this.sfx.tackle(); this.sfx.groan();
    this._dead(loose ? 'المدافع قطع الكرة!' : 'فقدت الكرة!', 'bad', 1.8);
  }

  _foul(d) {
    this.stats.fouls++;
    d.state = 'RECOVER'; d.timer = 1.5; d.vx *= 0.2; d.vz *= 0.2;
    this.sfx.whistle(); this.sfx.tackle();
    this.pendingFreeKick = { x: this.att.x, z: this.att.z };
    this._dead('خطأ على المدافع! 🟨', 'warn', 1.6);
  }

  _dead(msg, kind, time) {
    this.state = 'dead'; this.stateT = time;
    this.ui.flash(msg, kind, time);
  }

  endMatch() {
    this.state = 'over';
    this.sfx.whistle(true);
    this.ui.onMatchOver(this.summary());
  }

  summary() {
    const s = this.stats;
    const possession = s.playT > 0 ? Math.round((s.poss / s.playT) * 100) : 0;
    const score = Math.max(0, s.goals * 100 + s.dribbles * 30 + s.fouls * 15 + s.feints * 2 - s.losses * 20);
    return { ...s, possession, score };
  }

  // ---------- render sync ----------
  _sync(dt) {
    const a = this.att, b = this.ball;
    const am = this.attMesh;
    am.position.set(a.x, 0, a.z);
    am.rotation.y = Math.atan2(-a.hx, -a.hz);
    animatePlayer(am, len(a.vx, a.vz), dt, { tilt: -(a.steer || 0) });
    this.attRing.position.set(a.x, 0.02, a.z);

    this.ballMesh.position.set(b.x, b.y, b.z);
    const sp = len(b.vx, b.vz);
    if (sp > 0.05) {
      this._v.set(b.vz, 0, -b.vx).normalize();
      this._q.setFromAxisAngle(this._v, (sp * dt) / BALL_R);
      this.ballMesh.quaternion.premultiply(this._q);
    }
    this.ballRing.position.set(b.x, 0.02, b.z);
    this.ballRing.visible = this.owner === 'A';
    this.ballRing.material.color.setHex(Math.exp(-(this.t - this.lastTouch) / 0.8) > 0.35 ? 0x7dff9a : 0xffe066);

    this.defenders.forEach((d, i) => {
      const m = this.defMeshes[i];
      m.position.set(d.x, 0, d.z);
      m.rotation.y = d.facing;
      animatePlayer(m, d.speed, dt, { lean: d.state === 'TACKLE' ? 0.45 : undefined, tilt: d.state === 'FOOLED' ? Math.sign(d.vx) : 0 });
      const r = this.defRings[i];
      r.position.set(d.x, 0.02, d.z);
      r.material.color.setHex(d.state === 'TACKLE' ? 0xff2222 : d.state === 'FOOLED' ? 0xffd23f : d.beaten ? 0x888888 : 0xff7b7b);
    });
    if (this.settings.goalkeeper) {
      this.gkMesh.position.set(this.gk.x, 0, this.gk.z);
      this.gkMesh.rotation.y = Math.atan2(-(b.x - this.gk.x), -(b.z - this.gk.z));
      animatePlayer(this.gkMesh, Math.abs(this.gk.vx), dt, { tilt: this.gk.dive > 0 ? Math.sign(this.gk.vx) * 3 : 0 });
    }
  }
}
