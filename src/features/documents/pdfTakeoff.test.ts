import { describe, expect, it } from "vitest";
import { takeoffFromPdfText } from "./pdfTakeoff";

describe("takeoffFromPdfText", () => {
  it("rejects PDFs with no text layer", () => {
    expect(takeoffFromPdfText("  ", 1, "scan.pdf").ok).toBe(false);
  });
  it("prices quantities found in the PDF text", () => {
    const r = takeoffFromPdfText("Guest bath remodel. Tile floor 8 x 6 ft, new vanity, paint walls.", 2, "a.pdf");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mock).toBe(false);
      expect(r.materials.length).toBeGreaterThan(0);
    }
  });
});
