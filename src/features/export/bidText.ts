import type { JobInfo } from "../../domain/job";
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
import { labelsForAreaUnit, type Market } from "../../domain/markets";
import { money, pct } from "../../shared/money";

/** Plain-text bid for pasting into an email or text message. Same math as the sheet. */
export function bidText(job: JobInfo, input: EstimateInput, loc: Market | boolean = false): string {
  const market = typeof loc === "object" ? loc : undefined;
  const $ = (n: number) => money(n, market?.currency ?? "USD", market?.locale ?? "en-US");
  const b = breakdown(input);
  const lines: string[] = [`BID: ${job.name || "Untitled job"}`];
  if (job.address) lines.push(`Address: ${job.address}`);
  if (job.date) lines.push(`Date: ${job.date}`);
  lines.push("");

  for (const m of input.materials) {
    if (!m.item && materialTotal(m) === 0) continue;
    const detail = isAreaPricedLine(m)
      ? (() => {
          const unit = loc === true && m.kind === "sqft" ? "m" : lineAreaUnit(m);
          const labels = labelsForAreaUnit(unit, market?.currency ?? "USD");
          const areaBit = `${m.length} x ${m.width} = ${lineArea(m)} ${labels.areaSuffix}`;
          return unit === "ft"
            ? `${areaBit} @ ${$(linePricePerArea(m))}`
            : `${areaBit} @ ${$(linePricePerArea(m))}/${labels.areaSuffix}`;
        })()
      : `${m.quantity} ${m.unit} @ ${$(m.unitCost)}`;
    lines.push(`- ${m.item || "Material"}: ${detail} = ${$(materialTotal(m))}`);
  }
  for (const l of input.labor) {
    if (!l.role && laborTotal(l) === 0) continue;
    lines.push(`- ${l.role || "Labor"}: ${l.hours} hrs @ ${$(l.rate)} = ${$(laborTotal(l))}`);
  }

  lines.push("");
  lines.push(`Materials: ${$(b.materials)}`);
  lines.push(`Labor: ${$(b.labor)}`);
  lines.push(`Contingency (${pct(input.contingencyPct)}): ${$(b.contingency)}`);
  lines.push(`Markup (${pct(input.markupPct)}): ${$(b.markup)}`);
  lines.push(`BID TOTAL (ex GST): ${$(b.bidTotal)}`);
  if (b.gst > 0) {
    lines.push(`GST (${pct(input.gstPct ?? 0)}): ${$(b.gst)}`);
    lines.push(`TOTAL INC GST: ${$(b.totalIncGst)}`);
  }
  lines.push(`Profit: ${$(b.profit)} | Margin: ${pct(b.marginPct)}`);
  lines.push("");
  lines.push("Bidding Wizards");
  return lines.join("\n");
}
