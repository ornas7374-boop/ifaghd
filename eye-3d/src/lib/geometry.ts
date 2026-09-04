import * as THREE from "three";
import type { PartId } from "@/data/eyeParts";

/**
 * Procedural anatomy of the human eye.
 *
 * Scale: 1 world unit = 10 mm, so the globe radius 1.2 = 12 mm — real
 * biometry. Every builder returns a BufferGeometry already oriented in the
 * FINAL scene space: the optical axis runs along +Z, the cornea faces the
 * camera at +Z, the optic nerve leaves toward -Z.
 *
 * Each part is its own geometry (and therefore its own mesh), which is what
 * makes per-part raycasting, hiding and highlighting possible without any
 * mesh-name lookups into an imported GLB.
 */

/** Globe radius — 12 mm. */
export const GLOBE_R = 1.2;
/** Corneal semi-diameter at the limbus — 5.85 mm. */
export const LIMBUS_R = 0.585;
/** Polar angle of the limbus, measured from the anterior pole. */
export const THETA_LIMBUS = Math.asin(LIMBUS_R / GLOBE_R);
/** z of the limbus ring. */
export const Z_LIMBUS = GLOBE_R * Math.cos(THETA_LIMBUS);
/** Corneal radius of curvature — 7.8 mm. */
export const CORNEA_R = 0.78;
const CORNEA_HALF_ANGLE = Math.asin(LIMBUS_R / CORNEA_R);
/** Centre of the corneal sphere on the optical axis. */
export const CORNEA_Z = Z_LIMBUS - CORNEA_R * Math.cos(CORNEA_HALF_ANGLE);

/** Lens biometry: 9.5 mm wide, 4 mm thick, sitting right behind the iris. */
const LENS_R = 0.475;
const LENS_Z = 0.755;
const LENS_ANTERIOR = 0.2;
const LENS_POSTERIOR = 0.2;

const IRIS_PUPIL_R = 0.19;
const IRIS_ROOT_R = 0.6;
const IRIS_Z_PUPIL = 0.975;
const IRIS_ROOT_Z = 0.9;

/**
 * Ciliary body: a meridional wedge whose base lies against the choroid and
 * whose apex points inward at the lens equator — the shape every textbook
 * cross-section shows. Its outer wall stays inside CILIARY_OUTER so it can
 * never poke through the sclera.
 */
const CILIARY_OUTER = 1.14;
/** Scleral spur, where the iris root inserts. */
const CILIARY_Z_SPUR = 0.9;
/** Ora serrata, where the ciliary body becomes retina + choroid. */
const CILIARY_Z_ORA = 0.56;
const CILIARY_APEX_R = 0.66;
const CILIARY_APEX_Z = 0.7;

export type Quality = "high" | "low";

const seg = (q: Quality, high: number, low: number) => (q === "high" ? high : low);

/** Rotate a Y-axis lathe/sphere into the scene's +Z optical axis. */
function toOpticalAxis(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Sclera — the opaque fibrous shell, open anteriorly where the cornea joins. */
export function buildSclera(q: Quality): THREE.BufferGeometry {
  return toOpticalAxis(
    new THREE.SphereGeometry(
      GLOBE_R,
      seg(q, 96, 48),
      seg(q, 64, 32),
      0,
      Math.PI * 2,
      THETA_LIMBUS,
      Math.PI - THETA_LIMBUS,
    ),
  );
}

/** Cornea — a steeper spherical cap that bulges ~1.1 mm past the sclera. */
export function buildCornea(q: Quality): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(
    CORNEA_R,
    seg(q, 96, 48),
    seg(q, 48, 24),
    0,
    Math.PI * 2,
    0,
    CORNEA_HALF_ANGLE,
  );
  g.translate(0, CORNEA_Z, 0);
  return toOpticalAxis(g);
}

/** Choroid — vascular tunic, from the optic nerve forward to the ora serrata. */
export function buildChoroid(q: Quality): THREE.BufferGeometry {
  return toOpticalAxis(
    new THREE.SphereGeometry(1.165, seg(q, 80, 40), seg(q, 56, 28), 0, Math.PI * 2, 0.78, Math.PI - 0.78),
  );
}

