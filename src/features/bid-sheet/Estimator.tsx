import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BlueprintUpload, applyFormHints, processDocumentsClient, type BlueprintTakeoff } from "../documents";
import { JobDetails } from "./JobDetails";
import { bidText, download, toProcoreBudgetCsv, toQuickBooksIif } from "../export";
import { clearDraft, loadDraft, saveDraft } from "./draft";
import { emptyJob, type JobInfo } from "../../domain/job";
import { DEFAULT_CONTINGENCY, DEFAULT_MARKUP } from "../../domain/catalog";
import {
  breakdown,
  emptyAreaForUnit,
  emptyLabor,
  emptyMaterial,
  isAreaPricedLine,
  isSqFtLine,
  laborTotal,
  lineArea,
  lineAreaUnit,
  linePricePerArea,
  marginAfterOverrun,
  markupForMargin,
  materialTotal,
  type AreaPricedLine,
  type LaborLine,
  type MaterialLine,
  type QtyMaterialLine,
} from "../../domain/estimate";
import {
  bidSearch,
  inferMarket,
  labelsForAreaUnit,
  MARKETS,
  MARKET_LIST,
  marketFromSearchParams,
  resolveMarket,
  sampleFromSearchParams,
  type MarketId,
} from "../../domain/markets";
import { money, parseNumber, pct } from "../../shared/money";
import { readJob } from "../job-reader";

type Status = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "err"; text: string };

