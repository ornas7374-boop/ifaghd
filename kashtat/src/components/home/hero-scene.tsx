"use client";

import { useEffect, useRef } from "react";

/*
 * مشهد WebGL للهيرو: كثبان رملية، خيام، ونار مخيم تحت سماء نجوم.
 * منقول من التصميم كما هو. لو WebGL غير متاح يبقى لون الخلفية فقط.
 */

type Vec3 = [number, number, number];

type Palette = {
  fog: Vec3;
  sun: Vec3;
  sunDir: Vec3;
  amb: Vec3;
  fireI: number;
  star: number;
  fogD: number;
};

const hex = (s: string): Vec3 => [
  parseInt(s.slice(1, 3), 16) / 255,
  parseInt(s.slice(3, 5), 16) / 255,
  parseInt(s.slice(5, 7), 16) / 255,
];

function palette(light: boolean): Palette {
  return light
    ? {
        fog: hex("#f5f1e8"),
        sun: [1.0, 0.95, 0.85],
        sunDir: [-0.4, 0.75, 0.35],
        amb: [0.55, 0.55, 0.55],
        fireI: 0.6,
        star: 0,
        fogD: 0.012,
      }
    : {
        fog: hex("#0b0e0c"),
        sun: [0.32, 0.4, 0.46],
        sunDir: [0.5, 0.55, -0.6],
        amb: [0.07, 0.09, 0.1],
        fireI: 9,
        star: 1,
        fogD: 0.016,
      };
}

const MESH_VS =
  "attribute vec3 p;attribute vec3 n;attribute vec3 c;attribute float e;uniform mat4 pv;varying vec3 vn;varying vec3 vc;varying float ve;varying vec3 vw;void main(){vn=n;vc=c;ve=e;vw=p;gl_Position=pv*vec4(p,1.0);}";
const MESH_FS =
  "precision mediump float;varying vec3 vn;varying vec3 vc;varying float ve;varying vec3 vw;uniform vec3 sunDir;uniform vec3 sunCol;uniform vec3 amb;uniform vec3 fireP;uniform vec3 fireC;uniform float fireI;uniform vec3 fogC;uniform vec3 eye;uniform float fogD;void main(){vec3 N=normalize(vn);float d=max(dot(N,normalize(sunDir)),0.0);vec3 L=fireP-vw;float dist=length(L);float f=max(dot(N,L/max(dist,0.001)),0.0)*fireI/(1.0+dist*dist*0.35);vec3 col=vc*(amb+sunCol*d+fireC*f);col=mix(col,vc*1.15,ve);float fd=length(vw-eye);float fog=1.0-exp(-pow(fd*fogD,2.0));col=mix(col,fogC,clamp(fog,0.0,1.0)*(1.0-ve*0.5));gl_FragColor=vec4(col,1.0);}";
const STAR_VS =
  "attribute vec3 p;attribute float s;uniform mat4 pv;uniform float t;uniform float dpr;varying float a;void main(){gl_Position=pv*vec4(p,1.0);gl_PointSize=s*dpr;a=s>8.0?1.0:0.55+0.45*sin(t*1.7+p.x*0.37+p.z*0.71);}";
const STAR_FS =
  "precision mediump float;varying float a;uniform vec3 sc;uniform float op;void main(){vec2 q=gl_PointCoord-0.5;float r=dot(q,q);if(r>0.25)discard;float soft=1.0-smoothstep(0.12,0.25,r);gl_FragColor=vec4(sc*a*op*soft,1.0);}";

