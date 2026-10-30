// أيقونات SVG خفيفة بدل مكتبة كاملة.
type P = { className?: string };
const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconX = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconCheck = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconPlay = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M7 4.5v15l12-7.5z" /></svg>
);
export const IconSun = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconMoon = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IconLifebuoy = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3" /></svg>
);
export const IconPencil = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
);
export const IconHome = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconBranch = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 7v10M6 12h4a4 4 0 0 0 4-4V7M16 12h-2" /></svg>
);
export const IconTimer = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M10 2h4" /></svg>
);
export const IconChart = ({ className = "size-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconTrash = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
);
export const IconPlus = ({ className = "size-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
);
