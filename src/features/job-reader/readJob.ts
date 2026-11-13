import {
  CATALOG,
  DEFAULT_CONTINGENCY,
  DEFAULT_MARKUP,
  OUT_OF_SCOPE,
  RISK_PHRASES,
  type CatalogEntry,
} from "../../domain/catalog";
import {
  emptyArea,
  emptyLabor,
  emptyMaterial,
  emptySqFt,
  isAreaPricedLine,
  materialQtyOrArea,
  type AreaPricedLine,
  type LaborLine,
  type MaterialLine,
} from "../../domain/estimate";
import { detectMarket, MARKETS, SAMPLE_US_BATH, type AreaUnit, type MarketId } from "../../domain/markets";

export const SAMPLE_JOB = SAMPLE_US_BATH;

const TRADE_HINTS = [
  "kitchen",
  "bath",
  "bathroom",
  "remodel",
  "renovation",
  "tile",
  "roof",
  "fence",
  "drywall",
  "paint",
  "plumber",
  "plumbing",
  "electrical",
  "electrician",
  "floor",
  "flooring",
  "deck",
  "concrete",
  "framing",
  "cabinet",
  "vanity",
  "hvac",
  "siding",
  "insulation",
  "countertop",
  "backsplash",
  "toilet",
  "shingle",
  "reroof",
  "re-roof",
  "carpenter",
];

