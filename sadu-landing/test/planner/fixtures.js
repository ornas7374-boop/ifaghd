// Simulated room observations for the planner tests (what the vision model would report).
// Coordinates are normalised image x (0 left, 1 right). These are NOT real photos.
const base = () => ({
  size: { class: "medium" }, camera: { view: "frontal", height: "eye", certainty: "estimated" },
  surfaces: { floor: "light beige polished marble tiles", walls: "warm off-white paint", ceiling: "white tray ceiling with cove light" },
  walls: [{ id: "left", x_from: 0, x_to: 0.2 }, { id: "back", x_from: 0.2, x_to: 0.8 }, { id: "right", x_from: 0.8, x_to: 1 }],
  windows: [], doors: [], outlets: [], furniture: [], obstacles: [],
  light: { natural: "medium", window_side: "none", artificial: ["ceiling spots"] }
});

const ROOMS = {
  // 1. small room
  small: () => ({ ...base(), size: { class: "small", width_m: 2.6, depth_m: 2.8, basis: "60 cm floor tiles" } }),
  // 2. large room
  large: () => ({ ...base(), size: { class: "large", width_m: 5, depth_m: 5.2, basis: "door height 2.1 m" } }),
  // 3. the only wide wall has a window in its middle: the desk must go elsewhere
  windowBehind: () => ({ ...base(), windows: [{ wall: "back", x0: 0.35, x1: 0.65, y0: 0.1, y1: 0.6, certainty: "confirmed" }], light: { natural: "high", window_side: "back", artificial: [] } }),
  // 4. a door on the back wall near the outlet
  doorNear: () => ({ ...base(), doors: [{ wall: "back", x0: 0.62, x1: 0.76, y0: 0.2, y1: 0.95, certainty: "confirmed" }], outlets: [{ wall: "back", x: 0.7, y: 0.7 }] }),
  // 5. a bed (fixed) along part of the back wall
  furniture: () => ({ ...base(), furniture: [{ type: "bed", wall: "back", x0: 0.22, x1: 0.55, certainty: "confirmed" }] }),
  // window on the left wall: the textbook case (window to the side of the back-wall desk)
  windowLeft: () => ({ ...base(), windows: [{ wall: "left", x0: 0.02, x1: 0.17, y0: 0.07, y1: 0.6, certainty: "confirmed" }], outlets: [{ wall: "back", x: 0.32, y: 0.63 }], light: { natural: "high", window_side: "left", artificial: [] } }),
  // 10. nothing measurable: no size estimate, no basis
  unknownSize: () => ({ ...base(), size: {} }),
  // impossible: tiny room, door on the back wall, windows on both sides
  impossible: () => ({ ...base(), size: { class: "small", width_m: 1.6, depth_m: 1.7, basis: "door width" }, walls: [{ id: "back", x_from: 0.3, x_to: 0.7 }],
    doors: [{ wall: "back", x0: 0.42, x1: 0.58, y0: 0.2, y1: 0.95, certainty: "confirmed" }] })
};

module.exports = { ROOMS, base };
