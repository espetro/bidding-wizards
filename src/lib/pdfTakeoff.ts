import type { BlueprintTakeoffResult } from "./blueprintMock";
import { readJob } from "./readJob";

/** Quantity take-off from text extracted out of the PDF itself (schedules, legends, notes). */
export function takeoffFromPdfText(text: string, pages: number, filename: string): BlueprintTakeoffResult {
  if (text.replace(/\s/g, "").length < 20) {
    return {
      ok: false,
      message: "No readable text in that PDF (scanned drawing?). Paste the scope under Read this job.",
    };
  }
  const read = readJob(text);
  if (!read.ok) return { ok: false, message: read.message };
  if (read.materials.length === 0 && read.labor.length === 0) {
    return { ok: false, message: "Read the PDF but found no quantities to price. Add lines by hand." };
  }
  return {
    ok: true,
    mock: false,
    title: "PDF take-off",
    brief: `Take-off read from ${filename} (${pages} sheet${pages === 1 ? "" : "s"}).`,
    pages,
    matched: read.matched,
    materials: read.materials,
    labor: read.labor,
    markupPct: read.markupPct,
    contingencyPct: read.contingencyPct,
  };
}
