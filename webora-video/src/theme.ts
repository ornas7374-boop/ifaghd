// Webora Brand Book V1.0 — canonical values
export const COLORS = {
  ink: "#0A0E27",
  inkDeeper: "#050820",
  violet: "#6D28D9",
  violetSoft: "#8B5CF6",
  mint: "#3EE8B4",
  mintSoft: "#7CF4CD",
  cream: "#F5F3EE",
  white: "#FFFFFF",
  muted: "#8B8FA8",
  danger: "#EF4444",
  panel: "#111535",
  panelBorder: "rgba(139,143,168,0.18)",
} as const;

export const FONTS = {
  displayEN: '"Space Grotesk", system-ui, sans-serif',
  displayAR: '"IBM Plex Sans Arabic", "Tajawal", system-ui, sans-serif',
  body: '"Inter", "IBM Plex Sans Arabic", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

// Type scale (Brand Book · TYPE SCALE 04, scaled for 1080p canvas)
export const TYPE = {
  display: 160,
  h1: 112,
  h2: 76,
  h3: 52,
  body: 30,
  micro: 22,
} as const;

// Scene timing (in seconds at 30fps)
export const SCENES = [
  { id: "cover", dur: 4 },
  { id: "problem", dur: 6 },
  { id: "data", dur: 7 },
  { id: "solution", dur: 5 },
  { id: "how", dur: 6 },
  { id: "tiers", dur: 7 },
  { id: "market", dur: 6 },
  { id: "competition", dur: 6 },
  { id: "traction", dur: 5 },
  { id: "model", dur: 6 },
  { id: "gtm", dur: 7 },
  { id: "financials", dur: 6 },
  { id: "team", dur: 5 },
  { id: "ask", dur: 5 },
  { id: "closing", dur: 6 },
] as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const TOTAL_FRAMES = SCENES.reduce((s, sc) => s + sc.dur * FPS, 0);
