import { describe, expect, it } from "vitest";
import { breakdown, isAreaPricedLine, isSqFtLine } from "../../domain/estimate";
import {
  SAMPLE_ELECTRICAL_BLUEPRINT,
  isPdfBlueprint,
  mockBlueprintTakeoff,
  mockPageCount,
} from "./blueprintMock";

describe("isPdfBlueprint", () => {
  it("accepts application/pdf and .pdf names", () => {
    expect(isPdfBlueprint({ name: "plan.PDF", size: 10, type: "" })).toBe(true);
    expect(isPdfBlueprint({ name: "plan", size: 10, type: "application/pdf" })).toBe(true);
    expect(isPdfBlueprint({ name: "plan.dwg", size: 10, type: "image/vnd.dwg" })).toBe(false);
  });
});

describe("mockPageCount", () => {
  it("maps size to a small page band", () => {
    expect(mockPageCount(1)).toBe(1);
    expect(mockPageCount(186_400)).toBe(3);
    expect(mockPageCount(0)).toBe(1);
  });
});

describe("mockBlueprintTakeoff", () => {
  it("rejects missing, empty, and non-PDF files", () => {
    expect(mockBlueprintTakeoff({ name: "", size: 1, type: "application/pdf" }).ok).toBe(false);
    expect(mockBlueprintTakeoff({ name: "x.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    const dwg = mockBlueprintTakeoff({ name: "plan.dwg", size: 100, type: "" });
    expect(dwg.ok).toBe(false);
    if (!dwg.ok) expect(dwg.message).toMatch(/PDF/i);
  });

  it("fills an electrical bid from the Tallowwood sample PDF", () => {
    const result = mockBlueprintTakeoff(SAMPLE_ELECTRICAL_BLUEPRINT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mock).toBe(true);
    expect(result.title).toMatch(/electrical/i);
    expect(result.matched).toContain("18 duplex receptacles");
    const duplex = result.materials.find((m) => !isAreaPricedLine(m) && m.item.includes("Duplex"));
    expect(duplex && !isAreaPricedLine(duplex) && duplex.quantity).toBe(18);
    const coverage = result.materials.find(isSqFtLine);
    expect(coverage?.length).toBe(22);
    expect(coverage?.width).toBe(18);
    const bid = breakdown({
      materials: result.materials,
      labor: result.labor,
      markupPct: result.markupPct,
      contingencyPct: result.contingencyPct,
    });
    expect(bid.materials).toBeGreaterThan(0);
    expect(bid.labor).toBe(16 * 95 + 8 * 42);
    expect(bid.bidTotal).toBeGreaterThan(bid.materials);
  });

  it("keeps a lighter stub for architectural filenames", () => {
    const result = mockBlueprintTakeoff({
      name: "Quantum-Dynamics-floor-plan.pdf",
      size: 400_000,
      type: "application/pdf",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toMatch(/architectural/i);
    expect(result.materials.some(isSqFtLine)).toBe(true);
  });
});
