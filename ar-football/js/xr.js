// WebXR immersive-ar: hit-test to find the real floor, anchors to keep the arena fixed in the
// room, light estimation for realistic lighting, DOM overlay for the HUD and touch controls.
import * as THREE from 'three';
import { XREstimatedLight } from 'three/addons/webxr/XREstimatedLight.js';

export async function checkXR() {
  if (!('xr' in navigator)) return { ok: false, reason: 'no-webxr' };
  if (!window.isSecureContext) return { ok: false, reason: 'insecure' };
  try {
    const ok = await navigator.xr.isSessionSupported('immersive-ar');
    return { ok, reason: ok ? null : 'no-ar' };
  } catch { return { ok: false, reason: 'error' }; }
}

export class XRSessionController {
  constructor(ar, overlayRoot) {
    this.ar = ar; this.overlayRoot = overlayRoot;
    this.session = null; this.hitSource = null; this.anchor = null; this.lastHit = null;
    this.placing = true;
    this.scale = 0.4; this.userYaw = 0; this.baseYaw = 0;
    this.features = {};
    this.onEnd = null; this.onPlaced = null;
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }

  async start() {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'anchors', 'light-estimation', 'local-floor'],
      domOverlay: { root: this.overlayRoot },
    });
    this.session = session;
    const r = this.ar.renderer;
    r.xr.setReferenceSpaceType('local');
    await r.xr.setSession(session);
    this.refSpace = r.xr.getReferenceSpace();
    const viewer = await session.requestReferenceSpace('viewer');
    this.hitSource = await session.requestHitTestSource({ space: viewer });
    this.features = {
      domOverlay: !!session.domOverlayState,
      anchors: typeof XRFrame !== 'undefined' && 'createAnchor' in (XRHitTestResult?.prototype || {}),
      light: false,
    };

    // Real-world light estimation (Chrome/ARCore): replaces our default lights while active.
    try {
      const xrLight = new XREstimatedLight(r);
      xrLight.addEventListener('estimationstart', () => {
        this.features.light = true;
        this.ar.scene.add(xrLight);
        this.ar.hemi.visible = false;
        if (xrLight.environment) this.ar.scene.environment = xrLight.environment;
        this.xrLight = xrLight;
      });
      xrLight.addEventListener('estimationend', () => {
        this.features.light = false;
        this.ar.scene.remove(xrLight); this.ar.hemi.visible = true; this.ar.scene.environment = null;
      });
    } catch (e) { console.warn('light estimation unavailable', e); }

    session.addEventListener('select', () => { if (this.placing) this.place(); });
    session.addEventListener('end', () => {
      this.hitSource?.cancel?.(); this.hitSource = null; this.anchor = null; this.session = null;
      this.ar.reticle.visible = false; this.ar.arena.visible = false;
      this.onEnd?.();
    });
    this.placing = true;
  }

  end() { this.session?.end(); }

  // Called every XR frame.
  update(frame) {
    if (!frame || !this.session) return;
    const ref = this.refSpace;
    // Hit-test from the centre of the view → reticle on the real floor/table.
    if (this.placing && this.hitSource) {
      const hits = frame.getHitTestResults(this.hitSource);
      if (hits.length) {
        const pose = hits[0].getPose(ref);
        this.lastHit = hits[0];
        const ret = this.ar.reticle;
        ret.visible = true;
        this._m.fromArray(pose.transform.matrix); this._m.decompose(this._p, this._q, this._s);
        // Keep the reticle flat and facing away from the user (attack direction).
        const yaw = this._yawAwayFromCamera(this._p);
        ret.matrix.compose(this._p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + this.userYaw), new THREE.Vector3(1, 1, 1));
        ret.userData.footprint.scale.setScalar(this.scale);
        ret.userData.hitPos = this._p.clone(); ret.userData.yaw = yaw;
      } else { this.ar.reticle.visible = false; this.lastHit = null; }
    } else this.ar.reticle.visible = false;

    // Anchored arena: re-read the anchor pose every frame (ARCore refines it as it learns the room).
    if (this.anchor && frame.trackedAnchors?.has(this.anchor)) {
      const pose = frame.getPose(this.anchor.anchorSpace, ref);
      if (pose) {
        this._m.fromArray(pose.transform.matrix); this._m.decompose(this._p, this._q, this._s);
        this.ar.setArenaTransform(this._p, this.baseYaw + this.userYaw, this.scale);
      }
    }
  }

  _yawAwayFromCamera(p) {
    const cam = this.ar.renderer.xr.getCamera();
    const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    // arena +z should point at the user → attacker runs away from you.
    return Math.atan2(cp.x - p.x, cp.z - p.z);
  }

  async place() {
    const ret = this.ar.reticle;
    if (!ret.visible || !ret.userData.hitPos) return false;
    const pos = ret.userData.hitPos.clone();
    this.baseYaw = ret.userData.yaw; this.userYaw = 0;
    this.ar.setArenaTransform(pos, this.baseYaw, this.scale);
    this.anchor?.delete?.(); this.anchor = null;
    if (this.lastHit?.createAnchor) {
      try { this.anchor = await this.lastHit.createAnchor(); this.features.anchors = true; } catch (e) { console.warn('anchor failed', e); }
    }
    this.placing = false;
    this.onPlaced?.();
    return true;
  }

  setScale(s) {
    this.scale = Math.max(0.08, Math.min(1.2, s));
    if (!this.placing && this.ar.arenaPos) this.ar.setArenaTransform(this.ar.arenaPos, this.baseYaw + this.userYaw, this.scale);
  }
  rotate(d) {
    this.userYaw += d;
    if (!this.placing && this.ar.arenaPos) this.ar.setArenaTransform(this.ar.arenaPos, this.baseYaw + this.userYaw, this.scale);
  }
  startReplace() { this.placing = true; }
}
