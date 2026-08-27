/** Every word on the page, kept out of the components. */

export const NAV_LINKS = [
  { label: "The Car", href: "#the-car" },
  { label: "Performance", href: "#performance" },
  { label: "Craftsmanship", href: "#craftsmanship" },
  { label: "Reserve", href: "#reserve" },
];

export type Chapter = {
  id: string;
  /** Scroll window within the pinned hero, as a fraction of its length. */
  range: [number, number];
  align: "center" | "left" | "right";
  label: string;
  headline: string[];
  copy?: string;
  note?: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "hero",
    range: [0, 0.2],
    align: "center",
    label: "Molsheim, France",
    headline: ["Bugatti", "Born to move."],
    note: "Where engineering becomes art.",
  },
  {
    id: "design",
    range: [0.2, 0.45],
    align: "left",
    label: "I — Design",
    headline: ["Designed without", "compromise."],
    copy:
      "Every surface is drawn by the air that will pass over it. The body is sculpted as a single continuous gesture — the horseshoe grille set low and deliberate, the aerodynamic silhouette drawn taut over the wheels, the iconic C-line sweeping the flank in one unbroken arc. Nothing is applied. Nothing is decorative. Proportion is treated as an obsession, measured to the millimetre and then measured again.",
  },
  {
    id: "performance",
    range: [0.45, 0.75],
    align: "right",
    label: "II — Performance",
    headline: ["Power, precisely", "controlled."],
    copy:
      "Eight litres. Sixteen cylinders. Four turbochargers arranged in sequence so that torque arrives without a seam. Power is delivered through a seven-speed dual-clutch transmission to all four wheels, and the active rear aerofoil trims the car's balance a hundred times a second. The result is not violence. It is composure at speeds where composure should not exist.",
  },
  {
    id: "machine",
    range: [0.75, 1],
    align: "left",
    label: "III — The Machine",
    headline: ["Not built", "for everyone."],
    note: "Built for those who understand.",
  },
];

export const CALLOUTS = [
  { label: "Engine", position: "top-left" },
  { label: "Quad Turbo", position: "top-right" },
  { label: "All-Wheel Drive", position: "mid-left" },
  { label: "Carbon Fibre", position: "bottom-right" },
  { label: "Active Aerodynamics", position: "bottom-left" },
] as const;

export const SPECIFICATIONS = [
  { term: "Engine", value: "8.0 L quad-turbocharged W16" },
  { term: "Power", value: "1,600 PS / 1,177 kW at 7,100 rpm" },
  { term: "Torque", value: "1,600 Nm from 2,000 to 7,000 rpm" },
  { term: "0–100 km/h", value: "2.3 seconds" },
  { term: "Top Speed", value: "440 km/h, electronically limited" },
  { term: "Transmission", value: "7-speed dual-clutch" },
  { term: "Drivetrain", value: "Permanent all-wheel drive" },
  { term: "Weight", value: "1,995 kg dry" },
  { term: "Chassis", value: "Carbon-fibre monocoque" },
  { term: "Brakes", value: "Carbon-ceramic, 8-piston front / 6-piston rear" },
  { term: "Aerodynamics", value: "Active rear aerofoil, longtail body" },
];

export const DETAILS = [
  { src: "/detail/grille.jpg", caption: "The horseshoe", alt: "The horseshoe radiator grille, machined and set low into the nose." },
  { src: "/detail/headlight.jpg", caption: "Quad-element light", alt: "A quad-element LED headlight signature lit against black." },
  { src: "/detail/carbon.jpg", caption: "Exposed weave", alt: "Exposed carbon-fibre weave across the front splitter." },
  { src: "/detail/wheel.jpg", caption: "Forged alloy", alt: "A forged alloy wheel over a gold brake caliper." },
  { src: "/detail/cline.jpg", caption: "The C-line", alt: "The signature C-line arc sweeping the flank of the car." },
  { src: "/detail/intake.jpg", caption: "Air, invited in", alt: "A side intake feeding air along the flank of the car." },
  { src: "/detail/haunch.jpg", caption: "Rear haunch", alt: "The rear haunch and aerofoil seen from three-quarters behind." },
  { src: "/detail/canopy.jpg", caption: "Canopy line", alt: "The roofline and canopy drawn in one continuous curve." },
];

export const PERFORMANCE_FIGURES = [
  { value: "440", unit: "km/h", term: "Top speed" },
  { value: "2.3", unit: "sec", term: "0–100 km/h" },
  { value: "16", unit: "cyl", term: "Configuration" },
  { value: "4", unit: "turbo", term: "Induction" },
];

export const MODELS = [
  "Chiron Super Sport",
  "Chiron Pur Sport",
  "Mistral",
  "Bolide",
  "Undecided",
];
