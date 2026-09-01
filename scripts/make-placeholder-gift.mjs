// Generates a tiny, valid one-page PDF placeholder so the app is testable
// end-to-end before you drop in the real gift file. Builds proper xref
// offsets by hand instead of hardcoding them.
import fs from "node:fs";
import path from "node:path";

const line1 = "Placeholder gift file";
const line2 = "Replace private-gift/gift.pdf with your real file.";
const streamContent = `BT /F1 24 Tf 72 700 Td (${line1}) Tj ET\nBT /F1 14 Tf 72 660 Td (${line2}) Tj ET`;

const objects = [
  `<< /Type /Catalog /Pages 2 0 R >>`,
  `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
  `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((body, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

const outDir = path.resolve("private-gift");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "gift.pdf");
fs.writeFileSync(outPath, pdf, "latin1");
console.log("Wrote placeholder gift file to", outPath);
