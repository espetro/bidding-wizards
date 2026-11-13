import type { LaborLine, MaterialLine } from "../../domain/estimate";
import type { JobInfo } from "../../domain/job";

export type Draft = {
  job: JobInfo;
  notes: string;
  materials: MaterialLine[];
  labor: LaborLine[];
  markupPct: number;
  contingencyPct: number;
  gstPct: number;
  targetMargin: number;
  overrunPct: number;
};

export const DRAFT_KEY = "bidding-wizards.draft.v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Returns the saved draft, or null when missing, corrupt or from an unknown shape. */
export function loadDraft(store: Store | null = defaultStore()): Draft | null {
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft> | null;
    if (!d || typeof d !== "object" || !Array.isArray(d.materials) || !Array.isArray(d.labor)) return null;
    const job: Partial<JobInfo> = d.job ?? {};
    return {
      job: { name: str(job.name), address: str(job.address), date: str(job.date) },
      notes: str(d.notes),
      materials: d.materials,
      labor: d.labor,
      markupPct: num(d.markupPct, 0),
      contingencyPct: num(d.contingencyPct, 0),
      gstPct: num(d.gstPct, 0),
      targetMargin: num(d.targetMargin, 15),
      overrunPct: num(d.overrunPct, 10),
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota or private mode: the bid still works, it just will not persist.
  }
}

export function clearDraft(store: Store | null = defaultStore()): void {
  try {
    store?.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
