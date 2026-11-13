import { describe, expect, it } from "vitest";
import { breakdown, crewHours, crewLabor } from "./estimate";
import { detectMarket, inferMarket, MARKETS, sampleLinesFor } from "./markets";
import { bidRows, xlsxFromRows } from "./xlsx";

describe("crew labor", () => {
  it("hours = people × days × hours/day, and flows into the bid", () => {
    expect(crewHours(4, 3, 9)).toBe(108);
    const roof = crewLabor("Montaje en techo", 4, 3, 9, 180);
    expect(roof.hours).toBe(108);
    const b = breakdown({ materials: [], labor: [roof], contingencyPct: 0, markupPct: 25, gstPct: 16 });
    expect(b.labor).toBe(19440);
    expect(b.bidTotal).toBe(24300);
    expect(b.gst).toBe(3888);
    expect(b.totalIncGst).toBe(28188);
  });
});

describe("Mexico market", () => {
  it("is Spanish, MXN, IVA 16%, metric, and detected from Monterrey/IVA briefs", () => {
    expect(MARKETS.mx).toMatchObject({ lang: "es", currency: "MXN", taxName: "IVA", taxPct: 16, areaUnit: "m" });
    expect(detectMarket("Nave en Apodaca, Nuevo León, precio más IVA")).toBe("mx");
    expect(inferMarket("es-MX", "America/Monterrey")).toBe("mx");
    expect(inferMarket("en-US", "America/New_York")).toBe("us");
    expect(sampleLinesFor("mx")?.labor[0]).toMatchObject({ crew: 4, days: 3, hoursPerDay: 9 });
  });
});

describe("Excel export", () => {
  const input = {
    materials: [{ kind: "qty" as const, id: "e", item: "Equipo paquete 10 TR", quantity: 3, unit: "pza", unitCost: 185000 }],
    labor: [crewLabor("Montaje en techo", 4, 3, 9, 180)],
    contingencyPct: 5, markupPct: 20, gstPct: 16,
  };
  it("writes live formulas with Spanish headers and cached values that match the sheet", () => {
    const rows = bidRows(input, MARKETS.mx);
    const flat = JSON.stringify(rows);
    expect(flat).toContain("Hombres");
    expect(flat).toContain('"f":"B7*C7*D7","v":108');
    const b = breakdown(input);
    const total = rows.find((r) => r[0] === "Total con IVA")![1] as { f: string; v: number };
    expect(total.v).toBe(b.totalIncGst);
  });
  it("produces a zip with the xlsx parts", () => {
    const bytes = xlsxFromRows(bidRows(input, MARKETS.mx), "Cotización");
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    for (const part of ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "fullCalcOnLoad"]) expect(text).toContain(part);
  });
});