const MATERIAL_TO_LABOR: Record<string, string> = {
  "subway-tile": "tile-setter",
  "porcelain-tile": "tile-setter",
  thinset: "tile-setter",
  drywall: "carpenter",
  "joint-compound": "carpenter",
  "lumber-2x4": "carpenter",
  plywood: "carpenter",
  "interior-paint": "painter",
  vanity: "plumber",
  toilet: "plumber",
  faucet: "plumber",
  "copper-pipe": "plumber",
  romex: "electrician",
  outlet: "electrician",
  "led-fixture": "electrician",
  hardwood: "flooring-installer",
  lvp: "flooring-installer",
  insulation: "laborer",
  shingles: "roofer",
  "metal-roof": "roofer",
  underlayment: "roofer",
  "fence-board": "carpenter",
  concrete: "concrete-finisher",
  countertop: "carpenter",
  cabinet: "carpenter",
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

export type ReadJobOk = {
  ok: true;
  materials: MaterialLine[];
  labor: LaborLine[];
  markupPct: number;
  contingencyPct: number;
  gstPct?: number;
  marketId?: MarketId;
  matched: string[];
  notes: string[];
};

export type ReadJobFail = {
  ok: false;
  reason: "empty" | "out_of_scope";
  message: string;
};

export type ReadJobResult = ReadJobOk | ReadJobFail;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/m[²2]/g, "m2")
    .replace(/nz\$/g, "nzd ")
    .replace(/a\$/g, "aud ")
    .replace(/us\$/g, "usd ")
    .replace(/[^a-z0-9./%\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function phraseHits(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function overlapScore(haystackTokens: string[], phrase: string): number {
  const words = tokens(phrase);
  if (words.length === 0) return 0;
  let hit = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    if (haystackTokens.includes(w)) hit += 1;
  }
  return hit / Math.max(1, words.filter((w) => w.length >= 3).length);
}

function extractQty(haystack: string, phrase: string, entry: CatalogEntry): number {
  const idx = haystack.indexOf(normalize(phrase));
  const windowStart = idx >= 0 ? Math.max(0, idx - 48) : 0;
  const window = haystack.slice(windowStart, idx >= 0 ? idx + phrase.length + 24 : haystack.length);

  const unitish =
    /(\d+(?:\.\d+)?)\s*(sq\s*ft|sqft|sf|m²|m2|sq\s*m|squares?|sq\b|ft|lf|hours?|hrs?|gal(?:lons?)?|sheets?|ea|each|cu\s*yd|yards?)/i;
  const m = window.match(unitish);
  if (m?.[1]) {
    const n = Number.parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) {
      if (entry.kind === "labor" && /days?/i.test(window)) return n * 8;
      return n;
    }
  }

  const leading = window.match(/(\d+(?:\.\d+)?)\s+(?:of\s+)?$/);
  if (leading?.[1]) {
    const n = Number.parseFloat(leading[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const words = window.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (w && w in WORD_NUMBERS) {
      const n = WORD_NUMBERS[w] ?? 0;
      if (entry.kind === "labor" && words.join(" ").includes("day")) return n * 8;
      return n;
    }
  }

  if (entry.kind === "labor") {
    const hours = haystack.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?)/);
    if (hours?.[1]) return Number.parseFloat(hours[1]);
    const days = haystack.match(/(\d+(?:\.\d+)?)\s*days?/);
    if (days?.[1]) return Number.parseFloat(days[1]) * 8;
    return 8;
  }

  switch (entry.unit) {
    case "sq ft":
    case "m²":
      return 40;
    case "gal":
      return 2;
    case "sheet":
      return 8;
    case "ft":
      return 25;
    case "lf":
      return 12;
    case "sq":
      return 15;
    case "cu yd":
      return 1;
    default:
      return 1;
  }
}

function laborHoursFor(entry: CatalogEntry, materials: MaterialLine[]): number {
  const related = materials.filter((line) => {
    const cat = CATALOG.find((c) => c.name === line.item);
    return cat ? MATERIAL_TO_LABOR[cat.id] === entry.id : false;
  });
  if (related.length === 0) return 8;
  const qty = related.reduce((s, l) => s + materialQtyOrArea(l), 0);
  if (entry.id === "tile-setter") return Math.max(8, Math.round(qty / 12));
  if (entry.id === "painter") return Math.max(6, Math.round(qty * 2));
  if (entry.id === "plumber") return Math.max(4, related.length * 3);
  if (entry.id === "electrician") return Math.max(4, Math.round(qty / 8) + 4);
  if (entry.id === "roofer") return Math.max(8, Math.round(qty * 1.5));
  if (entry.id === "flooring-installer") return Math.max(6, Math.round(qty / 20));
  return Math.max(6, Math.round(qty / 10));
}

function isOutOfScope(text: string): boolean {
  const t = tokens(text);
  const tradeHits = TRADE_HINTS.filter((h) => phraseHits(text, h)).length;
  let scopeHits = 0;
  for (const cluster of OUT_OF_SCOPE) {
    if (overlapScore(t, cluster) >= 0.4) scopeHits += 1;
  }
  if (scopeHits === 0) return false;
  return tradeHits === 0 || scopeHits > tradeHits;
}

const FT_AREA_UNIT = String.raw`(?:sq\.?\s*ft|sqft|square\s*feet|square\s*foot|\bsf\b)`;
const M_AREA_UNIT = String.raw`(?:m2|sq\.?\s*m|square\s*metres?|square\s*meters?)`;

const LOCATION_WORDS =
  /room|bedroom|bath|kitchen|garage|deck|patio|office|closet|hall|dining|living|floor|area|space|shed|shop|basement|attic|porch|foyer|laundry|mudroom|entry|roof/;

const LUMBER_CONTEXT = /stud|lumber|joist|beam|post|plywood|osb|sheet|board|dimensional|fencing/;

const LABEL_STOP = /^(?:and|with|plus|then|also|new|a|an|the|to|for|in|on|at|of|into|from)$/;

export type ParsedAreaPhrase = {
  item: string;
  length: number;
  width: number;
  unit: AreaUnit;
  pricePerArea?: number;
  start: number;
  end: number;
};

export type ParsedSqFtPhrase = {
  item: string;
  length: number;
  width: number;
  start: number;
  end: number;
};

function asSqFtPhrase(p: ParsedAreaPhrase): ParsedSqFtPhrase {
  return { item: p.item, length: p.length, width: p.width, start: p.start, end: p.end };
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\b(?:about|approx(?:imately)?|around|roughly)\b/g, " ")
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !LABEL_STOP.test(w))
    .slice(0, 6)
    .join(" ");
}

function looksLikeLumber(length: number, width: number, context: string, unit: AreaUnit): boolean {
  if (unit === "m") return false;
  if (LUMBER_CONTEXT.test(context)) return true;
  const a = Math.min(length, width);
  const b = Math.max(length, width);
  if (a <= 2 && b <= 12) return true;
  if (a === 4 && (b === 4 || b === 6 || b === 8) && !LOCATION_WORDS.test(context)) return true;
  return false;
}

function overlaps(used: Array<[number, number]>, start: number, end: number): boolean {
  return used.some(([a, b]) => start < b && end > a);
}

type PriceSpan = { start: number; end: number; price: number; unit: AreaUnit };

function parsePricePerAreaSpans(text: string): PriceSpan[] {
  const re =
    /(?:nzd|aud|usd|\$)?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)\s*(m2|sq\.?\s*m|square\s*metres?|square\s*meters?|sq\.?\s*ft|sqft|sf)/gi;
  const out: PriceSpan[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const price = Number.parseFloat(m[1] ?? "0");
    if (!Number.isFinite(price) || price <= 0) continue;
    const u = (m[2] ?? "").replace(/\s+/g, "");
    const unit: AreaUnit = /m2|sqm|squaremetre|squaremeter/.test(u) ? "m" : "ft";
    out.push({ start: m.index, end: m.index + m[0].length, price, unit });
  }
  return out;
}

