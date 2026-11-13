import { describe, expect, it } from "vitest";
import { breakdown, emptyLabor, markupForMargin, marginAfterOverrun } from "./estimate";

describe("margin guard", () => {
  it("markup for a target margin round-trips through breakdown", () => {
    const labor = [{ ...emptyLabor(), hours: 10, rate: 100 }];
    const m = markupForMargin(20);
    expect(m).toBe(25);
    expect(breakdown({ materials: [], labor, contingencyPct: 0, markupPct: m }).marginPct).toBe(20);
  });
  it("overrun eats margin at a fixed bid price", () => {
    const labor = [{ ...emptyLabor(), hours: 10, rate: 100 }];
    const input = { materials: [], labor, contingencyPct: 0, markupPct: 25 };
    expect(marginAfterOverrun(input, 0)).toBe(20);
    expect(marginAfterOverrun(input, 10)).toBe(12);
  });
});

describe("GST", () => {
  it("adds GST on its own line and rolls to the GST-inclusive total; margin stays ex GST", () => {
    const labor = [{ ...emptyLabor(), hours: 10, rate: 100 }];
    const b = breakdown({ materials: [], labor, contingencyPct: 10, markupPct: 20, gstPct: 10 });
    expect(b.bidTotal).toBe(1320);
    expect(b.gst).toBe(132);
    expect(b.totalIncGst).toBe(1452);
    expect(b.marginPct).toBe(16.67);
  });
  it("defaults to 10% GST when unset; 0% is exempt", () => {
    const b = breakdown({ materials: [], labor: [{ ...emptyLabor(), hours: 1, rate: 50 }], contingencyPct: 0, markupPct: 0 });
    expect(b.gst).toBe(5);
    expect(b.totalIncGst).toBe(55);
    const exempt = breakdown({
      materials: [],
      labor: [{ ...emptyLabor(), hours: 1, rate: 50 }],
      contingencyPct: 0,
      markupPct: 0,
      gstPct: 0,
    });
    expect(exempt.gst).toBe(0);
    expect(exempt.totalIncGst).toBe(50);
  });
});
