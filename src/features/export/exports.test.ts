import { describe, expect, it } from "vitest";
import { emptyArea, emptyLabor, emptyMaterial } from "../../domain/estimate";
import { toProcoreBudgetCsv, toQuickBooksIif } from "./exports";

const input = {
  materials: [{ ...emptyMaterial(), item: "Toilet", quantity: 2, unit: "ea", unitCost: 250 }],
  labor: [{ ...emptyLabor(), role: "Plumber", hours: 5, rate: 100 }],
  contingencyPct: 10, markupPct: 20, gstPct: 10,
};

describe("exports", () => {
  it("Procore budget sums to cost-to-complete (no markup, no GST)", () => {
    const rows = toProcoreBudgetCsv(input).trim().split("\n").slice(1);
    const sum = rows.reduce((s, r) => s + Number(r.split(",").at(-1)), 0);
    expect(sum).toBe(1100); // 500 + 500 direct + 100 contingency
    expect(rows.map((r) => r.split(",")[1])).toEqual(["M", "L", "O"]);
  });
  it("Procore UOM is M2 for metre area lines", () => {
    const csv = toProcoreBudgetCsv({
      materials: [{ ...emptyArea("m"), item: "Re-roof", length: 18, width: 12, pricePerArea: 85 }],
      labor: [],
      contingencyPct: 0,
      markupPct: 0,
      gstPct: 15,
    });
    expect(csv).toContain("M2");
    expect(csv).toContain("18360.00");
  });

  it("QuickBooks IIF lines sum to the GST-inclusive total", () => {
    const iif = toQuickBooksIif(input, "Gus Pty Ltd", new Date(2026, 10, 13));
    const trns = iif.split("\r\n").find((l) => l.startsWith("TRNS\t"))!;
    expect(trns.split("\t")[5]).toBe("1452.00");
    const spl = iif.split("\r\n").filter((l) => l.startsWith("SPL\t")).reduce((s, l) => s + Number(l.split("\t")[5]), 0);
    expect(Math.round(-spl * 100) / 100).toBe(1452);
  });
});
