/** Tiny inline icon set — avoids pulling an icon package into the 3D bundle. */
type IconProps = { className?: string };

const base = "size-4 shrink-0";

export const EyeIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

export const EyeOffIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6.2 0 9.8 6.5 9.8 6.5a17.7 17.7 0 0 1-3.3 4.1M6.4 7.6A17.4 17.4 0 0 0 2.2 12S5.8 18.5 12 18.5c1.6 0 3-.4 4.2-1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m3 3 18 18" strokeLinecap="round" />
  </svg>
);

export const ResetIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" strokeLinecap="round" />
    <path d="M3 6.5V12h5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TagIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H12l8 7-8 7H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" strokeLinejoin="round" />
    <circle cx="8.4" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const SliceIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M2.6 12h18.8" strokeLinecap="round" strokeDasharray="3 2.4" />
  </svg>
);

export const CloseIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
    <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
);

export const BackIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const StethoscopeIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M5 3v5a4 4 0 0 0 8 0V3" strokeLinecap="round" />
    <path d="M9 12v3a5 5 0 0 0 10 0v-1.5" strokeLinecap="round" />
    <circle cx="19" cy="11" r="2" />
  </svg>
);

export const SparkIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" strokeLinejoin="round" />
  </svg>
);

export const LayersIcon = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
    <path d="m12 3.5 8.5 4.3L12 12.1 3.5 7.8 12 3.5Z" strokeLinejoin="round" />
    <path d="m4 12 8 4 8-4M4 16.2l8 4 8-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