// ارتفاع الأرض: كثبان شكّلتها الرياح، ومسطحة حول المخيم
function terrain(x: number, z: number) {
  const r = Math.sqrt(x * x + z * z);
  const ridge = 1 - Math.abs(Math.sin(x * 0.075 + z * 0.035));
  const h =
    3.2 * ridge * ridge + 1.3 * Math.sin(z * 0.11 + x * 0.04) + 0.5 * Math.sin(x * 0.27 - z * 0.19);
  const k = Math.min(Math.max((r - 7) / 12, 0), 1);
  const s = k * k * (3 - 2 * k);
  return h * s + 0.6 * (1 - s);
}

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function buildGeometry() {
  const P: number[] = [];
  const N: number[] = [];
  const C: number[] = [];
  const E: number[] = [];

  const tri = (a: Vec3, b: Vec3, d: Vec3, col: Vec3, em = 0) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    if (n[1] < 0 && !em) n = [-n[0], -n[1], -n[2]];
    for (const q of [a, b, d]) {
      P.push(q[0], q[1], q[2]);
      N.push(n[0], n[1], n[2]);
      C.push(col[0], col[1], col[2]);
      E.push(em);
    }
  };

  const sand = hex("#dcc99f");
  const sand2 = hex("#c9b083");
  const mix = (t: number): Vec3 => [
    sand[0] * (1 - t) + sand2[0] * t,
    sand[1] * (1 - t) + sand2[1] * t,
    sand[2] * (1 - t) + sand2[2] * t,
  ];
  const G = 76;
  const S = 2.2;
  const O = (-G * S) / 2;
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const x0 = O + i * S;
      const z0 = O + j * S;
      const x1 = x0 + S;
      const z1 = z0 + S;
      const a: Vec3 = [x0, terrain(x0, z0), z0];
      const b: Vec3 = [x1, terrain(x1, z0), z0];
      const c2: Vec3 = [x1, terrain(x1, z1), z1];
      const d: Vec3 = [x0, terrain(x0, z1), z1];
      tri(a, d, b, mix(hash(i, j)));
      tri(b, d, c2, mix(hash(j + 9, i + 3)));
    }
  }

  // خيام: أهرامات منخفضة حول النار
  const tent = (x: number, z: number, w: number, h: number, rot: number, col: Vec3) => {
    const y = terrain(x, z) - 0.05;
    const apex: Vec3 = [x, y + h, z];
    const pts = [0, 1, 2, 3].map((k): Vec3 => {
      const a = rot + (k * Math.PI) / 2 + Math.PI / 4;
      return [x + Math.cos(a) * w, y, z + Math.sin(a) * w];
    });
    for (let k = 0; k < 4; k++) {
      const shade = k === 0 ? 0.55 : 1;
      tri(pts[k], apex, pts[(k + 1) % 4], [col[0] * shade, col[1] * shade, col[2] * shade]);
    }
  };
  tent(-4.2, 1.6, 2.4, 3.2, 0.3, hex("#62c391"));
  tent(3.6, -2.8, 2.0, 2.7, -0.4, hex("#eef3ef"));
  tent(1.2, 4.8, 1.7, 2.3, 0.9, hex("#dcc99f"));

  // حلقة حجارة ونار
  const stone = hex("#69766e");
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const x = Math.cos(a) * 1.1;
    const z = Math.sin(a) * 1.1;
    const y = terrain(x, z);
    tri([x - 0.22, y, z], [x, y + 0.28, z + 0.05], [x + 0.22, y, z], stone);
    tri([x, y, z - 0.22], [x + 0.05, y + 0.28, z], [x, y, z + 0.22], stone);
  }
  const fy = terrain(0, 0);
  const flame = (h: number, w: number, col: Vec3, rot: number) => {
    const apex: Vec3 = [0, fy + h, 0];
    for (let k = 0; k < 3; k++) {
      const a1 = rot + k * 2.094;
      const a2 = rot + (k + 1) * 2.094;
      tri(
        [Math.cos(a1) * w, fy, Math.sin(a1) * w],
        apex,
        [Math.cos(a2) * w, fy, Math.sin(a2) * w],
        col,
        1,
      );
    }
  };
  flame(1.5, 0.55, hex("#e8b84f"), 0);
  flame(1.0, 0.45, hex("#ff8a6a"), 1.0);
  flame(0.7, 0.3, hex("#fff1c9"), 2.0);

  // نجوم على قبة + قمر
  const SP: number[] = [];
  const SS: number[] = [];
  for (let i = 0; i < 900; i++) {
    const th = hash(i, 1.3) * Math.PI * 2;
    const ph = 0.08 + hash(2.7, i) * 1.25;
    const R = 150;
    SP.push(Math.cos(th) * Math.cos(ph) * R, Math.sin(ph) * R, Math.sin(th) * Math.cos(ph) * R);
    SS.push(1 + hash(i, 7) * 2.2);
  }
  SP.push(60, 70, -110);
  SS.push(46);

  return { P, N, C, E, SP, SS, fireP: [0, fy + 0.9, 0] as Vec3 };
}

function viewProjection(eye: Vec3, tgt: Vec3, aspect: number) {
  const f = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]];
  let l = Math.hypot(f[0], f[1], f[2]);
  f[0] /= l;
  f[1] /= l;
  f[2] /= l;
  let s = [-f[2], 0, f[0]];
  l = Math.hypot(s[0], s[1], s[2]);
  s = [s[0] / l, s[1] / l, s[2] / l];
  const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
  const V = [
    s[0],
    u[0],
    -f[0],
    0,
    s[1],
    u[1],
    -f[1],
    0,
    s[2],
    u[2],
    -f[2],
    0,
    -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]),
    -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
    f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2],
    1,
  ];
  const fov = aspect < 1 ? 0.95 : 0.7;
  const n = 0.1;
  const fr = 400;
  const t = 1 / Math.tan(fov / 2);
  const Pm = [
    t / aspect,
    0,
    0,
    0,
    0,
    t,
    0,
    0,
    0,
    0,
    (fr + n) / (n - fr),
    -1,
    0,
    0,
    (2 * fr * n) / (n - fr),
    0,
  ];
  const o = new Array<number>(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += Pm[k * 4 + j] * V[i * 4 + k];
      o[i * 4 + j] = sum;
    }
  }
  return { m: o, right: s };
}

