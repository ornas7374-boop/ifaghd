// Generation models compared in the evaluation. Overridable per preview environment.
const MODELS = {
  A: process.env.SADU_GEN_A_MODEL || "black-forest-labs/flux-kontext-pro", // instruction edit (current production model)
  C: process.env.SADU_GEN_C_MODEL || "black-forest-labs/flux-fill-pro"     // masked inpainting
};
module.exports = { MODELS };
