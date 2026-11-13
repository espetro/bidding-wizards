import {
  isAreaPricedLine,
  isSqFtLine,
  lineArea,
  lineAreaUnit,
  linePricePerArea,
  materialTotal,
  type AreaPricedLine,
  type QtyMaterialLine,
} from "../../domain/estimate";
import { labelsForAreaUnit } from "../../domain/markets";
import { parseNumber } from "../../shared/money";
import { fieldClass } from "./fields";
import { useT } from "./i18n";
import type { BidSheet } from "./useBidSheet";

/** Qty lines and area-priced lines in one list. */
export function MaterialsSection({ sheet }: { sheet: BidSheet }) {
  const { draft, market, formatMoney, t, materialRows: rows } = sheet;
  return (
    <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">{t("Materials")}</h2>
          <p className="text-[11px] text-neutral-400">
            Qty lines and area lines (L×W×{market.pricePerAreaLabel}) share this bid.
          </p>
        </div>
        <div className="no-print flex gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-neutral-700 hover:text-black"
            onClick={() => rows.add("qty")}
          >
            {t("+ Add item")}
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-neutral-700 hover:text-black"
            onClick={() => rows.add("area")}
          >
            {t("+ Add area")}
          </button>
        </div>
      </div>
      <div className="space-y-2 overflow-x-auto">
        {draft.materials.map((row, i) =>
          isAreaPricedLine(row) ? (
            <AreaPricedRow
              key={row.id}
              row={row}
              currency={market.currency}
              formatMoney={formatMoney}
              onChange={(next) => rows.update(i, next)}
              onRemove={() => rows.remove(i)}
            />
          ) : (
            <QtyRow
              key={row.id}
              row={row}
              formatMoney={formatMoney}
              onChange={(next) => rows.update(i, next)}
              onRemove={() => rows.remove(i)}
            />
          ),
        )}
      </div>
    </section>
  );
}

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
  const t = useT();
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(4.5rem,0.5fr))_minmax(5rem,0.6fr)_auto] items-center gap-1 rounded-xl border border-neutral-100 px-2 py-1 text-sm">
      <input
        value={row.item}
        onChange={(e) => onChange({ ...row, item: e.target.value })}
        className={fieldClass}
        placeholder={t("Item")}
        aria-label="Material item"
      />
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t("Qty")}</span>
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
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t("Unit")}</span>
        <input
          value={row.unit}
          onChange={(e) => onChange({ ...row, unit: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t("Unit cost")}</span>
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
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">{t("Line")}</div>
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
  const t = useT();
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(4.5rem,0.45fr))_minmax(5.5rem,0.55fr)_minmax(5.5rem,0.6fr)_auto] items-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/40 px-2 py-1 text-sm">
      <label className="flex min-w-0 flex-col">
        <span className="text-[10px] uppercase tracking-wide text-amber-800/70">{t(labels.item)}</span>
        <input
          value={row.item}
          onChange={(e) => onChange({ ...row, item: e.target.value })}
          className={fieldClass}
          placeholder={unit === "m" ? "Re-roof / deck" : "Room / flooring"}
          aria-label={t(labels.item)}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t(labels.length)}</span>
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
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t(labels.width)}</span>
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
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t(labels.area)}</span>
        <span className="px-2 py-1.5 tabular-nums text-neutral-800">
          {area.toLocaleString()} {t(labels.areaSuffix)}
        </span>
      </div>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">{t(labels.price)}</span>
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
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">{t(labels.amount)}</div>
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