/** Retina — the innermost neural layer. */
export function buildRetina(q: Quality): THREE.BufferGeometry {
  return toOpticalAxis(
    new THREE.SphereGeometry(1.13, seg(q, 80, 40), seg(q, 56, 28), 0, Math.PI * 2, 0.88, Math.PI - 0.88),
  );
}

/**
 * Vitreous body — a lathe whose anterior face is the shallow hyaloid fossa
 * the lens rests in, and whose posterior face follows the retinal curve.
 */
export function buildVitreous(q: Quality): THREE.BufferGeometry {
  const R = 1.12;
  const oraY = 0.55;
  const oraR = Math.sqrt(R * R - oraY * oraY);
  const points: THREE.Vector2[] = [];

  // Anterior: shallow concave fossa from the axis out to the ora serrata.
  const anteriorSteps = 10;
  for (let i = 0; i <= anteriorSteps; i++) {
    const t = i / anteriorSteps;
    const r = t * oraR;
    points.push(new THREE.Vector2(r, 0.5 + 0.05 * t * t));
  }
  // Posterior: follow the retinal sphere back to the posterior pole.
  const theta0 = Math.atan2(oraR, oraY);
  const posteriorSteps = seg(q, 40, 20);
  for (let i = 1; i <= posteriorSteps; i++) {
    const theta = theta0 + (Math.PI - theta0) * (i / posteriorSteps);
    points.push(new THREE.Vector2(Math.max(R * Math.sin(theta), 0.0001), R * Math.cos(theta)));
  }

  return toOpticalAxis(new THREE.LatheGeometry(points, seg(q, 72, 36)));
}

/**
 * Iris — a slightly domed annulus from the pupil margin out to its root, then
 * a short skirt that tucks under the sclera. Without that skirt the perfect
 * sphere of the sclera leaves an annular cavity at the angle, and oblique rays
 * entering through the corneal opening reveal the uvea behind the iris.
 */
export function buildIris(q: Quality): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = IRIS_PUPIL_R + (IRIS_ROOT_R - IRIS_PUPIL_R) * t;
    const y = IRIS_ROOT_Z + (IRIS_Z_PUPIL - IRIS_ROOT_Z) * Math.pow(1 - t, 1.6);
    points.push(new THREE.Vector2(r, y));
  }
  points.push(new THREE.Vector2(0.68, 0.892));
  points.push(new THREE.Vector2(0.75, 0.881));
  points.push(new THREE.Vector2(0.81, 0.864));
  return toOpticalAxis(new THREE.LatheGeometry(points, seg(q, 128, 64)));
}

/** Pupil — the aperture itself, drawn as a dark disc just behind the iris. */
export function buildPupil(q: Quality): THREE.BufferGeometry {
  // CircleGeometry already faces +Z, so no reorientation is needed.
  const g = new THREE.CircleGeometry(IRIS_PUPIL_R + 0.004, seg(q, 96, 48));
  g.translate(0, 0, IRIS_Z_PUPIL - 0.006);
  return g;
}

/** Crystalline lens — biconvex ellipsoid of revolution. */
export function buildLens(q: Quality): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const half = seg(q, 28, 16);
  // Posterior pole -> equator.
  for (let i = 0; i <= half; i++) {
    const t = i / half;
    const r = LENS_R * Math.sin((t * Math.PI) / 2);
    points.push(new THREE.Vector2(r, LENS_Z - LENS_POSTERIOR * Math.cos((t * Math.PI) / 2)));
  }
  // Equator -> anterior pole.
  for (let i = 1; i <= half; i++) {
    const t = i / half;
    const r = LENS_R * Math.cos((t * Math.PI) / 2);
    points.push(new THREE.Vector2(Math.max(r, 0.0001), LENS_Z + LENS_ANTERIOR * Math.sin((t * Math.PI) / 2)));
  }
  return toOpticalAxis(new THREE.LatheGeometry(points, seg(q, 96, 48)));
}

