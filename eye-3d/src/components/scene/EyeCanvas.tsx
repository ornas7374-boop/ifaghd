"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PartId } from "@/data/eyeParts";
import type { Quality } from "@/lib/geometry";
import { useMediaQuery } from "@/lib/useMediaQuery";
import EyeModel from "./EyeModel";
import PartLabels from "./PartLabels";

const CAMERA_FOV = 30;
/** Fixed three-quarter viewing direction; the distance is derived per viewport. */
const HOME_DIR = new THREE.Vector3(-3.25, 1.45, 5.55).normalize();
const HOME_TARGET = new THREE.Vector3(-0.15, 0, -0.12);
/**
 * Half-extents to keep inside the frame. The globe (radius 1.2) sits slightly
 * off the orbit target, so the horizontal figure carries that offset plus a
 * margin — otherwise narrow viewports clip the cornea.
 */
const FIT_HALF_HEIGHT = 1.7;
const FIT_HALF_WIDTH = 1.5;

/**
 * A vertical FOV alone crops the model on tall, narrow viewports, so the
 * distance is whichever of the two fits is more demanding.
 */
function fitDistance(aspect: number): number {
  const t = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const safeAspect = aspect > 0.05 ? aspect : 1;
  return Math.max(FIT_HALF_HEIGHT / t, FIT_HALF_WIDTH / (t * safeAspect));
}

function homePosition(aspect: number): THREE.Vector3 {
  return HOME_DIR.clone().multiplyScalar(fitDistance(aspect)).add(HOME_TARGET);
}

interface Props {
  hiddenParts: Set<PartId>;
  hoveredPart: PartId | null;
  selectedPart: PartId | null;
  crossSection: boolean;
  showLabels: boolean;
  showEnglish: boolean;
  resetSignal: number;
  onHover: (id: PartId | null) => void;
  /** Fired by the model with the full front-to-back stack under the cursor. */
  onPickStack: (stack: PartId[], screenX: number, screenY: number) => void;
  /** Fired by the floating labels, which name one part directly. */
  onSelectPart: (id: PartId) => void;
  onBackgroundClick: () => void;
}

/** Smoothly flies the camera home whenever `resetSignal` changes. */
/** Minimal surface of OrbitControls that the rig actually touches. */
type ControlsLike = {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function CameraRig({ resetSignal }: { resetSignal: number }) {
  const controls = useThree((state) => state.controls) as unknown as ControlsLike | null;
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const aspect = size.height > 0 ? size.width / size.height : 1;
  const flying = useRef(false);

  useEffect(() => {
    if (resetSignal > 0) flying.current = true;
  }, [resetSignal]);

  // Re-frame on mount and whenever the viewport shape changes (rotation,
  // resize, the mobile sheet opening) while keeping the user's own angle.
  useEffect(() => {
    const target = controls?.target ?? HOME_TARGET;
    const direction = camera.position.clone().sub(target);
    if (direction.lengthSq() < 1e-6) direction.copy(HOME_DIR);
    camera.position.copy(target).addScaledVector(direction.normalize(), fitDistance(aspect));
    controls?.update();
  }, [aspect, camera, controls]);

  useFrame((_, delta) => {
    if (!flying.current || !controls) return;
    const home = homePosition(aspect);
    const k = 1 - Math.exp(-6 * Math.min(delta, 0.1));
    camera.position.lerp(home, k);
    controls.target.lerp(HOME_TARGET, k);
    controls.update();
    if (camera.position.distanceTo(home) < 0.012) {
      camera.position.copy(home);
      controls.target.copy(HOME_TARGET);
      controls.update();
      flying.current = false;
    }
  });

  useEffect(() => {
    const stop = () => {
      flying.current = false;
    };
    controls?.addEventListener("start", stop);
    return () => controls?.removeEventListener("start", stop);
  }, [controls]);

  return null;
}

export default function EyeCanvas({
  hiddenParts,
  hoveredPart,
  selectedPart,
  crossSection,
  showLabels,
  showEnglish,
  resetSignal,
  onHover,
  onPickStack,
  onSelectPart,
  onBackgroundClick,
}: Props) {
  // Coarse pointers (phones/tablets) get lighter tessellation and a lower DPR.
  const coarse = useMediaQuery("(pointer: coarse), (max-width: 767px)");
  const quality: Quality = coarse ? "low" : "high";

  // Horizontal cut that keeps the lower half — the classic axial section.
  const clippingPlanes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)], []);

  return (
    <Canvas
      dpr={[1, quality === "high" ? 2 : 1.5]}
      camera={{ fov: CAMERA_FOV, position: homePosition(1.2).toArray(), near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={onBackgroundClick}
    >
      <color attach="background" args={["#070b14"]} />
      <fog attach="fog" args={["#070b14", 9, 20]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bcd9ff", "#161d2e", 0.6]} />
      <directionalLight position={[-3.5, 4, 5]} intensity={2.1} />
      <directionalLight position={[4, -1.5, 2]} intensity={0.55} color="#7dd3fc" />
      {/* Small, bright source in front — the corneal catchlight. */}
      <pointLight position={[-2.2, 2.4, 4.4]} intensity={18} distance={16} decay={2} />
      <pointLight position={[2.6, 0.4, -3.2]} intensity={12} distance={16} decay={2} color="#38bdf8" />

      <Suspense fallback={null}>
        <EyeModel
          quality={quality}
          hiddenParts={hiddenParts}
          hoveredPart={hoveredPart}
          selectedPart={selectedPart}
          crossSection={crossSection}
          clippingPlanes={clippingPlanes}
          onHover={onHover}
          onSelect={onPickStack}
        />
        {showLabels && (
          <PartLabels
            hiddenParts={hiddenParts}
            hoveredPart={hoveredPart}
            selectedPart={selectedPart}
            showEnglish={showEnglish}
            onSelect={onSelectPart}
            onHover={onHover}
          />
        )}
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.85}
        zoomSpeed={0.9}
        minDistance={2.6}
        maxDistance={18}
        target={HOME_TARGET.toArray()}
      />
      <CameraRig resetSignal={resetSignal} />
    </Canvas>
  );
}