export function Estimator() {
  const [params, setParams] = useSearchParams();
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  const timeZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const marketId = resolveMarket(params, language, timeZone);
  const wantSample = sampleFromSearchParams(params);
  const market = MARKETS[marketId];

  const [saved] = useState(loadDraft);
  const skipDraft = wantSample;
  const [job, setJob] = useState<JobInfo>(skipDraft ? emptyJob() : (saved?.job ?? emptyJob()));
  const [notes, setNotes] = useState(skipDraft ? market.sampleBrief : (saved?.notes ?? ""));
  const [materials, setMaterials] = useState<MaterialLine[]>(
    skipDraft ? [emptyAreaForUnit(market.areaUnit)] : saved?.materials.length ? saved.materials : [emptyAreaForUnit(market.areaUnit)],
  );
  const [labor, setLabor] = useState<LaborLine[]>(
    skipDraft ? [emptyLabor()] : saved?.labor.length ? saved.labor : [emptyLabor()],
  );
  const [markupPct, setMarkupPct] = useState(skipDraft ? 0 : (saved?.markupPct ?? DEFAULT_MARKUP));
  const [contingencyPct, setContingencyPct] = useState(skipDraft ? 0 : (saved?.contingencyPct ?? DEFAULT_CONTINGENCY));
  const [targetMargin, setTargetMargin] = useState(saved?.targetMargin ?? 15);
  const [gstPct, setGstPct] = useState(skipDraft ? market.taxPct : (saved?.gstPct ?? market.taxPct));
  const [overrunPct, setOverrunPct] = useState(saved?.overrunPct ?? 10);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [reading, setReading] = useState(false);
  const [copied, setCopied] = useState(false);

  const $ = (n: number) => money(n, market.currency, market.locale);

  const totals = useMemo(
    () => breakdown({ materials, labor, markupPct, contingencyPct, gstPct }),
    [materials, labor, markupPct, contingencyPct, gstPct],
  );

  function writeLoc(id: MarketId, replace = false, dropSample = false) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("loc", id);
        next.delete("market");
        if (dropSample) next.delete("sample");
        return next;
      },
      { replace },
    );
  }

  // Persist the working bid so a refresh or accidental navigation does not lose it.
  useEffect(() => {
    saveDraft({ job, notes, materials, labor, markupPct, contingencyPct, gstPct, targetMargin, overrunPct });
  }, [job, notes, materials, labor, markupPct, contingencyPct, gstPct, targetMargin, overrunPct]);

  function newBid() {
    if (!window.confirm("Clear this bid and start a new one?")) return;
    clearDraft();
    setJob(emptyJob());
    setNotes("");
    setMaterials([emptyAreaForUnit(market.areaUnit)]);
    setLabor([emptyLabor()]);
    setMarkupPct(DEFAULT_MARKUP);
    setContingencyPct(DEFAULT_CONTINGENCY);
    setGstPct(market.taxPct);
    setStatus({ kind: "idle" });
  }

  async function copyBid() {
    const text = bidText(job, { materials, labor, markupPct, contingencyPct, gstPct }, market);
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "ok", text: "Bid copied as plain text." });
    } catch {
      window.prompt("Copy your bid:", text);
    }
  }

  async function applyRead(text: string) {
    setReading(true);
    const result = readJob(text);
    if (!result.ok) {
      setReading(false);
      setStatus({ kind: "err", text: result.message });
      return;
    }
    const classified = await processDocumentsClient({ kind: "form", notes: text });
    const contingencyPct =
      classified.ok && !classified.mock
        ? applyFormHints(result.contingencyPct, classified.formHints)
        : result.contingencyPct;
    const unit = MARKETS[result.marketId ?? marketId].areaUnit;
    setMaterials(result.materials.length ? result.materials : [emptyAreaForUnit(unit)]);
    setLabor(result.labor.length ? result.labor : [emptyLabor()]);
    setMarkupPct(result.markupPct);
    setContingencyPct(contingencyPct);
    if (result.marketId) writeLoc(result.marketId, false, true);
    else if (result.gstPct !== undefined) setGstPct(result.gstPct);
    setReading(false);
    const extra = result.notes.length ? ` ${result.notes.join(" ")}` : "";
    const via = classified.ok && !classified.mock ? " Jev classified the form." : "";
    setStatus({
      kind: "ok",
      text: `Matched ${result.matched.join(", ") || "nothing yet"}.${extra}${via} Totals stay in the sheet — edit any line.`,
    });
  }

  function loadSample() {
    const brief = MARKETS[marketId].sampleBrief;
    setNotes(brief);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("loc", marketId);
      next.set("sample", "1");
      return next;
    });
    void applyRead(brief);
  }

  useEffect(() => {
    if (marketFromSearchParams(params)) return;
    writeLoc(inferMarket(language, timeZone), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setGstPct(MARKETS[marketId].taxPct);
  }, [marketId]);

  useEffect(() => {
    if (!wantSample) return;
    const brief = MARKETS[marketId].sampleBrief;
    setNotes(brief);
    void applyRead(brief);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, wantSample]);

  async function copyShareLink() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      window.prompt("Copy share link", href);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function applyTakeoff(takeoff: BlueprintTakeoff) {
    setReading(true);
    window.setTimeout(() => {
      setNotes(takeoff.brief);
      setMaterials(takeoff.materials.length ? takeoff.materials : [emptyMaterial()]);
      setLabor(takeoff.labor.length ? takeoff.labor : [emptyLabor()]);
      setMarkupPct(takeoff.markupPct);
      setContingencyPct(takeoff.contingencyPct);
      setReading(false);
      setStatus({
        kind: "ok",
        text: `${takeoff.title}: ${takeoff.matched.join(", ")}. ${takeoff.mock ? "Heuristic counts" : "Jev-routed counts"} — edit any line before you send the bid.`,
      });
    }, 280);
  }

  return (
    <div className="playful-root min-h-screen bg-[#FAFAFA] text-neutral-900">
      <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/70 px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FACC15] text-sm font-black text-neutral-950">
            W
          </span>
          <span className="text-sm font-bold tracking-tight">Bidding Wizards</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
            {MARKET_LIST.map((m) => (
              <Link
                key={m.id}
                to={{ pathname: "/bid", search: bidSearch(m.id, { sample: wantSample }) }}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                  marketId === m.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {m.chip}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={newBid}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            New bid
          </button>
          <button
            type="button"
            onClick={() => void copyBid()}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Copy bid
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Sample: {market.sampleName}
          </button>
          <button
            type="button"
            onClick={() => void copyShareLink()}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => download("procore-budget.csv", toProcoreBudgetCsv({ materials, labor, markupPct, contingencyPct, gstPct }), "text/csv")}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Procore budget
          </button>
          <button
            type="button"
            onClick={() => download("quickbooks-estimate.iif", toQuickBooksIif({ materials, labor, markupPct, contingencyPct, gstPct }, window.prompt("QuickBooks customer:job name", "Customer:Job") ?? ""))}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            QuickBooks
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#FACC15] px-3 py-2 text-xs font-bold text-neutral-950 hover:bg-[#EAB308]"
          >
            Print bid
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <JobDetails job={job} onChange={setJob} />
          <section className="no-print rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-black tracking-tight">Read this job</h1>
                <p className="mt-1 max-w-xl text-sm text-neutral-500">
                  Paste the work in your own words. The on-device catalog fills the sheet. You own the numbers after that.
                </p>
              </div>
              <button
                type="button"
                disabled={reading}
                onClick={() => void applyRead(notes)}
                className="rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-neutral-950 shadow-sm hover:bg-[#EAB308] disabled:opacity-60"
              >
                {reading ? "Reading…" : "Read this job"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. Re-roof, 18 m x 12 m, NZ$85 per m²"
              className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
            {status.kind !== "idle" && (
              <p
                className={`mt-3 text-sm ${status.kind === "err" ? "font-medium text-red-600" : "text-neutral-600"}`}
                role="status"
              >
                {status.text}
              </p>
            )}
          </section>

          <BlueprintUpload busy={reading} onTakeoff={applyTakeoff} />

          <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">Materials</h2>
                <p className="text-[11px] text-neutral-400">
                  Qty lines and area lines (L×W×{market.pricePerAreaLabel}) share this bid.
                </p>
              </div>
              <div className="no-print flex gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-neutral-700 hover:text-black"
                  onClick={() => setMaterials((rows) => [...rows, emptyMaterial()])}
                >
                  + Add item
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-neutral-700 hover:text-black"
                  onClick={() => setMaterials((rows) => [...rows, emptyAreaForUnit(market.areaUnit)])}
                >
                  + Add area
                </button>
              </div>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {materials.map((row, i) =>
                isAreaPricedLine(row) ? (
                  <AreaPricedRow
                    key={row.id}
                    row={row}
                    currency={market.currency}
                    formatMoney={$}
                    onChange={(next) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
                    onRemove={() =>
                      setMaterials((rows) =>
                        rows.length === 1 ? [emptyAreaForUnit(market.areaUnit)] : rows.filter((_, idx) => idx !== i),
                      )
                    }
                  />
                ) : (
                  <QtyRow
                    key={row.id}
                    row={row}
                    formatMoney={$}
                    onChange={(next) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
                    onRemove={() =>
                      setMaterials((rows) =>
                        rows.length === 1 ? [emptyAreaForUnit(market.areaUnit)] : rows.filter((_, idx) => idx !== i),
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>

          <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Labor</h2>
              <button
                type="button"
                className="no-print text-xs font-semibold text-neutral-700 hover:text-black"
                onClick={() => setLabor((rows) => [...rows, emptyLabor()])}
              >
                + Add crew
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">Hours</th>
                    <th className="pb-2 font-semibold">Rate</th>
                    <th className="pb-2 text-right font-semibold">Line</th>
                    <th className="no-print w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {labor.map((row, i) => (
                    <tr key={row.id} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-2">
                        <input
                          value={row.role}
                          onChange={(e) =>
                            setLabor((rows) => rows.map((r, idx) => (idx === i ? { ...r, role: e.target.value } : r)))
                          }
                          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                          placeholder="Role"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.hours}
                          onChange={(e) =>
                            setLabor((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, hours: parseNumber(e.target.value) } : r)),
                            )
                          }
                          className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            setLabor((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, rate: parseNumber(e.target.value) } : r)),
                            )
                          }
                          className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{$(laborTotal(row))}</td>
                      <td className="no-print py-1.5 pl-2 text-right">
                        <button
                          type="button"
                          className="text-neutral-400 hover:text-red-600"
                          onClick={() =>
                            setLabor((rows) => (rows.length === 1 ? [emptyLabor()] : rows.filter((_, idx) => idx !== i)))
                          }
                          aria-label="Remove labor"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="no-print grid gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Contingency % of direct
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={contingencyPct}
                onChange={(e) => setContingencyPct(parseNumber(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {market.taxName} % ({market.chip})
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={gstPct}
                onChange={(e) => setGstPct(parseNumber(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Markup % of cost-to-complete
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={markupPct}
                onChange={(e) => setMarkupPct(parseNumber(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none"
              />
            </label>
          </section>
        </div>

        <aside className="print-break h-fit rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-bold">Bid breakdown</h2>
          <p className="mt-1 text-[11px] text-neutral-400">Plain arithmetic. Not a model.</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Materials" value={$(totals.materials)} />
            <Row label="Labor" value={$(totals.labor)} />
            <Row className="no-print" label="Contingency" value={$(totals.contingency)} hint={`${pct(contingencyPct)} of direct`} />
            <Row className="no-print" label="Markup" value={$(totals.markup)} hint={`${pct(markupPct)} of cost`} />
            <div className="border-t border-neutral-200 pt-2">
              <Row label={`Bid total (ex ${market.taxName})`} value={$(totals.bidTotal)} />
            </div>
            <Row label={market.taxName} value={$(totals.gst)} hint={`${pct(gstPct)} of bid`} />
            <div className="border-t border-neutral-200 pt-2">
              <Row label={`Total inc ${market.taxName}`} value={$(totals.totalIncGst)} strong />
            </div>
            <Row className="no-print" label="Profit" value={$(totals.profit)} />
            <Row className="no-print" label="Margin" value={pct(totals.marginPct)} hint="profit ÷ bid" />
          </dl>
          <MarginGuard
            marginPct={totals.marginPct}
            hasBid={totals.bidTotal > 0}
            target={targetMargin}
            setTarget={setTargetMargin}
            overrun={overrunPct}
            setOverrun={setOverrunPct}
            kept={marginAfterOverrun({ materials, labor, markupPct, contingencyPct }, overrunPct)}
            onFix={() => setMarkupPct(markupForMargin(targetMargin))}
          />
          <dl className="hidden">
          </dl>
        </aside>
      </main>

      <footer className="border-t border-neutral-200/70 px-4 py-5 text-center text-xs text-neutral-400 sm:px-8">
        Bidding Wizards
        <span className="no-print">
          {" · "}
          <a href="./bidbench.html" className="underline-offset-2 hover:underline">
            Classic BidBench
          </a>
        </span>
      </footer>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none";

function QtyRow({
  row,
  onChange,
  onRemove,
  formatMoney,
}: {
  row: QtyMaterialLine;
  onChange: (next: QtyMaterialLine) => void;
  onRemove: () => void;
  formatMoney: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(4.5rem,0.5fr))_minmax(5rem,0.6fr)_auto] items-center gap-1 rounded-xl border border-neutral-100 px-2 py-1 text-sm">
      <input
        value={row.item}
        onChange={(e) => onChange({ ...row, item: e.target.value })}
        className={fieldClass}
        placeholder="Item"
        aria-label="Material item"
      />
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Qty</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Unit</span>
        <input
          value={row.unit}
          onChange={(e) => onChange({ ...row, unit: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Unit cost</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={row.unitCost}
          onChange={(e) => onChange({ ...row, unitCost: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">Line</div>
        <div className="font-medium tabular-nums">{formatMoney(materialTotal(row))}</div>
      </div>
      <button
        type="button"
        className="no-print px-1 text-neutral-400 hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove material"
      >
        ×
      </button>
    </div>
  );
}

function AreaPricedRow({
  row,
  onChange,
  onRemove,
  currency,
  formatMoney,
}: {
  row: AreaPricedLine;
  onChange: (next: AreaPricedLine) => void;
  onRemove: () => void;
  currency: string;
  formatMoney: (n: number) => string;
}) {
  const unit = lineAreaUnit(row);
  const labels = labelsForAreaUnit(unit, currency);
  const area = lineArea(row);
  const price = linePricePerArea(row);
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(4.5rem,0.45fr))_minmax(5.5rem,0.55fr)_minmax(5.5rem,0.6fr)_auto] items-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/40 px-2 py-1 text-sm">
      <label className="flex min-w-0 flex-col">
        <span className="text-[10px] uppercase tracking-wide text-amber-800/70">{labels.item}</span>
        <input
          value={row.item}
          onChange={(e) => onChange({ ...row, item: e.target.value })}
          className={fieldClass}
          placeholder={unit === "m" ? "Re-roof / deck" : "Room / flooring"}
          aria-label={labels.item}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{labels.length}</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.length}
          onChange={(e) => onChange({ ...row, length: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{labels.width}</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.width}
          onChange={(e) => onChange({ ...row, width: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{labels.area}</span>
        <span className="px-2 py-1.5 tabular-nums text-neutral-800">
          {area.toLocaleString()} {labels.areaSuffix}
        </span>
      </div>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{labels.price}</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => {
            const next = parseNumber(e.target.value);
            onChange(isSqFtLine(row) ? { ...row, pricePerSqFt: next } : { ...row, pricePerArea: next });
          }}
          className={fieldClass}
        />
      </label>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">{labels.amount}</div>
        <div className="font-medium tabular-nums">{formatMoney(materialTotal(row))}</div>
      </div>
      <button
        type="button"
        className="no-print px-1 text-neutral-400 hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove area line"
      >
        ×
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className ?? ""}`}>
      <dt className="text-neutral-500">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-neutral-400">{hint}</span> : null}
      </dt>
      <dd className={`tabular-nums ${strong ? "text-base font-black" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

function MarginGuard(p: {
  marginPct: number;
  hasBid: boolean;
  target: number;
  setTarget: (n: number) => void;
  overrun: number;
  setOverrun: (n: number) => void;
  kept: number;
  onFix: () => void;
}) {
  if (!p.hasBid) return null;
  const thin = p.marginPct < p.target;
  const underwater = p.kept < 0;
  return (
    <div className="no-print mt-4 space-y-3 border-t border-neutral-200 pt-3 text-sm">
      <div
        role="alert"
        className={`rounded-xl px-3 py-2 ${thin ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
      >
        <div className="font-bold">{thin ? "Thin margin" : "Margin at or above floor"}</div>
        <div className="text-xs">
          {pct(p.marginPct)} vs your {pct(p.target)} floor.
          {thin ? " This bid goes out below the margin you set." : ""}
        </div>
        {thin && (
          <button type="button" onClick={p.onFix} className="mt-2 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
            Raise markup to hit {pct(p.target)}
          </button>
        )}
      </div>
      <div className={`rounded-xl px-3 py-2 text-xs ${underwater ? "bg-red-50 text-red-800" : "bg-neutral-50 text-neutral-700"}`}>
        If cost runs <b>{p.overrun}%</b> over at this price, you keep <b>{pct(p.kept)}</b>
        {underwater ? " — you lose money." : "."}
        <div className="mt-1 text-[10px] text-neutral-400">Contingency is a cushion, not a guarantee. This shows what overruns do to the price you send.</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] uppercase tracking-wide text-neutral-400">
          Margin floor %
          <input type="number" min={0} step="0.5" value={p.target} onChange={(e) => p.setTarget(parseNumber(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm text-neutral-900" />
        </label>
        <label className="text-[10px] uppercase tracking-wide text-neutral-400">
          Overrun test %
          <input type="number" min={0} step="1" value={p.overrun} onChange={(e) => p.setOverrun(parseNumber(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm text-neutral-900" />
        </label>
      </div>
    </div>
  );
}
