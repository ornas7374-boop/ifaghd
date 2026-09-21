"use client";

// The mint dot + ring "Aura" — the signature element of the brand.
// Never recolor per Brand Book v1.0.
export function AuraDot({ size = 48, className = "" }: { size?: number; className?: string }) {
  const ring = size * 1.55;
  const halo = size * 2.4;
  return (
    <span
      aria-hidden
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: halo, height: halo }}
    >
      <span
        className="aura-halo absolute rounded-full"
        style={{
          width: halo,
          height: halo,
          background: "radial-gradient(circle, rgba(62,232,180,0.35) 0%, transparent 55%)",
        }}
      />
      <span
        className="aura-pulse absolute rounded-full border-[3px]"
        style={{ width: ring, height: ring, borderColor: "var(--mint)" }}
      />
      <span
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: "var(--mint)",
          boxShadow: `0 0 ${size / 2}px var(--mint)`,
        }}
      />
    </span>
  );
}
