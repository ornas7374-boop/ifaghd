import { cn, initials } from "@/lib/format";

// Muted, low-chroma avatar fills — identity without rainbow noise.
const FILLS = ["#3a3f5c", "#3d4a45", "#4a3f3a", "#3f3a4a", "#3a4550", "#4a4436"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white/90 ring-1 ring-white/5", className)}
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.4), background: FILLS[hash(name) % FILLS.length] }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3, size = 20 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} className="ring-2 ring-[var(--surface)]" />
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-surface-2 text-[10px] font-medium text-muted ring-2 ring-[var(--surface)]" style={{ width: size, height: size }}>
          +{rest}
        </span>
      )}
    </span>
  );
}
