import { describe, expect, it } from "vitest";
import { DRAFT_KEY, clearDraft, loadDraft, saveDraft, type Draft } from "./draft";
import { emptyLabor, emptyMaterial } from "../../domain/estimate";

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
