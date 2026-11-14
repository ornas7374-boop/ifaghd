// Phone orientation (gyro) → camera rotation, so virtual objects stay put in the room while you
// turn the phone. 3 degrees of freedom only: rotation is tracked, walking is NOT.
import * as THREE from 'three';

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // −90° about X: camera looks out of the back of the phone

export class PhoneOrientation {
  constructor() {
    this.alpha = null; this.beta = null; this.gamma = null;
    this.available = false;
    this.yaw0 = null;                         // heading at start → becomes "forward" (−z)
    this.q = new THREE.Quaternion();
  }

  // Call from a tap (iOS asks for permission).
  async start() {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return false;
    if (typeof DOE.requestPermission === 'function') {
      try { if ((await DOE.requestPermission()) !== 'granted') return false; } catch { return false; }
    }
    addEventListener('deviceorientation', (e) => {
      if (e.alpha == null) return;
      this.alpha = e.alpha; this.beta = e.beta; this.gamma = e.gamma; this.available = true;
    });
    return true;
  }

  screenAngle() { return THREE.MathUtils.degToRad(screen.orientation?.angle ?? window.orientation ?? 0); }

  // Writes the camera quaternion. Without a gyro: a fixed view looking slightly down.
  apply(camera, fallbackPitch = -0.35) {
    if (!this.available) { camera.quaternion.setFromEuler(new THREE.Euler(fallbackPitch, 0, 0, 'YXZ')); return false; }
    const a = THREE.MathUtils.degToRad(this.alpha), b = THREE.MathUtils.degToRad(this.beta), g = THREE.MathUtils.degToRad(this.gamma);
    euler.set(b, a, -g, 'YXZ');
    this.q.setFromEuler(euler);
    this.q.multiply(q1);
    this.q.multiply(q0.setFromAxisAngle(zee, -this.screenAngle()));
    // Re-zero the heading so that wherever you pointed the phone at the start is "forward".
    if (this.yaw0 === null) this.recenter();
    camera.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw0).multiply(this.q));
    return true;
  }

  recenter() {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.q);
    this.yaw0 = Math.atan2(-fwd.x, -fwd.z);
  }
}
