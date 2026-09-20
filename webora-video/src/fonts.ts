import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadIBMPlexArabic } from "@remotion/google-fonts/IBMPlexSansArabic";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Load every weight the Brand Book calls for.
loadSpaceGrotesk("normal", { weights: ["400", "500", "700"] });
loadIBMPlexArabic("normal", { weights: ["400", "500", "700"] });
loadInter("normal", { weights: ["400", "500", "700"] });
loadJetBrainsMono("normal", { weights: ["500"] });