/** Ciliary body — the muscular wedge encircling the lens. */
export function buildCiliaryBody(q: Quality): THREE.BufferGeometry {
  const thetaSpur = Math.acos(CILIARY_Z_SPUR / CILIARY_OUTER);
  const thetaOra = Math.acos(CILIARY_Z_ORA / CILIARY_OUTER);
  const points: THREE.Vector2[] = [];

  // Outer wall, following the inside of the choroid from spur to ora serrata.
  const steps = seg(q, 16, 8);
  for (let i = 0; i <= steps; i++) {
    const theta = thetaSpur + (thetaOra - thetaSpur) * (i / steps);
    points.push(
      new THREE.Vector2(CILIARY_OUTER * Math.sin(theta), CILIARY_OUTER * Math.cos(theta)),
    );
  }
  // Inner face: back up to the pars plicata apex, then to the iris root.
  points.push(new THREE.Vector2(CILIARY_APEX_R, CILIARY_APEX_Z));
  points.push(new THREE.Vector2(IRIS_ROOT_R + 0.02, IRIS_ROOT_Z - 0.04));
  // Close the profile so the wedge reads as a solid ring from any angle.
  points.push(
    new THREE.Vector2(CILIARY_OUTER * Math.sin(thetaSpur), CILIARY_OUTER * Math.cos(thetaSpur)),
  );

  return toOpticalAxis(new THREE.LatheGeometry(points, seg(q, 96, 48)));
}

/** Zonules of Zinn — decorative suspensory fibres, never interactive. */
export function buildZonules(): THREE.BufferGeometry {
  const count = 40;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    positions.set(
      [
        CILIARY_APEX_R * cos,
        CILIARY_APEX_R * sin,
        CILIARY_APEX_Z,
        LENS_R * cos,
        LENS_R * sin,
        LENS_Z,
      ],
      i * 6,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return g;
}

/** Optic nerve — leaves the posterior globe ~15° nasal to the posterior pole. */
export function buildOpticNerve(q: Quality): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.16, 0, -1.02),
    new THREE.Vector3(-0.26, 0.01, -1.32),
    new THREE.Vector3(-0.4, 0.03, -1.7),
    new THREE.Vector3(-0.58, 0.06, -2.02),
  ]);
  return new THREE.TubeGeometry(curve, seg(q, 64, 32), 0.19, seg(q, 24, 12), false);
}

export const GEOMETRY_BUILDERS: Record<PartId, (q: Quality) => THREE.BufferGeometry> = {
  sclera: buildSclera,
  cornea: buildCornea,
  choroid: buildChoroid,
  retina: buildRetina,
  vitreous: buildVitreous,
  iris: buildIris,
  pupil: buildPupil,
  lens: buildLens,
  ciliaryBody: buildCiliaryBody,
  opticNerve: buildOpticNerve,
};

/**
 * Where each part's floating label is pinned, in scene coordinates, plus the
 * outward direction the leader line points to keep labels off the geometry.
 */
export const LABEL_ANCHORS: Record<PartId, [number, number, number]> = {
  cornea: [0, 0.34, 1.24],
  iris: [0.4, 0.32, 0.93],
  pupil: [0, 0, IRIS_Z_PUPIL],
  lens: [0, -0.47, 0.75],
  retina: [0.62, 0.62, -0.78],
  opticNerve: [-0.34, 0.04, -1.45],
  sclera: [0.83, 0.55, 0.45],
  choroid: [-0.72, -0.7, -0.4],
  ciliaryBody: [0.44, -0.76, 0.74],
  vitreous: [0, 0.62, -0.2],
};

/** Painterly iris stripes generated at runtime — no texture file to ship. */
export function createIrisTexture(baseColor: string): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const base = new THREE.Color(baseColor);

  if (ctx) {
    // Radial gradient: dark collarette near the pupil, dark limbal ring outside.
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const dark = base.clone().multiplyScalar(0.35);
    const light = base.clone().multiplyScalar(1.45);
    grad.addColorStop(0, `#${dark.getHexString()}`);
    grad.addColorStop(0.28, `#${light.getHexString()}`);
    grad.addColorStop(0.72, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${dark.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Crypts and fibres running radially (constant u => a stripe in the mesh).
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * w;
      const y0 = Math.random() * h * 0.5;
      const y1 = y0 + h * (0.25 + Math.random() * 0.55);
      const bright = Math.random() > 0.5;
      const c = bright ? base.clone().multiplyScalar(1.9) : base.clone().multiplyScalar(0.45);
      ctx.strokeStyle = `#${c.getHexString()}`;
      ctx.globalAlpha = 0.06 + Math.random() * 0.22;
      ctx.lineWidth = 0.6 + Math.random() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
