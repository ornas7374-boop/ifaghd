// إعدادات المشهد لكل مكان: 3 لقطات (غلاف + زاويتان)
const tentsCamp = (c1, c2, c3) => [
  { type: "tent", x: -4.2, z: 1.6, w: 2.4, h: 3.2, rot: 0.3, color: c1 },
  { type: "tent", x: 3.6, z: -2.8, w: 2.0, h: 2.7, rot: -0.4, color: c2 },
  { type: "tent", x: 1.2, z: 4.8, w: 1.7, h: 2.3, rot: 0.9, color: c3 },
  { type: "tent", x: -6.5, z: -4, w: 1.9, h: 2.6, rot: 0.1, color: c2 },
];
const kashta = (col) => [
  { type: "majlis", x: -3.5, z: 2.5, w: 3.2, d: 1.8, h: 2.2, rot: 0.4, color: col },
  { type: "rock", x: 4, z: -3, w: 0.7, color: "#8a7a5c" },
  { type: "rock", x: 5, z: 2, w: 0.5, color: "#8a7a5c" },
];
const sandRed = ["#d9905a", "#c27445"];
const sandGold = ["#dcc99f", "#c9b083"];
const sandPale = ["#e6d8b5", "#d4c194"];
const green = ["#7f8f5a", "#5f7444"];

export const SCENES = {
  "demo-royal-camp": { ground: sandGold, items: tentsCamp("#eef3ef", "#dcc99f", "#eef3ef"), times: ["night", "sunset", "day"] },
  "demo-shafa-camp": { ground: green, mountains: true, hscale: 1.3, items: tentsCamp("#62c391", "#eef3ef", "#dcc99f"), times: ["sunset", "day", "night"] },
  "demo-golden-sands": { ground: sandGold, items: kashta("#3b2f25"), times: ["sunset", "night", "day"] },
  "demo-palm-kashta": { ground: ["#b9a77a", "#9c8c62"], hscale: 0.4, items: [...kashta("#4a3a2b"), { type: "palm", x: -8, z: -3, h: 5 }, { type: "palm", x: 6, z: 5, h: 6 }, { type: "palm", x: 8, z: -6, h: 5.5 }, { type: "palm", x: -2, z: -8, h: 6.5 }], times: ["day", "sunset", "night"] },
  "demo-soudah-view": { ground: green, mountains: true, hscale: 1.6, freq: 1.4, items: [{ type: "rock", x: 4, z: 2, w: 0.9, color: "#6b6b5c" }, { type: "rock", x: -4, z: -2, w: 0.7, color: "#6b6b5c" }], times: ["sunset", "day", "night"] },
  "demo-abhur-beach": { ground: sandPale, sea: "#2f7fa3", hscale: 0.3, items: kashta("#eef3ef"), times: ["sunset", "day", "night"], angle: -1.2 },
  "demo-thumamah": { ground: sandRed, hscale: 1.2, items: [{ type: "rock", x: 3, z: -2, w: 0.6, color: "#7a5a3c" }], times: ["night", "sunset", "day"] },
  "demo-tabuk-north": { ground: ["#c9a882", "#a98a66"], mountains: true, items: [...tentsCamp("#dcc99f", "#eef3ef", "#62c391"), { type: "tent", x: 7, z: 3, w: 2.2, h: 3, rot: 0.6, color: "#eef3ef" }], times: ["day", "night", "sunset"] },
  // أماكن جديدة
  "demo-halfmoon-beach": { ground: sandPale, sea: "#2b8fb0", hscale: 0.25, items: [...kashta("#3b2f25"), { type: "palm", x: -7, z: 4, h: 5 }], times: ["day", "sunset", "night"], angle: -1.4 },
  "demo-red-nafud-camp": { ground: sandRed, hscale: 1.5, freq: 0.8, items: tentsCamp("#eef3ef", "#3b2f25", "#dcc99f"), times: ["sunset", "night", "day"] },
  "demo-aridh-evening": { ground: sandGold, hscale: 0.9, items: [{ type: "majlis", x: -2.5, z: 2, w: 2.6, d: 1.6, h: 1.9, rot: 0.2, color: "#62c391" }], times: ["night", "sunset", "day"] },
  "demo-habala-camp": { ground: ["#8a8f5a", "#6c7448"], mountains: true, hscale: 1.5, freq: 1.3, items: tentsCamp("#dcc99f", "#62c391", "#eef3ef"), times: ["day", "sunset", "night"] },
};
