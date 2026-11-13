import { marginAfterOverrun, markupForMargin } from "../../domain/estimate";
import { parseNumber, pct } from "../../shared/money";
import { useT } from "./i18n";
import type { BidSheet } from "./useBidSheet";

/** Sticky totals aside: the breakdown plus the margin guard. */
export function BidSummary({ sheet }: { sheet: BidSheet }) {
  const { draft, input, totals, market, set, t, formatMoney: $ } = sheet;
  const es = market.lang === "es";
  return (
    <aside className="print-break h-fit rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-4">
      <h2 className="text-sm font-bold">{t("Bid breakdown")}</h2>
      <p className="mt-1 text-[11px] text-neutral-400">{t("Plain arithmetic. Not a model.")}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label={t("Materials")} value={$(totals.materials)} />
        <Row label={t("Labor")} value={$(totals.labor)} />
        <Row className="no-print" label={t("Contingency")} value={$(totals.contingency)} hint={`${pct(draft.contingencyPct)} ${es ? "del directo" : "of direct"}`} />
        <Row className="no-print" label={t("Markup")} value={$(totals.markup)} hint={`${pct(draft.markupPct)} ${es ? "del costo" : "of cost"}`} />
        <div className="border-t border-neutral-200 pt-2">
          <Row label={es ? `Total sin ${market.taxName}` : `Bid total (ex ${market.taxName})`} value={$(totals.bidTotal)} />
        </div>
        <Row label={market.taxName} value={$(totals.gst)} hint={`${pct(draft.gstPct)} ${es ? "del total" : "of bid"}`} />
        <div className="border-t border-neutral-200 pt-2">
          <Row label={es ? `Total con ${market.taxName}` : `Total inc ${market.taxName}`} value={$(totals.totalIncGst)} strong />
        </div>
        <Row className="no-print" label={t("Profit")} value={$(totals.profit)} />
        <Row className="no-print" label={t("Margin")} value={pct(totals.marginPct)} hint={t("profit ÷ bid")} />
      </dl>
      <MarginGuard
        marginPct={totals.marginPct}
        hasBid={totals.bidTotal > 0}
        target={draft.targetMargin}
        setTarget={(n) => set("targetMargin", n)}
        overrun={draft.overrunPct}
        setOverrun={(n) => set("overrunPct", n)}
        kept={marginAfterOverrun(input, draft.overrunPct)}
        onFix={() => set("markupPct", markupForMargin(draft.targetMargin))}
      />
    </aside>
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
  const t = useT();
  const es = t("Margin") !== "Margin";
  if (!p.hasBid) return null;
  const thin = p.marginPct < p.target;
  const underwater = p.kept < 0;
  return (
    <div className="no-print mt-4 space-y-3 border-t border-neutral-200 pt-3 text-sm">
      <div
        role="alert"
        className={`rounded-xl px-3 py-2 ${thin ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
      >
        <div className="font-bold">{thin ? t("Thin margin") : t("Margin at or above floor")}</div>
        <div className="text-xs">
          {es ? `${pct(p.marginPct)} contra su mínimo de ${pct(p.target)}.` : `${pct(p.marginPct)} vs your ${pct(p.target)} floor.`}
          {thin ? (es ? " Esta cotización sale abajo del margen que fijó." : " This bid goes out below the margin you set.") : ""}
        </div>
        {thin && (
          <button type="button" onClick={p.onFix} className="mt-2 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
            {es ? `Subir utilidad para llegar a ${pct(p.target)}` : `Raise markup to hit ${pct(p.target)}`}
          </button>
        )}
      </div>
      <div className={`rounded-xl px-3 py-2 text-xs ${underwater ? "bg-red-50 text-red-800" : "bg-neutral-50 text-neutral-700"}`}>
        {es ? "Si el costo sale " : "If cost runs "}<b>{p.overrun}%</b>{es ? " arriba con este precio, le queda " : " over at this price, you keep "}<b>{pct(p.kept)}</b>
        {underwater ? (es ? ": pierde dinero." : " — you lose money.") : "."}
        <div className="mt-1 text-[10px] text-neutral-400">{t("Contingency is a cushion, not a guarantee. This shows what overruns do to the price you send.")}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] uppercase tracking-wide text-neutral-400">
          {t("Margin floor %")}
          <input type="number" min={0} step="0.5" value={p.target} onChange={(e) => p.setTarget(parseNumber(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm text-neutral-900" />
        </label>
        <label className="text-[10px] uppercase tracking-wide text-neutral-400">
          {t("Overrun test %")}
          <input type="number" min={0} step="1" value={p.overrun} onChange={(e) => p.setOverrun(parseNumber(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm text-neutral-900" />
        </label>
      </div>
    </div>
  );
}
