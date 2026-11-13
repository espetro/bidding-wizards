import { describe, expect, it } from "vitest";
import { bidText } from "./bidText";
import { emptySqFt, type EstimateInput } from "../../domain/estimate";

const input: EstimateInput = {
  materials: [
    { kind: "qty", id: "1", item: "Vanity", quantity: 1, unit: "ea", unitCost: 400 },
    { ...emptySqFt(), id: "2", item: "Subway tile", length: 8, width: 6, pricePerSqFt: 4 },
  ],
  labor: [{ id: "3", role: "Tile setter", hours: 10, rate: 60 }],
  contingencyPct: 10,
  markupPct: 20,
  gstPct: 10,
};

describe("bidText", () => {
  it("states the same totals as the sheet", () => {
    // direct 400 + 192 + 600 = 1192; +10% = 1311.20; +20% = 1573.44; GST 157.34
    const t = bidText({ name: "Guest bath", address: "", date: "" }, input);
    expect(t).toContain("BID: Guest bath");
    expect(t).toContain("Subway tile: 8 x 6 = 48 sq ft @ $4.00 = $192.00");
    expect(t).toContain("BID TOTAL (ex GST): $1,573.44");
    expect(t).toContain("TOTAL INC GST: $1,730.78");
    expect(t).toContain("Profit: $262.24 | Margin: 16.7%");
  });

  it("omits GST lines and blank rows", () => {
    const t = bidText({ name: "", address: "", date: "" }, { ...input, gstPct: 0, materials: [...input.materials.slice(0, 1), { kind: "qty", id: "9", item: "", quantity: 1, unit: "ea", unitCost: 0 }] });
    expect(t).toContain("BID: Untitled job");
    expect(t).not.toContain("GST (");
    expect(t).not.toContain("INC GST");
    expect(t).not.toContain("Material:");
  });
});

describe("bidText metric", () => {
  it("writes area lines in m² when metric is on", () => {
    const t = bidText(
      { name: "Reroof", address: "", date: "" },
      { materials: [{ kind: "sqft", id: "r", item: "Roof", length: 12, width: 8, pricePerSqFt: 45 }], labor: [], contingencyPct: 0, markupPct: 0, gstPct: 15 },
      true,
    );
    expect(t).toContain("Roof: 12 x 8 = 96 m² @ $45.00/m² = $4,320.00");
    expect(t).not.toContain("sq ft");
  });
});
