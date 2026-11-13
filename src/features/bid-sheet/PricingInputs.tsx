import { parseNumber } from "../../shared/money";
import type { BidSheet } from "./useBidSheet";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400";

/** Contingency, tax and markup percentages. */
export function PricingInputs({ sheet }: { sheet: BidSheet }) {
  const { draft, set, market, t } = sheet;
  return (
    <section className="no-print grid gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
      <label className="text-sm">
        <span className={labelClass}>{t("Contingency % of direct")}</span>
        <input
          type="number"
          min={0}
          step="0.1"
          value={draft.contingencyPct}
          onChange={(e) => set("contingencyPct", parseNumber(e.target.value))}
          className={inputClass}
        />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className={labelClass}>
          {market.taxName} % ({market.chip})
        </span>
        <input
          type="number"
          min={0}
          step="0.5"
          value={draft.gstPct}
          onChange={(e) => set("gstPct", parseNumber(e.target.value))}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className={labelClass}>{t("Markup % of cost-to-complete")}</span>
        <input
          type="number"
          min={0}
          step="0.1"
          value={draft.markupPct}
          onChange={(e) => set("markupPct", parseNumber(e.target.value))}
          className={inputClass}
        />
      </label>
    </section>
  );
}