export function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: true, alpha: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const program = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      return p;
    };
    const pMesh = program(MESH_VS, MESH_FS);
    const pStar = program(STAR_VS, STAR_FS);

    const geo = buildGeometry();
    const buf = (arr: number[]) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      return b;
    };
    const mesh = {
      p: buf(geo.P),
      n: buf(geo.N),
      c: buf(geo.C),
      e: buf(geo.E),
      count: geo.P.length / 3,
    };
    const stars = { p: buf(geo.SP), s: buf(geo.SS), count: geo.SS.length };

    const root = document.documentElement;
    let pal = palette(root.dataset.theme === "light");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    let dead = false;
    const t0 = performance.now();

    // تتبع المؤشر لميلان الكاميرا الخفيف
    let mx = 0;
    let my = 0;
    let tmx = 0;
    let tmy = 0;
    const host = canvas.parentElement;
    const onMove = (e: PointerEvent) => {
      const r = host!.getBoundingClientRect();
      tmx = ((e.clientX - r.left) / r.width) * 2 - 1;
      tmy = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    host?.addEventListener("pointermove", onMove);

    const attr = (p: WebGLProgram, name: string, b: WebGLBuffer, size: number) => {
      const loc = gl.getAttribLocation(p, name);
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      const t = (performance.now() - t0) / 1000;
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;
      const aspect = w / h;
      const ang = (reduce ? 0.6 : t * 0.035 + 0.6) + mx * 0.25;
      const R = aspect < 1 ? 30 : 24;
      const ex = Math.cos(ang) * R;
      const ez = Math.sin(ang) * R;
      const ey = Math.max(terrain(ex, ez) + 4.5, 6.5) - my * 1.5;
      const eye: Vec3 = [ex, ey, ez];
      const base: Vec3 = [0, 1.6, 0];
      const pre = viewProjection(eye, base, aspect);
      const off = aspect > 1.2 ? 7.5 : 0;
      const tgt: Vec3 = [base[0] + pre.right[0] * off, base[1] + 2.2, base[2] + pre.right[2] * off];
      const M = viewProjection(eye, tgt, aspect).m;

      gl.clearColor(pal.fog[0], pal.fog[1], pal.fog[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      if (pal.star > 0) {
        gl.useProgram(pStar);
        gl.depthMask(false);
        attr(pStar, "p", stars.p, 3);
        attr(pStar, "s", stars.s, 1);
        gl.uniformMatrix4fv(U(pStar, "pv"), false, M);
        gl.uniform1f(U(pStar, "t"), t);
        gl.uniform1f(U(pStar, "dpr"), dpr);
        gl.uniform3f(U(pStar, "sc"), 0.93, 0.9, 0.8);
        gl.uniform1f(U(pStar, "op"), pal.star);
        gl.drawArrays(gl.POINTS, 0, stars.count);
        gl.depthMask(true);
        gl.disableVertexAttribArray(gl.getAttribLocation(pStar, "s"));
      }

      gl.useProgram(pMesh);
      attr(pMesh, "p", mesh.p, 3);
      attr(pMesh, "n", mesh.n, 3);
      attr(pMesh, "c", mesh.c, 3);
      attr(pMesh, "e", mesh.e, 1);
      const flick = reduce ? 1 : 0.85 + 0.1 * Math.sin(t * 9.0) + 0.05 * Math.sin(t * 23.0);
      gl.uniformMatrix4fv(U(pMesh, "pv"), false, M);
      gl.uniform3fv(U(pMesh, "sunDir"), pal.sunDir);
      gl.uniform3fv(U(pMesh, "sunCol"), pal.sun);
      gl.uniform3fv(U(pMesh, "amb"), pal.amb);
      gl.uniform3fv(U(pMesh, "fireP"), geo.fireP);
      gl.uniform3f(U(pMesh, "fireC"), 1.0, 0.62, 0.3);
      gl.uniform1f(U(pMesh, "fireI"), pal.fireI * flick);
      gl.uniform3fv(U(pMesh, "fogC"), pal.fog);
      gl.uniform3f(U(pMesh, "eye"), ex, ey, ez);
      gl.uniform1f(U(pMesh, "fogD"), pal.fogD);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    };

    const loop = () => {
      cancelAnimationFrame(raf);
      const frame = () => {
        if (dead) return;
        draw();
        if (!reduce && visible) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    // يتوقف الرسم لما يطلع المشهد من الشاشة
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) loop();
    });
    io.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      pal = palette(root.dataset.theme === "light");
      loop();
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    // مع تقليل الحركة: إطار واحد، ويُعاد عند تغيير الحجم
    const ro = new ResizeObserver(() => {
      if (reduce) loop();
    });
    ro.observe(canvas);

    loop();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      host?.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />;
}
