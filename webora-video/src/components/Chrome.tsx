import { COLORS, FONTS } from "../theme";

/** Consistent per-scene chip in the top-right: "SECTION · NN" like the Brand Book. */
export const SceneTag: React.FC<{ label: string; index: number }> = ({ label, index }) => (
  <div
    style={{
      position: "absolute",
      top: 56,
      right: 72,
      fontFamily: FONTS.mono,
      fontSize: 22,
      letterSpacing: "0.18em",
      color: COLORS.mint,
      background: "rgba(62,232,180,0.08)",
      border: `1px solid ${COLORS.mint}55`,
      padding: "10px 20px",
      borderRadius: 999,
    }}
  >
    {label} · {String(index).padStart(2, "0")}
  </div>
);

/** Bottom-left footer: page number + brand line, echoing the Brand Book. */
export const FooterMark: React.FC<{ page: string }> = ({ page }) => (
  <div
    style={{
      position: "absolute",
      bottom: 40,
      left: 72,
      right: 72,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: FONTS.mono,
      fontSize: 18,
      letterSpacing: "0.2em",
      color: COLORS.muted,
    }}
  >
    <span>{page}</span>
    <span>WEBORA · PITCH DECK · SEP 2026</span>
  </div>
);
