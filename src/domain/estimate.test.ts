import { describe, expect, it } from "vitest";
import { areaAmount, breakdown, isAreaLine, lineArea, sqFtAmount, sqFtArea, type EstimateInput } from "./estimate";

function input(partial: Partial<EstimateInput> = {}): EstimateInput {
  return {
    materials: [
      { kind: "qty", id: "m1", item: "Subway tile", quantity: 48, unit: "sq ft", unitCost: 4.25 },
      { kind: "qty", id: "m2", item: "Toilet", quantity: 1, unit: "ea", unitCost: 185 },
    ],
    labor: [{ id: "l1", role: "Tile setter", hours: 8, rate: 75 }],
    contingencyPct: 8,
    markupPct: 22,
    ...partial,
  };
}

describe("breakdown", () => {
  it("computes materials, labor, contingency, markup, bid, profit, and margin in code", () => {
    const b = breakdown(input());
    expect(b.materials).toBe(389); // 48*4.25=204, +185=389
    expect(b.labor).toBe(600);
    expect(b.direct).toBe(989);
    expect(b.contingency).toBe(79.12); // 989 * 0.08
    expect(b.costToComplete).toBe(1068.12);
    expect(b.markup).toBe(234.99); // 1068.12 * 0.22 rounded
    expect(b.bidTotal).toBe(1303.11);
    expect(b.profit).toBe(b.markup);
    expect(b.marginPct).toBe(18.03); // 234.99 / 1303.11 * 100
  });

  it("treats markup as profit and margin as profit / bid", () => {
    const b = breakdown({
      materials: [{ kind: "qty", id: "m", item: "X", quantity: 100, unit: "ea", unitCost: 1 }],
      labor: [],
      contingencyPct: 0,
      markupPct: 25,
    });
    expect(b.materials).toBe(100);
    expect(b.labor).toBe(0);
    expect(b.contingency).toBe(0);
    expect(b.markup).toBe(25);
    expect(b.bidTotal).toBe(125);
    expect(b.profit).toBe(25);
    expect(b.marginPct).toBe(20);
  });

  it("ignores negative and non-finite line values", () => {
    const b = breakdown({
      materials: [
        { kind: "qty", id: "m", item: "bad", quantity: -4, unit: "ea", unitCost: 10 },
        { kind: "qty", id: "m2", item: "nan", quantity: Number.NaN, unit: "ea", unitCost: 10 },
      ],
      labor: [{ id: "l", role: "x", hours: 2, rate: Number.POSITIVE_INFINITY }],
      contingencyPct: -5,
      markupPct: Number.NaN,
    });
    expect(b.materials).toBe(0);
    expect(b.labor).toBe(0);
    expect(b.contingency).toBe(0);
    expect(b.markup).toBe(0);
    expect(b.bidTotal).toBe(0);
    expect(b.marginPct).toBe(0);
  });

  it("rolls L×W×$/sf into materials, then contingency, markup, bid, and profit", () => {
    const b = breakdown({
      materials: [
        {
          kind: "sqft",
          id: "s1",
          item: "Living room floor",
          length: 12,
          width: 14,
          pricePerSqFt: 5,
        },
        { kind: "qty", id: "m1", item: "Transition strip", quantity: 2, unit: "ea", unitCost: 18 },
      ],
      labor: [{ id: "l1", role: "Flooring installer", hours: 6, rate: 58 }],
      contingencyPct: 10,
      markupPct: 20,
    });
    // area 168 × $5 = 840, + $36 qty = $876 materials
    expect(b.materials).toBe(876);
    expect(b.labor).toBe(348);
    expect(b.direct).toBe(1224);
    expect(b.contingency).toBe(122.4);
    expect(b.costToComplete).toBe(1346.4);
    expect(b.markup).toBe(269.28);
    expect(b.bidTotal).toBe(1615.68);
    expect(b.profit).toBe(269.28);
    expect(b.marginPct).toBe(16.67);
  });

  it("treats invalid sq-ft sides as zero dollars", () => {
    const b = breakdown({
      materials: [
        { kind: "sqft", id: "s", item: "bad", length: -12, width: 14, pricePerSqFt: 5 },
        { kind: "sqft", id: "s2", item: "nan", length: Number.NaN, width: 10, pricePerSqFt: 5 },
      ],
      labor: [],
      contingencyPct: 0,
      markupPct: 0,
    });
    expect(b.materials).toBe(0);
    expect(b.bidTotal).toBe(0);
  });
});

describe("metric area lines", () => {
  it("computes m² = L×W and amount = area × $/m², then GST 15% on the bid", () => {
    const line = {
      kind: "area" as const,
      id: "r1",
      item: "Re-roof",
      length: 18,
      width: 12,
      unit: "m" as const,
      pricePerArea: 85,
    };
    expect(lineArea(line)).toBe(216);
    expect(areaAmount(line)).toBe(18360);
    expect(isAreaLine(line)).toBe(true);
    const b = breakdown({
      materials: [line],
      labor: [],
      contingencyPct: 0,
      markupPct: 0,
      gstPct: 15,
    });
    expect(b.materials).toBe(18360);
    expect(b.bidTotal).toBe(18360);
    expect(b.gst).toBe(2754);
    expect(b.totalIncGst).toBe(21114);
  });
});

describe("sqFtArea / sqFtAmount", () => {
  it("computes area as L×W and dollars as area × $/sf in plain code", () => {
    expect(sqFtArea({ length: 12, width: 14 })).toBe(168);
    expect(sqFtAmount({ kind: "sqft", id: "s", item: "room", length: 12, width: 14, pricePerSqFt: 10 })).toBe(1680);
    const bid = breakdown({
      materials: [{ kind: "sqft", id: "s", item: "room", length: 12, width: 14, pricePerSqFt: 10 }],
      labor: [],
      contingencyPct: 0,
      markupPct: 0,
    });
    expect(bid.materials).toBe(1680);
    expect(bid.bidTotal).toBe(1680);
    expect(sqFtAmount({ kind: "sqft", id: "s", item: "room", length: 12, width: 14, pricePerSqFt: 4.25 })).toBe(714);
    expect(sqFtArea({ length: 800, width: 1 })).toBe(800);
    expect(sqFtAmount({ kind: "sqft", id: "s", item: "floor", length: 800, width: 1, pricePerSqFt: 7.8 })).toBe(6240);
  });
});
