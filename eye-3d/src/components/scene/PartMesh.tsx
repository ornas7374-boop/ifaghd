"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { EyePart } from "@/data/eyeParts";

export interface PartVisual {
  /** Use MeshPhysicalMaterial (clearcoat) — reserved for the glassy media. */
  physical?: boolean;
  opacity: number;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  renderOrder?: number;
  /** Multiplier applied to opacity while the part is selected. */
  selectedOpacity?: number;
}

interface Props {
  part: EyePart;
  visual: PartVisual;
  geometry: THREE.BufferGeometry;
  map?: THREE.Texture;
  hidden: boolean;
  hovered: boolean;
  selected: boolean;
  crossSection: boolean;
  clippingPlanes: THREE.Plane[];
}

const HIGHLIGHT = new THREE.Color("#2ee6d6");
/** Frame-rate independent exponential approach. */
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * One anatomical structure. Pointer events are resolved by the parent group
 * (see EyeModel) so a single click can reason about every layer the ray passed
 * through — this mesh only owns its look and its fade in/out.
 */
export default function PartMesh({
  part,
  visual,
  geometry,
  map,
  hidden,
  hovered,
  selected,
  crossSection,
  clippingPlanes,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  // MeshPhysicalMaterial extends MeshStandardMaterial, so one ref type covers both.
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const dt = Math.min(delta, 0.1);
    const boost = visual.selectedOpacity ?? 1.9;
    const targetOpacity = hidden
      ? 0
      : selected
        ? Math.min(1, visual.opacity * boost)
        : visual.opacity;

    material.opacity = damp(material.opacity, targetOpacity, 9, dt);
    material.transparent = material.opacity < 0.995;
    material.depthWrite = visual.depthWrite ?? material.opacity > 0.9;

    const pulse = selected
      ? 0.62 + Math.sin(state.clock.elapsedTime * 3.1) * 0.16
      : hovered
        ? 0.32
        : 0;
    material.emissiveIntensity = damp(material.emissiveIntensity, pulse, 11, dt);

    mesh.visible = material.opacity > 0.006;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      userData={{ partId: part.id }}
      renderOrder={visual.renderOrder ?? 0}
      // Hidden layers must not swallow clicks meant for the parts behind them.
      raycast={hidden ? () => null : THREE.Mesh.prototype.raycast}
    >
      {visual.physical ? (
        <meshPhysicalMaterial
          ref={materialRef}
          color={part.color}
          map={map}
          transparent
          opacity={visual.opacity}
          roughness={visual.roughness}
          metalness={visual.metalness ?? 0.02}
          clearcoat={visual.clearcoat ?? 1}
          clearcoatRoughness={visual.clearcoatRoughness ?? 0.04}
          side={visual.side ?? THREE.FrontSide}
          emissive={HIGHLIGHT}
          emissiveIntensity={0}
          clippingPlanes={crossSection ? clippingPlanes : null}
        />
      ) : (
        <meshStandardMaterial
          ref={materialRef}
          color={part.color}
          map={map}
          transparent
          opacity={visual.opacity}
          roughness={visual.roughness}
          metalness={visual.metalness ?? 0.02}
          side={visual.side ?? THREE.FrontSide}
          emissive={HIGHLIGHT}
          emissiveIntensity={0}
          clippingPlanes={crossSection ? clippingPlanes : null}
        />
      )}
    </mesh>
  );
}
