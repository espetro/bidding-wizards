import { DEFAULT_CONTINGENCY, DEFAULT_MARGIN_FLOOR, DEFAULT_MARKUP, DEFAULT_OVERRUN } from "../../domain/catalog";
import { emptyAreaForUnit, emptyLabor, type LaborLine, type MaterialLine } from "../../domain/estimate";
import { emptyJob, type JobInfo } from "../../domain/job";
import type { Market } from "../../domain/markets";

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

/** A blank bid for the market: one empty area line, default pricing, the market's tax rate. */
export function freshDraft(market: Market): Draft {
  return {
    job: emptyJob(),
    notes: "",
    materials: [emptyAreaForUnit(market.areaUnit)],
    labor: [emptyLabor()],
    markupPct: DEFAULT_MARKUP,
    contingencyPct: DEFAULT_CONTINGENCY,
    gstPct: market.taxPct,
    targetMargin: DEFAULT_MARGIN_FLOOR,
    overrunPct: DEFAULT_OVERRUN,
  };
}

/**
 * The draft the sheet opens with. A sample link ignores the saved job (zero markup and
 * contingency until the sample brief is read) but keeps the estimator's margin settings.
 * A saved draft is restored, never with empty tables.
 */
export function initialDraft(saved: Draft | null, market: Market, sample: boolean): Draft {
  const blankArea = () => emptyAreaForUnit(market.areaUnit);
  if (sample) {
    return {
      ...freshDraft(market),
      notes: market.sampleBrief,
      markupPct: 0,
      contingencyPct: 0,
      targetMargin: saved?.targetMargin ?? DEFAULT_MARGIN_FLOOR,
      overrunPct: saved?.overrunPct ?? DEFAULT_OVERRUN,
    };
  }
  if (!saved) return freshDraft(market);
  return {
    ...saved,
    materials: saved.materials.length ? saved.materials : [blankArea()],
    labor: saved.labor.length ? saved.labor : [emptyLabor()],
  };
}

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
      targetMargin: num(d.targetMargin, DEFAULT_MARGIN_FLOOR),
      overrunPct: num(d.overrunPct, DEFAULT_OVERRUN),
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
