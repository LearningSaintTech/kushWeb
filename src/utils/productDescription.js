/**
 * Turn a product's plain-text long description into display blocks so headings and
 * "Label: value" lines can be shown bold (designers type them as plain lines).
 *
 *   heading → "Product Highlights", "Fit & Styling", "Product Details:" (short line, no sentence end)
 *   field   → "Colour: Solid Black", "Style Tip: Layer over …", "Product Description : Make a …"
 *   para    → everything else
 */

const MAX_HEADING_CHARS = 40;
const MAX_HEADING_WORDS = 5;
const MAX_LABEL_CHARS = 32;
const MAX_LABEL_WORDS = 4;

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

function isHeading(line) {
  const t = line.replace(/:$/, "").trim();
  if (!t || t.length > MAX_HEADING_CHARS || wordCount(t) > MAX_HEADING_WORDS) return false;
  if (/[.!?,;]$/.test(t) || t.includes(":")) return false;
  return /^[\p{L}]/u.test(t);
}

function asField(line) {
  const m = line.match(/^([^:]{2,64}?)\s*:\s*(\S.*)$/);
  if (!m) return null;
  const label = m[1].trim();
  if (label.length > MAX_LABEL_CHARS || wordCount(label) > MAX_LABEL_WORDS) return null;
  if (/[.!?]/.test(label) || /https?$/i.test(label) || m[2].startsWith("//")) return null;
  return { type: "field", label, value: m[2].trim() };
}

/** @returns {{type: "heading"|"field"|"para", text?: string, label?: string, value?: string}[]} */
export function parseProductDescription(raw) {
  const lines = String(raw ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());
  const blocks = [];
  lines.forEach((line, i) => {
    if (!line) return;
    const hasMoreAfter = lines.slice(i + 1).some(Boolean);
    const field = asField(line);
    if (field) blocks.push(field);
    else if (hasMoreAfter && isHeading(line)) blocks.push({ type: "heading", text: line.replace(/:$/, "").trim() });
    else blocks.push({ type: "para", text: line });
  });
  return blocks;
}
