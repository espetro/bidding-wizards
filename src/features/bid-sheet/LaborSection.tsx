import { laborTotal } from "../../domain/estimate";
import { parseNumber } from "../../shared/money";
import { fieldClass, narrowFieldClass } from "./fields";
import type { BidSheet } from "./useBidSheet";

export function LaborSection({ sheet }: { sheet: BidSheet }) {
  const rows = sheet.laborRows;
  return (
    <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Labor</h2>
        <button
          type="button"
          className="no-print text-xs font-semibold text-neutral-700 hover:text-black"
          onClick={rows.add}
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
            {sheet.draft.labor.map((row, i) => (
              <tr key={row.id} className="border-t border-neutral-100">
                <td className="py-1.5 pr-2">
                  <input
                    value={row.role}
                    onChange={(e) => rows.update(i, { role: e.target.value })}
                    className={fieldClass}
                    placeholder="Role"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.hours}
                    onChange={(e) => rows.update(i, { hours: parseNumber(e.target.value) })}
                    className={narrowFieldClass}
                  />
                </td>
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
