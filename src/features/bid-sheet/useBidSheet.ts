import { useEffect, useMemo, useState } from "react";
import {
  breakdown,
  crewHours,
  crewLabor,
  newId,
  emptyAreaForUnit,
  emptyLabor,
  emptyMaterial,
  type EstimateInput,
  type LaborLine,
  type MaterialLine,
} from "../../domain/estimate";
import { MARKETS, sampleLinesFor, type MarketId } from "../../domain/markets";
import { money } from "../../shared/money";
import { applyFormHints, processDocumentsClient, type BlueprintTakeoff } from "../documents";
import { bidText } from "../export";
import { readJob } from "../job-reader";
import { tFor } from "./i18n";
import { clearDraft, freshDraft, initialDraft, loadDraft, saveDraft, type Draft } from "./draft";
import { useMarketFromUrl } from "./useMarketFromUrl";

export type Status = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "err"; text: string };

type Update<T> = T | ((prev: T) => T);

/** Lines and pricing that a job read or a blueprint take-off replaces in one go. */
type Fill = Pick<Draft, "materials" | "labor" | "markupPct" | "contingencyPct"> & { notes?: string };

function replaceAt<T>(rows: T[], i: number, next: T): T[] {
  return rows.map((r, idx) => (idx === i ? next : r));
}

type CrewFields = { crew: number; days: number; hoursPerDay: number };

/** Crew view of a labor line. Lines read from a brief only have hours: treat them as 1 person × 1 day × hours. */
export function crewFields(l: LaborLine): CrewFields {
  if (l.crew !== undefined && l.days !== undefined && l.hoursPerDay !== undefined)
    return { crew: l.crew, days: l.days, hoursPerDay: l.hoursPerDay };
  return { crew: 1, days: 1, hoursPerDay: l.hours };
}

/** Removing the last row leaves one blank row so the table never disappears. */
function removeAt<T>(rows: T[], i: number, blank: () => T): T[] {
  return rows.length === 1 ? [blank()] : rows.filter((_, idx) => idx !== i);
}

/**
 * All state and actions of the bid sheet. Every persisted field lives in one Draft, so a
 * new field means: add it to Draft and freshDraft (draft.ts), then read it from `draft`.
 */