function nearestPrice(prices: PriceSpan[], start: number, end: number, unit: AreaUnit): number | undefined {
  let best: PriceSpan | undefined;
  let bestDist = Infinity;
  for (const p of prices) {
    if (p.unit !== unit) continue;
    const dist = p.start >= end ? p.start - end : start >= p.end ? start - p.end : 0;
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best && bestDist < 80 ? best.price : undefined;
}

function labelAround(text: string, start: number, end: number, fallback: string): string {
  const before = text.slice(Math.max(0, start - 48), start).replace(/[\s,.:;-]+$/g, "");
  const beforeMatch = before.match(/([a-z][a-z0-9+-]{1,24}(?:\s+[a-z][a-z0-9+-]{1,24}){0,3})$/);
  const after = text.slice(end, end + 40).replace(/^[\s,.:;-]+/, "");
  const afterMatch = after.match(/^([a-z][a-z0-9+\-\s]{0,36}?)(?=\s+(?:\d|and|with|plus|nzd|aud|usd|,|;|\.|$)|$)/);
  const label = cleanLabel(beforeMatch?.[1] ?? afterMatch?.[1] ?? "");
  return titleCase(label) || fallback;
}

/**
 * L×W rooms in feet or metres, plus “N sq ft / N m² covering”.
 * Area-only phrases become length = N, width = 1 so amount still equals N × rate.
 */
export function parseAreaPhrases(raw: string): ParsedAreaPhrase[] {
  const text = normalize(raw);
  const used: Array<[number, number]> = [];
  const results: ParsedAreaPhrase[] = [];
  const prices = parsePricePerAreaSpans(text);

  const dimRe =
    /\b(\d+(?:\.\d+)?)\s*(m|metres?|meters?|'|ft|feet)?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(m|metres?|meters?|'|ft|feet)?/gi;
  let m: RegExpExecArray | null;
  while ((m = dimRe.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    const length = Number.parseFloat(m[1] ?? "0");
    const width = Number.parseFloat(m[3] ?? "0");
    if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) continue;
    const u1 = (m[2] ?? "").toLowerCase();
    const u2 = (m[4] ?? "").toLowerCase();
    const unit: AreaUnit =
      /^(m|metre|metres|meter|meters)$/.test(u1) || /^(m|metre|metres|meter|meters)$/.test(u2) ? "m" : "ft";
    const ctx = text.slice(Math.max(0, start - 16), Math.min(text.length, end + 28));
    if (looksLikeLumber(length, width, ctx, unit)) continue;
    if (overlaps(used, start, end)) continue;
    used.push([start, end]);
    results.push({
      item: labelAround(text, start, end, unit === "m" ? "Area work" : "Room"),
      length,
      width,
      unit,
      pricePerArea: nearestPrice(prices, start, end, unit),
      start,
      end,
    });
  }

  const collectAreaOnly = (unit: AreaUnit, unitRe: string, fallback: string) => {
    const areaAfter = new RegExp(
      String.raw`\b(\d+(?:\.\d+)?)\s*${unitRe}(?:\s+of)?(?:\s+([a-z]+(?:[ \-][a-z]+){0,2}))?`,
      "gi",
    );
    while ((m = areaAfter.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(used, start, end)) continue;
      const area = Number.parseFloat(m[1] ?? "0");
      if (!Number.isFinite(area) || area <= 0) continue;
      used.push([start, end]);
      const label = cleanLabel(m[2] ?? "");
      results.push({
        item: titleCase(label) || fallback,
        length: area,
        width: 1,
        unit,
        pricePerArea: nearestPrice(prices, start, end, unit),
        start,
        end,
      });
    }

    const areaBefore = new RegExp(String.raw`\b([a-z][a-z0-9+\-\s]{2,40}?)\s+(\d+(?:\.\d+)?)\s*${unitRe}`, "gi");
    while ((m = areaBefore.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(used, start, end)) continue;
      const area = Number.parseFloat(m[2] ?? "0");
      if (!Number.isFinite(area) || area <= 0) continue;
      const label = cleanLabel(m[1] ?? "");
      if (!label || TRADE_HINTS.every((h) => !label.includes(h) && !LOCATION_WORDS.test(label))) {
        if (!/(floor|tile|carpet|hardwood|vinyl|lvp|deck|patio|paint|drywall|insulation|sod|roof)/.test(label)) {
          continue;
        }
      }
      used.push([start, end]);
      results.push({
        item: titleCase(label) || fallback,
        length: area,
        width: 1,
        unit,
        pricePerArea: nearestPrice(prices, start, end, unit),
        start,
        end,
      });
    }
  };

  collectAreaOnly("ft", FT_AREA_UNIT, "Sq ft work");
  collectAreaOnly("m", M_AREA_UNIT, "Area work");
  return results;
}

export function parseSqFtPhrases(raw: string): ParsedSqFtPhrase[] {
  return parseAreaPhrases(raw)
    .filter((p) => p.unit === "ft")
    .map(asSqFtPhrase);
}

function maskSpans(text: string, spans: Array<{ start: number; end: number }>): string {
  if (spans.length === 0) return text;
  const chars = [...text];
  for (const { start, end } of spans) {
    for (let i = start; i < end && i < chars.length; i++) chars[i] = " ";
  }
  return chars.join("").replace(/\s+/g, " ").trim();
}

function catalogForAreaItem(item: string, unit: AreaUnit): CatalogEntry | undefined {
  const n = item.toLowerCase();
  const aliases: Record<string, string> = {
    flooring: "hardwood",
    floor: "hardwood",
    floors: "hardwood",
    tile: "subway-tile",
    "wall tile": "subway-tile",
    lvp: "lvp",
    "vinyl plank": "lvp",
    hardwood: "hardwood",
    insulation: "insulation",
    quartz: "countertop",
    countertop: "countertop",
    countertops: "countertop",
    "re-roof": "metal-roof",
    reroof: "metal-roof",
    roof: "metal-roof",
    roofing: "metal-roof",
    "metal roofing": "metal-roof",
  };
  const aliasId = Object.keys(aliases).find((k) => n === k || n.includes(k));
  if (aliasId) {
    const hit = CATALOG.find((c) => c.id === aliases[aliasId]);
    if (hit) {
      if (unit === "m" && hit.unit === "sq ft") {
        /* keep name, caller supplies price */
      }
      return hit;
    }
  }
  let best: CatalogEntry | undefined;
  let bestScore = 0;
  const wantUnit = unit === "m" ? "m²" : "sq ft";
  for (const entry of CATALOG) {
    if (entry.kind !== "material") continue;
    if (entry.unit !== wantUnit && entry.unit !== "sq ft" && entry.unit !== "m²") continue;
    for (const phrase of [...entry.phrases, entry.name.toLowerCase()]) {
      const p = phrase.toLowerCase();
      if (n.includes(p) || p.includes(n)) {
        const score = p.length + (entry.unit === wantUnit ? 20 : 0);
        if (score > bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

function areaCoversCatalog(entry: CatalogEntry, lines: AreaPricedLine[]): boolean {
  if (lines.length === 0) return false;
  const blob = lines.map((s) => s.item.toLowerCase()).join(" | ");
  const names = [entry.name, ...entry.phrases].map((s) => s.toLowerCase());
  if (names.some((n) => blob.includes(n))) return true;
  if (
    (entry.unit === "sq ft" || entry.unit === "m²" || entry.id === "shingles" || entry.id === "underlayment") &&
    names.some((n) => n.split(/\s+/).every((w) => w.length < 4 || blob.includes(w)))
  ) {
    return blob.length > 0 && names.some((n) => overlapScore(tokens(blob), n) >= 0.5);
  }
  if (entry.id === "shingles" && /roof|reroof|metal/.test(blob)) return true;
  return false;
}

function toAreaLine(parsed: ParsedAreaPhrase): AreaPricedLine {
  const cat = catalogForAreaItem(parsed.item, parsed.unit);
  const price = parsed.pricePerArea ?? cat?.defaultCost ?? 0;
  const item = cat?.name ?? parsed.item;
  if (parsed.unit === "m") {
    const line = emptyArea("m");
    line.item = item;
    line.length = parsed.length;
    line.width = parsed.width;
    line.pricePerArea = price;
    return line;
  }
  const line = emptySqFt();
  line.item = item;
  line.length = parsed.length;
  line.width = parsed.width;
  line.pricePerSqFt = price;
  return line;
}

/**
 * On-device catalog reader. Totals are never computed here — only line items
 * and percents. N-gram / phrase match against the trade catalog. MiniLM rerank
 * is optional and not loaded on this first cut so "Read this job" stays fast.
 */
export function readJob(raw: string): ReadJobResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, reason: "empty", message: "Paste a job brief first." };
  }

  const haystackFull = normalize(text);
  const areaParsed = parseAreaPhrases(haystackFull);
  const haystack = maskSpans(haystackFull, [...areaParsed, ...parsePricePerAreaSpans(haystackFull)]);

  if (isOutOfScope(haystackFull)) {
    return {
      ok: false,
      reason: "out_of_scope",
      message:
        "This reads like it isn't a trades job (software, legal, catering, medical, tax…). Wizbid only estimates construction work.",
    };
  }

  const areaLines = areaParsed.map(toAreaLine);
  const materials: MaterialLine[] = [...areaLines];
  const labor: LaborLine[] = [];
  const matched: string[] = areaLines.map((l) => l.item);
  const usedIds = new Set<string>();
  for (const line of areaLines) {
    const cat = CATALOG.find((c) => c.name === line.item);
    if (cat) usedIds.add(cat.id);
  }

  const ranked = CATALOG.map((entry) => {
    let best = 0;
    let bestPhrase = entry.phrases[0] ?? entry.name;
    for (const phrase of [...entry.phrases, entry.name]) {
      if (phraseHits(haystack, phrase)) {
        const score = tokens(phrase).length * 3 + phrase.length / 20;
        if (score > best) {
          best = score;
          bestPhrase = phrase;
        }
      }
    }
    return { entry, best, bestPhrase };
  })
    .filter((row) => row.best > 0)
    .sort((a, b) => b.best - a.best);

  for (const row of ranked) {
    if (usedIds.has(row.entry.id)) continue;
    if (areaCoversCatalog(row.entry, areaLines)) continue;
    usedIds.add(row.entry.id);
    matched.push(row.entry.name);
    const qty = extractQty(haystack, row.bestPhrase, row.entry);
    if (row.entry.kind === "material") {
      const line = emptyMaterial();
      line.item = row.entry.name;
      line.unit = row.entry.unit;
      line.unitCost = row.entry.defaultCost;
      line.quantity = qty;
      materials.push(line);
    } else {
      const line = emptyLabor();
      line.role = row.entry.name;
      line.rate = row.entry.defaultCost;
      line.hours = qty;
      labor.push(line);
    }
  }

  const quotedAreaOnly =
    areaParsed.some((p) => p.pricePerArea != null) &&
    materials.length > 0 &&
    materials.every(isAreaPricedLine);

  if (!quotedAreaOnly) {
    for (const mat of materials) {
      const cat = CATALOG.find((c) => c.name === mat.item);
      if (!cat) continue;
      const laborId = MATERIAL_TO_LABOR[cat.id];
      if (!laborId || usedIds.has(laborId)) continue;
      const laborCat = CATALOG.find((c) => c.id === laborId);
      if (!laborCat) continue;
      usedIds.add(laborId);
      matched.push(laborCat.name);
      const line = emptyLabor();
      line.role = laborCat.name;
      line.rate = laborCat.defaultCost;
      line.hours = laborHoursFor(laborCat, materials);
      labor.push(line);
    }
  }

  if (materials.length === 0 && labor.length === 0) {
    const tradeHits = TRADE_HINTS.filter((h) => phraseHits(haystack, h)).length;
    if (tradeHits === 0) {
      return {
        ok: false,
        reason: "out_of_scope",
        message:
          "Couldn't find trade materials or labor in that brief. Try naming the work (tile, paint, roof, fence…) and quantities.",
      };
    }
  }

  let markupPct = DEFAULT_MARKUP;
  let contingencyPct = DEFAULT_CONTINGENCY;
  const notes: string[] = [];
  const t = tokens(haystack);
  for (const risk of RISK_PHRASES) {
    if (overlapScore(t, risk.phrase) >= 0.35) {
      markupPct += risk.markupBump;
      contingencyPct += risk.contingencyBump;
      notes.push(`Risk bump from: “${risk.phrase.split(" ").slice(0, 4).join(" ")}…”`);
    }
  }

  if (materials.length === 0) {
    notes.push("No catalog materials matched — add lines by hand.");
  }
  if (areaLines.length) {
    notes.push("Area lines are on the bid (L×W×rate) — edit length, width, or price.");
  }
  if (quotedAreaOnly) {
    markupPct = 0;
    contingencyPct = 0;
    notes.push("Quoted area rate is the bid line. Tax sits on top — add markup only if that rate is cost.");
  }
  const marketId = detectMarket(text);
  const gstPct = marketId ? MARKETS[marketId].taxPct : undefined;
  if (labor.length === 0 && !quotedAreaOnly) {
    notes.push("No labor matched — add crew hours by hand.");
  }

  return {
    ok: true,
    materials,
    labor,
    markupPct,
    contingencyPct,
    gstPct,
    marketId,
    matched,
    notes,
  };
}

export function catalogByName(name: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase());
}
