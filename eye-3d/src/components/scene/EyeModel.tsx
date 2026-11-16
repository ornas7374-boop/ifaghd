"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { EYE_PARTS, type PartId } from "@/data/eyeParts";
import { GEOMETRY_BUILDERS, buildZonules, createIrisTexture, type Quality } from "@/lib/geometry";
import PartMesh, { type PartVisual } from "./PartMesh";

/** Per-part material tuning. Order matters for the transparent shells. */
const VISUALS: Record<PartId, PartVisual> = {
  sclera: { opacity: 1, roughness: 0.4, side: THREE.DoubleSide, renderOrder: 0 },
  choroid: { opacity: 1, roughness: 0.62, side: THREE.DoubleSide, renderOrder: 0 },
  retina: { opacity: 1, roughness: 0.78, side: THREE.DoubleSide, renderOrder: 0 },
  ciliaryBody: { opacity: 1, roughness: 0.58, renderOrder: 0 },
  opticNerve: { opacity: 1, roughness: 0.66, renderOrder: 0 },
  iris: { opacity: 1, roughness: 0.52, side: THREE.DoubleSide, renderOrder: 1 },
  pupil: { opacity: 1, roughness: 0.95, metalness: 0, renderOrder: 2 },
  vitreous: { opacity: 0.12, roughness: 0.14, side: THREE.DoubleSide, depthWrite: false, renderOrder: 3, selectedOpacity: 3.4 },
  lens: { physical: true, opacity: 0.42, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide, depthWrite: false, renderOrder: 4, selectedOpacity: 2 },
  cornea: { physical: true, opacity: 0.15, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.01, side: THREE.DoubleSide, depthWrite: false, renderOrder: 5, selectedOpacity: 3.6 },
};

interface Props {
  quality: Quality;
  hiddenParts: Set<PartId>;
  hoveredPart: PartId | null;
  selectedPart: PartId | null;
  crossSection: boolean;
  clippingPlanes: THREE.Plane[];
  onHover: (id: PartId | null) => void;
  /** Receives every structure the ray passed through, front to back. */
  onSelect: (stack: PartId[], screenX: number, screenY: number) => void;
}

export default function EyeModel({
  quality,
  hiddenParts,
  hoveredPart,
  selectedPart,
  crossSection,
  clippingPlanes,
  onHover,
  onSelect,
}: Props) {
  const geometries = useMemo(() => {
    const entries = EYE_PARTS.map((part) => [part.id, GEOMETRY_BUILDERS[part.id](quality)] as const);
    return Object.fromEntries(entries) as Record<PartId, THREE.BufferGeometry>;
  }, [quality]);

  const zonules = useMemo(() => buildZonules(), []);
  const irisTexture = useMemo(() => createIrisTexture("#3f7fae"), []);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  useEffect(() => {
    return () => {
      zonules.dispose();
      irisTexture.dispose();
    };
  }, [zonules, irisTexture]);

  const zonulesVisible = !hiddenParts.has("ciliaryBody") && !hiddenParts.has("lens");

  /**
   * Turns one pointer event into the ordered stack of structures under the
   * cursor. Duplicates are collapsed (a double-sided shell is hit on the way
   * in and on the way out) and, in cross-section mode, hits on the half that
   * was clipped away are dropped so you can only pick what you can see.
   */
  const resolveStack = useCallback(
    (event: ThreeEvent<PointerEvent | MouseEvent>): PartId[] => {
      const stack: PartId[] = [];
      for (const hit of event.intersections) {
        if (crossSection && hit.point.y > 0) continue;
        const id = hit.object.userData?.partId as PartId | undefined;
        if (id && !stack.includes(id)) stack.push(id);
      }
      return stack;
    },
    [crossSection],
  );

  return (
    <group
      onPointerMove={(event) => {
        event.stopPropagation();
        onHover(resolveStack(event)[0] ?? null);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        const stack = resolveStack(event);
        if (!stack.length) return;
        event.stopPropagation();
        onSelect(stack, event.nativeEvent.clientX, event.nativeEvent.clientY);
      }}
    >
      {EYE_PARTS.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          visual={VISUALS[part.id]}
          geometry={geometries[part.id]}
          map={part.id === "iris" ? irisTexture : undefined}
          hidden={hiddenParts.has(part.id)}
          hovered={hoveredPart === part.id}
          selected={selectedPart === part.id}
          crossSection={crossSection}
          clippingPlanes={clippingPlanes}
        />
      ))}

      {/* Suspensory fibres — decoration only, deliberately not raycastable. */}
      <lineSegments geometry={zonules} visible={zonulesVisible} raycast={() => null}>
        <lineBasicMaterial
          color="#d9c7a8"
          transparent
          opacity={0.5}
          clippingPlanes={crossSection ? clippingPlanes : null}
        />
      </lineSegments>
    </group>
  );
}
