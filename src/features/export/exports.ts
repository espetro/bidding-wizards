import {
  breakdown,
  isAreaPricedLine,
  laborTotal,
  lineArea,
  lineAreaUnit,
  linePricePerArea,
  materialTotal,
  type EstimateInput,
} from "../../domain/estimate";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: (string | number)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
const n2 = (n: number) => n.toFixed(2);

/**
 * Procore budget import (CSV). One row per line item, cost type L/M/O.
 * Markup is profit and GST is tax, so neither is budget; contingency is.
 * ponytail: column names follow Procore's budget import template; confirm against your project's downloaded template.
 */
export function toProcoreBudgetCsv(input: EstimateInput, costCodePrefix = "01-"): string {
  const b = breakdown(input);
  const rows: (string | number)[][] = [["Cost Code", "Cost Type", "Description", "Quantity", "UOM", "Unit Cost", "Original Budget Amount"]];
  let i = 100;
  for (const m of input.materials) {
    if (!m.item && materialTotal(m) === 0) continue;
    const [qty, uom, unit] = isAreaPricedLine(m)
      ? [lineArea(m), lineAreaUnit(m) === "m" ? "M2" : "SF", linePricePerArea(m)]
      : [m.quantity, m.unit, m.unitCost];
    rows.push([`${costCodePrefix}${i++}`, "M", m.item, qty, uom, n2(unit), n2(materialTotal(m))]);
  }
  for (const l of input.labor) {
    if (!l.role && laborTotal(l) === 0) continue;
    rows.push([`${costCodePrefix}${i++}`, "L", l.role, l.hours, "HR", n2(l.rate), n2(laborTotal(l))]);
  }
  if (b.contingency > 0) rows.push([`${costCodePrefix}${i++}`, "O", "Contingency", 1, "LS", n2(b.contingency), n2(b.contingency)]);
  return csv(rows);
}

/**
 * QuickBooks Desktop IIF estimate (non-posting). Lines carry qty × price so job costing
 * can compare estimate vs actual per item. Items must exist in QuickBooks or it will prompt.
 */
export function toQuickBooksIif(input: EstimateInput, customer: string, date = new Date()): string {
  const b = breakdown(input);
  const d = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  const cust = customer.replace(/\t/g, " ") || "Customer";
  const lines: string[] = [
    "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
    "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tQNTY\tPRICE\tINVITEM\tMEMO",
    "!ENDTRNS",
    `TRNS\tESTIMATE\t${d}\tEstimates\t${cust}\t${n2(b.totalIncGst)}\tBidding Wizards estimate`,
  ];
  // Bid is cost × (1 + markup): spread markup and contingency into each line's price so line totals sum to the bid.
  const factor = b.direct > 0 ? b.bidTotal / b.direct : 1;
  const spl = (item: string, qty: number, price: number) =>
    lines.push(`SPL\tESTIMATE\t${d}\tEstimates\t\t${n2(-qty * price * factor)}\t${-qty}\t${n2(price * factor)}\t${item.replace(/\t/g, " ")}\t`);
  for (const m of input.materials) {
    if (materialTotal(m) === 0) continue;
    isAreaPricedLine(m)
      ? spl(m.item || "Material", lineArea(m), linePricePerArea(m))
      : spl(m.item || "Material", m.quantity, m.unitCost);
  }
  for (const l of input.labor) if (laborTotal(l) > 0) spl(l.role || "Labor", l.hours, l.rate);
  if (b.gst > 0) lines.push(`SPL\tESTIMATE\t${d}\tEstimates\t\t${n2(-b.gst)}\t-1\t${n2(b.gst)}\tGST\t`);
  lines.push("ENDTRNS");
  return lines.join("\r\n") + "\r\n";
}

export function download(name: string, body: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
