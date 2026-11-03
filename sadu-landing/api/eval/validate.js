// POST /api/eval/validate { method:"A"|"B"|"C", original, generated, masks } — preview only
// Method B = method A's output with the protected architecture composited back from the original,
// only when A's camera framing passed. Returns the verdict (and B's composite image).
const { guard, body, imageFromDataUri } = require("../_lib/evalGuard");
const { decodeMasks } = require("../_lib/masks");
const { validatePreservation, compositeProtected } = require("../_lib/preservation");

function union(elements) {
  const { w, h } = elements[0].mask, data = new Uint8Array(w * h);
  for (const el of elements) for (let i = 0; i < data.length; i++) if (el.mask.data[i]) data[i] = 1;
  return { w, h, data };
}

const verdictOnly = (r) => ({ preservation: r.preservation, design: r.design, accepted: r.accepted,
  framing: r.framing, elements: r.elements, change: r.change });

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const { method, original, generated, masks } = body(req);
    const o = imageFromDataUri(original), g = imageFromDataUri(generated);
    const m = decodeMasks(masks);
    const opts = { editableMask: m.editable, occluders: m.occluders };
    const unverifiable = m.quality && m.quality.verifiable === false;
    let r = await validatePreservation(o, g, m.elements, opts), composite = null, note = null;
    if (method === "B") {
      if (!m.elements.length) note = "composite_skipped_no_elements";
      else if (!r.framing || !r.framing.ok) note = "composite_skipped_framing_changed";
      else {
        const out = await compositeProtected(o, g, union(m.elements), { occluders: m.occluders });
        r = await validatePreservation(o, out, m.elements, opts);
        composite = `data:image/jpeg;base64,${out.toString("base64")}`;
      }
    } else if (!["A", "C"].includes(method)) return res.status(400).json({ error: "bad_method" });
    const v = verdictOnly(r);
    if (unverifiable) { v.accepted = false; v.unverifiable = true; v.unverifiableReasons = m.quality.reasons; }
    res.status(200).json({ status: "ok", method, note, verdict: v, image: composite });
  } catch (e) {
    res.status(400).json({ status: "failed", error: e.message });
  }
};
