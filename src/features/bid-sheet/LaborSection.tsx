import { laborTotal } from "../../domain/estimate";
import { parseNumber } from "../../shared/money";
import { fieldClass, narrowFieldClass, tinyFieldClass } from "./fields";
import { crewFields, type BidSheet } from "./useBidSheet";

const CREW_KEYS = [
  ["crew", "Crew"],
  ["days", "Days"],
  ["hoursPerDay", "Hrs/day"],
] as const;

/** Crew lines: people × days × hours/day = hours, then × rate. */
export function LaborSection({ sheet }: { sheet: BidSheet }) {
  const { t, market, laborRows: rows } = sheet;
  return (
    <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">{t("Labor")}</h2>
        <button
          type="button"
          className="no-print text-xs font-semibold text-neutral-700 hover:text-black"
          onClick={rows.add}
        >
          {t("+ Add crew")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="pb-2 font-semibold">{t("Role")}</th>
              {CREW_KEYS.map(([key, label]) => (
                <th key={key} className="pb-2 font-semibold">
                  {t(label)}
                </th>
              ))}
              <th className="pb-2 font-semibold">{t("Hours")}</th>
              <th className="pb-2 font-semibold">{t("Rate")}</th>
              <th className="pb-2 text-right font-semibold">{t("Line")}</th>
              <th className="no-print w-10 pb-2" />
            </tr>
          </thead>
          <tbody>
            {sheet.draft.labor.map((row, i) => (
              <tr key={row.id} className="border-t border-neutral-100">
                <td className="py-1.5 pr-2">
                  <input
                    value={row.role}
                    onChange={(e) => rows.update(i, { role: e.target.value })}
                    className={fieldClass}
                    placeholder={t("Role")}
                  />
                </td>
                {CREW_KEYS.map(([key, label]) => (
                  <td key={key} className="py-1.5 pr-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={t(label)}
                      value={crewFields(row)[key]}
                      onChange={(e) => rows.updateCrew(i, key, parseNumber(e.target.value))}
                      className={tinyFieldClass}
                    />
                  </td>
                ))}
                <td className="py-1.5 pr-2 tabular-nums text-neutral-600">{row.hours.toLocaleString(market.locale)}</td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.rate}
                    onChange={(e) => rows.update(i, { rate: parseNumber(e.target.value) })}
                    className={narrowFieldClass}
                  />
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums">{sheet.formatMoney(laborTotal(row))}</td>
                <td className="no-print py-1.5 pl-2 text-right">
                  <button
                    type="button"
                    className="text-neutral-400 hover:text-red-600"
                    onClick={() => rows.remove(i)}
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
  );
}