export function useBidSheet() {
  const loc = useMarketFromUrl();
  const { market, marketId, wantSample } = loc;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(loadDraft(), market, wantSample));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [reading, setReading] = useState(false);

  const formatMoney = (n: number) => money(n, market.currency, market.locale);
  const t = tFor(market.lang);

  const { materials, labor, markupPct, contingencyPct, gstPct } = draft;
  const input: EstimateInput = useMemo(
    () => ({ materials, labor, markupPct, contingencyPct, gstPct }),
    [materials, labor, markupPct, contingencyPct, gstPct],
  );
  const totals = useMemo(() => breakdown(input), [input]);

  // Persist the working bid so a refresh or accidental navigation does not lose it.
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  function set<K extends keyof Draft>(key: K, value: Update<Draft[K]>) {
    setDraft((d) => ({
      ...d,
      [key]: typeof value === "function" ? (value as (prev: Draft[K]) => Draft[K])(d[key]) : value,
    }));
  }

  function fill(next: Fill, blankMaterial: () => MaterialLine) {
    setDraft((d) => ({
      ...d,
      notes: next.notes ?? d.notes,
      materials: next.materials.length ? next.materials : [blankMaterial()],
      labor: next.labor.length ? next.labor : [emptyLabor()],
      markupPct: next.markupPct,
      contingencyPct: next.contingencyPct,
    }));
  }

  function newBid() {
    if (!window.confirm("Clear this bid and start a new one?")) return;
    clearDraft();
    // The margin floor and overrun test are the estimator's own settings, not the job's: keep them.
    setDraft((d) => ({ ...freshDraft(market), targetMargin: d.targetMargin, overrunPct: d.overrunPct }));
    setStatus({ kind: "idle" });
  }

  async function copyBid() {
    const text = bidText(draft.job, input, market);
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "ok", text: "Bid copied as plain text." });
    } catch {
      window.prompt("Copy your bid:", text);
    }
  }

  async function readNotes(text: string) {
    setReading(true);
    const result = readJob(text);
    if (!result.ok) {
      setReading(false);
      setStatus({ kind: "err", text: result.message });
      return;
    }
    const classified = await processDocumentsClient({ kind: "form", notes: text });
    const jev = classified.ok && !classified.mock;
    const unit = MARKETS[result.marketId ?? marketId].areaUnit;
    fill(
      {
        materials: result.materials,
        labor: result.labor,
        markupPct: result.markupPct,
        contingencyPct: jev ? applyFormHints(result.contingencyPct, classified.formHints) : result.contingencyPct,
      },
      () => emptyAreaForUnit(unit),
    );
    if (result.marketId) loc.writeLoc(result.marketId, false, true);
    else if (result.gstPct !== undefined) set("gstPct", result.gstPct);
    setReading(false);
    const extra = result.notes.length ? ` ${result.notes.join(" ")}` : "";
    const via = jev ? " Jev classified the form." : "";
    setStatus({
      kind: "ok",
      text: `Matched ${result.matched.join(", ") || "nothing yet"}.${extra}${via} Totals stay in the sheet — edit any line.`,
    });
  }

  /** MX sample: crew lines straight onto the sheet (the brief reader is English-only for now). */
  function applySampleLines(id: MarketId): boolean {
    const lines = sampleLinesFor(id);
    if (!lines) return false;
    setDraft((d) => ({
      ...d,
      materials: lines.materials.map((m) => ({ ...m, id: newId() })) as MaterialLine[],
      labor: lines.labor.map((l) => crewLabor(l.role, l.crew, l.days, l.hoursPerDay, l.rate)),
    }));
    setStatus({ kind: "ok", text: "Ejemplo cargado: mano de obra por cuadrilla (hombres × días × horas/día × tarifa). Edite cualquier renglón." });
    return true;
  }

  function loadSample() {
    const brief = MARKETS[marketId].sampleBrief;
    set("notes", brief);
    loc.markSample();
    if (!applySampleLines(marketId)) void readNotes(brief);
  }

  // Switching market resets the tax rate to that market's.
  useEffect(() => {
    setDraft((d) => ({ ...d, gstPct: MARKETS[marketId].taxPct }));
  }, [marketId]);

  // A ?sample=1 link reads the market's sample brief.
  useEffect(() => {
    if (!wantSample) return;
    const brief = MARKETS[marketId].sampleBrief;
    set("notes", brief);
    if (!applySampleLines(marketId)) void readNotes(brief);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, wantSample]);

  function applyTakeoff(takeoff: BlueprintTakeoff) {
    setReading(true);
    window.setTimeout(() => {
      fill({ ...takeoff, notes: takeoff.brief }, emptyMaterial);
      setReading(false);
      setStatus({
        kind: "ok",
        text: `${takeoff.title}: ${takeoff.matched.join(", ")}. ${takeoff.mock ? "Sample counts" : "Counts read from your PDF"} — edit any line before you send the bid.`,
      });
    }, 280);
  }

  const blankArea = () => emptyAreaForUnit(market.areaUnit);
  const materialRows = {
    add: (kind: "qty" | "area") => set("materials", (rows) => [...rows, kind === "qty" ? emptyMaterial() : blankArea()]),
    update: (i: number, next: MaterialLine) => set("materials", (rows) => replaceAt(rows, i, next)),
    remove: (i: number) => set("materials", (rows) => removeAt<MaterialLine>(rows, i, blankArea)),
  };

  const laborRows = {
    add: () => set("labor", (rows) => [...rows, crewLabor("", 1, 1, 8, 0)]),
    update: (i: number, patch: Partial<LaborLine>) =>
      set("labor", (rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))),
    /** Editing crew, days or hours/day recomputes the line's hours. */
    updateCrew: (i: number, key: keyof CrewFields, value: number) =>
      set("labor", (rows) =>
        rows.map((r, idx) => {
          if (idx !== i) return r;
          const f = { ...crewFields(r), [key]: value };
          return { ...r, ...f, hours: crewHours(f.crew, f.days, f.hoursPerDay) };
        }),
      ),
    remove: (i: number) => set("labor", (rows) => removeAt(rows, i, emptyLabor)),
  };

  return {
    draft,
    input,
    totals,
    status,
    reading,
    market,
    marketId,
    wantSample,
    formatMoney,
    t,
    set,
    materialRows,
    laborRows,
    newBid,
    copyBid,
    readNotes,
    loadSample,
    applyTakeoff,
  };
}

export type BidSheet = ReturnType<typeof useBidSheet>;
