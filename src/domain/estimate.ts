export type QtyMaterialLine = {
  kind: "qty";
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

import type { AreaUnit } from "./markets";

/** Bid line priced as length × width × $/sq ft (not a sidecar calculator). */
export type SqFtLine = {
  kind: "sqft";
  id: string;
  item: string;
  length: number;
  width: number;
  pricePerSqFt: number;
};

/** Same L×W×rate math as sq-ft, in metres / price per m² (or later, other units). */
export type AreaLine = {
  kind: "area";
  id: string;
  item: string;
  length: number;
  width: number;
  unit: AreaUnit;
  pricePerArea: number;
};

export type AreaPricedLine = SqFtLine | AreaLine;

export type MaterialLine = QtyMaterialLine | AreaPricedLine;

export type LaborLine = {
  id: string;
  role: string;
  hours: number;
  rate: number;
};

export type EstimateInput = {
  materials: MaterialLine[];
  labor: LaborLine[];
  /** Contingency as a percent of direct cost (materials + labor). */
  contingencyPct: number;
  /** Markup as a percent of cost-to-complete (direct + contingency). */
  markupPct: number;
  /** GST as a percent of the ex-GST bid (AU 10, NZ 15). Pass-through tax: not cost, not profit. */
  gstPct?: number;
};

export type EstimateBreakdown = {
  materials: number;
  labor: number;
  direct: number;
  contingency: number;
  costToComplete: number;
  markup: number;
  bidTotal: number;
  profit: number;
  marginPct: number;
  gst: number;
  totalIncGst: number;
};

function lineMoney(qty: number, unit: number): number {
  if (!Number.isFinite(qty) || !Number.isFinite(unit)) return 0;
  if (qty < 0 || unit < 0) return 0;
  return roundCents(qty * unit);
}

/** Area from L×W. Invalid or negative sides count as 0. Unit-agnostic. */
export function lineArea(line: Pick<AreaPricedLine, "length" | "width">): number {
  const { length, width } = line;
  if (!Number.isFinite(length) || !Number.isFinite(width)) return 0;
  if (length < 0 || width < 0) return 0;
  return length * width;
}

/** @deprecated use lineArea — same L×W. */
export function sqFtArea(line: Pick<SqFtLine, "length" | "width">): number {
  return lineArea(line);
}

export function linePricePerArea(line: AreaPricedLine): number {
  return line.kind === "sqft" ? line.pricePerSqFt : line.pricePerArea;
}

export function lineAreaUnit(line: AreaPricedLine): AreaUnit {
  return line.kind === "sqft" ? "ft" : line.unit;
}

/** Dollars for an area bid line: area × rate, rounded to cents. */
export function areaAmount(line: AreaPricedLine): number {
  return lineMoney(lineArea(line), linePricePerArea(line));
}

/** Dollars for a sq-ft bid line: area × $/sf, rounded to cents. */
export function sqFtAmount(line: SqFtLine): number {
  return areaAmount(line);
}

export function isSqFtLine(line: MaterialLine): line is SqFtLine {
  return line.kind === "sqft";
}

export function isAreaLine(line: MaterialLine): line is AreaLine {
  return line.kind === "area";
}

export function isAreaPricedLine(line: MaterialLine): line is AreaPricedLine {
  return line.kind === "sqft" || line.kind === "area";
}

export function materialTotal(line: MaterialLine): number {
  if (isAreaPricedLine(line)) return areaAmount(line);
  return lineMoney(line.quantity, line.unitCost);
}

/** Qty or derived area — used when labor hours scale with coverage. */
export function materialQtyOrArea(line: MaterialLine): number {
  if (isAreaPricedLine(line)) return lineArea(line);
  return Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 0;
}

export function laborTotal(line: LaborLine): number {
  return lineMoney(line.hours, line.rate);
}

export function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Stated rules, computed in plain code (never by a model):
 *
 * materials  = Σ qty × unit cost  +  Σ (L × W × rate)  (rate is $/sf or $/m²)
 * labor      = Σ hours × rate
 * direct     = materials + labor
 * contingency = direct × contingency%
 * cost       = direct + contingency
 * markup     = cost × markup%          ← dollars of profit
 * bid        = cost + markup
 * margin %   = markup / bid            ← profit as a share of the bid
 */
export function breakdown(input: EstimateInput): EstimateBreakdown {
  const materials = roundCents(input.materials.reduce((sum, line) => sum + materialTotal(line), 0));
  const labor = roundCents(input.labor.reduce((sum, line) => sum + laborTotal(line), 0));
  const direct = roundCents(materials + labor);
  const contingency = roundCents(direct * (clampPct(input.contingencyPct) / 100));
  const costToComplete = roundCents(direct + contingency);
  const markup = roundCents(costToComplete * (clampPct(input.markupPct) / 100));
  const bidTotal = roundCents(costToComplete + markup);
  const profit = markup;
  const marginPct = bidTotal > 0 ? roundCents((profit / bidTotal) * 100) : 0;
  const gst = roundCents(bidTotal * (clampPct(input.gstPct ?? 0) / 100));
  const totalIncGst = roundCents(bidTotal + gst);

  return {
    materials,
    labor,
    direct,
    contingency,
    costToComplete,
    markup,
    bidTotal,
    profit,
    marginPct,
    gst,
    totalIncGst,
  };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyMaterial(): QtyMaterialLine {
  return { kind: "qty", id: newId(), item: "", quantity: 1, unit: "ea", unitCost: 0 };
}

export function emptySqFt(): SqFtLine {
  return { kind: "sqft", id: newId(), item: "", length: 0, width: 0, pricePerSqFt: 0 };
}

export function emptyArea(unit: AreaUnit = "m"): AreaLine {
  return { kind: "area", id: newId(), item: "", length: 0, width: 0, unit, pricePerArea: 0 };
}

export function emptyAreaForUnit(unit: AreaUnit): AreaPricedLine {
  return unit === "ft" ? emptySqFt() : emptyArea("m");
}

export function emptyLabor(): LaborLine {
  return { id: newId(), role: "", hours: 1, rate: 0 };
}

/** Markup % needed so margin (markup ÷ bid) equals target %. m = t / (1 - t). */
export function markupForMargin(targetMarginPct: number): number {
  const t = clampPct(targetMarginPct) / 100;
  if (t >= 1) return Infinity;
  return roundCents((t / (1 - t)) * 100);
}

/** Margin kept if labor and materials overrun by the given %, bid price unchanged. */
export function marginAfterOverrun(input: EstimateInput, overrunPct: number): number {
  const b = breakdown(input);
  if (b.bidTotal <= 0) return 0;
  const realCost = b.direct * (1 + clampPct(overrunPct) / 100);
  return roundCents(((b.bidTotal - realCost) / b.bidTotal) * 100);
}
