import { describe, expect, it } from "vitest";
import { DRAFT_KEY, clearDraft, freshDraft, initialDraft, loadDraft, saveDraft, type Draft } from "./draft";
import { emptyLabor, emptyMaterial, isAreaPricedLine } from "../../domain/estimate";
import { MARKETS } from "../../domain/markets";

function memoryStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const draft = (): Draft => ({
  job: { name: "Guest bath", address: "14 Oak St", date: "2026-11-12" },
  notes: "tile",
  materials: [emptyMaterial()],
  labor: [emptyLabor()],
  markupPct: 20,
  contingencyPct: 8,
  gstPct: 10,
  targetMargin: 15,
  overrunPct: 10,
});

describe("draft persistence", () => {
  it("round-trips a draft", () => {
    const store = memoryStore();
    const d = draft();
    saveDraft(d, store);
    expect(loadDraft(store)).toEqual(d);
  });

  it("returns null when empty, corrupt or the wrong shape", () => {
    expect(loadDraft(memoryStore())).toBeNull();
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: "{not json" }))).toBeNull();
    expect(loadDraft(memoryStore({ [DRAFT_KEY]: JSON.stringify({ materials: "x" }) }))).toBeNull();
  });

  it("falls back to defaults for bad numbers and clears", () => {
    const store = memoryStore({ [DRAFT_KEY]: JSON.stringify({ materials: [], labor: [], markupPct: "20" }) });
    expect(loadDraft(store)?.markupPct).toBe(0);
    clearDraft(store);
    expect(loadDraft(store)).toBeNull();
  });

  it("survives a missing store", () => {
    expect(loadDraft(null)).toBeNull();
    expect(() => saveDraft(draft(), null)).not.toThrow();
  });
});

describe("initial draft", () => {
  const nz = MARKETS.nz;

  it("opens a fresh bid with the market's tax and an area line in its unit", () => {
    const d = initialDraft(null, nz, false);
    expect(d.gstPct).toBe(nz.taxPct);
    expect(d.materials).toHaveLength(1);
    expect(isAreaPricedLine(d.materials[0]!)).toBe(true);
    expect(d.labor).toHaveLength(1);
  });

  it("restores a saved draft and never with empty tables", () => {
    const saved = { ...draft(), materials: [], labor: [] };
    const d = initialDraft(saved, nz, false);
    expect(d.notes).toBe("tile");
    expect(d.markupPct).toBe(20);
    expect(d.materials).toHaveLength(1);
    expect(d.labor).toHaveLength(1);
  });

  it("a sample link drops the saved job but keeps the margin settings", () => {
    const saved = { ...draft(), targetMargin: 30, overrunPct: 25 };
    const d = initialDraft(saved, nz, true);
    expect(d.notes).toBe(nz.sampleBrief);
    expect(d.job.name).toBe("");
    expect([d.markupPct, d.contingencyPct]).toEqual([0, 0]);
    expect([d.targetMargin, d.overrunPct]).toEqual([30, 25]);
  });

  it("freshDraft uses the market tax", () => {
    expect(freshDraft(MARKETS.us).gstPct).toBe(MARKETS.us.taxPct);
  });
});
