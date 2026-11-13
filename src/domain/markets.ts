/**
 * One object per market. Add UK VAT or CA HST later without forking the bid sheet.
 * Area math stays unit-agnostic; only labels, currency, and tax rate change.
 */
export type AreaUnit = "ft" | "m";

export type MarketId = "us" | "au" | "nz";

export type Market = {
  id: MarketId;
  label: string;
  /** Short chip on the estimator. */
  chip: string;
  locale: string;
  currency: string;
  taxName: string;
  taxPct: number;
  areaUnit: AreaUnit;
  lengthLabel: string;
  areaLabel: string;
  pricePerAreaLabel: string;
  exportUom: string;
  sampleName: string;
  sampleBrief: string;
};

export const SAMPLE_US_BATH = `Guest bath remodel. About 48 sq ft of subway tile on the walls, new vanity, toilet, and faucet. Paint the walls — figure 2 gallons. Occupied home, they still need the hall bath. Possible hidden water damage behind the tub surround.`;

export const SAMPLE_AU_DECK = `Composite deck 6 m x 4 m at A$180 per m², plus a new faucet. Occupied home.`;

/** Mereana (NZ roofer) — same area line type as US sq ft, metres + GST 15%. */
export const SAMPLE_NZ_REROOF = `Re-roof, 18 m x 12 m, NZ$85 per m²`;

export const MARKETS: Record<MarketId, Market> = {
  us: {
    id: "us",
    label: "United States",
    chip: "US · sq ft",
    locale: "en-US",
    currency: "USD",
    taxName: "Tax",
    taxPct: 0,
    areaUnit: "ft",
    lengthLabel: "ft",
    areaLabel: "sq ft",
    pricePerAreaLabel: "$/sf",
    exportUom: "SF",
    sampleName: "US bath",
    sampleBrief: SAMPLE_US_BATH,
  },
  au: {
    id: "au",
    label: "Australia",
    chip: "AU · GST 10%",
    locale: "en-AU",
    currency: "AUD",
    taxName: "GST",
    taxPct: 10,
    areaUnit: "m",
    lengthLabel: "m",
    areaLabel: "m²",
    pricePerAreaLabel: "$/m²",
    exportUom: "M2",
    sampleName: "AU deck",
    sampleBrief: SAMPLE_AU_DECK,
  },
  nz: {
    id: "nz",
    label: "New Zealand",
    chip: "NZ · GST 15%",
    locale: "en-NZ",
    currency: "NZD",
    taxName: "GST",
    taxPct: 15,
    areaUnit: "m",
    lengthLabel: "m",
    areaLabel: "m²",
    pricePerAreaLabel: "NZ$/m²",
    exportUom: "M2",
    sampleName: "NZ re-roof",
    sampleBrief: SAMPLE_NZ_REROOF,
  },
};

export const MARKET_LIST: Market[] = [MARKETS.nz, MARKETS.au, MARKETS.us];

/** Live demo opens on NZ metres so roofers are not greeted with sf / $/SF. */
export const DEFAULT_MARKET_ID: MarketId = "nz";

export function labelsForAreaUnit(unit: AreaUnit, currency = "NZD") {
  if (unit === "m") {
    const price =
      currency === "NZD" ? "NZ$/m²" : currency === "AUD" ? "A$/m²" : "$/m²";
    return {
      item: "Area item",
      length: "Length (m)",
      width: "Width (m)",
      area: "Area (m²)",
      areaSuffix: "m²",
      price,
      amount: "Amount",
    };
  }
  return {
    item: "Sq ft item",
    length: "Length (ft)",
    width: "Width (ft)",
    area: "Area (sq ft)",
    areaSuffix: "sq ft",
    price: "$/sf",
    amount: "Amount",
  };
}

export function isMarketId(v: string): v is MarketId {
  return v === "us" || v === "au" || v === "nz";
}

export function detectMarket(text: string): MarketId | undefined {
  const t = text.toLowerCase();
  if (/\bnz\$|\bnzd\b|new zealand|\bgst\s*15\b/.test(t)) return "nz";
  if (/\ba\$|\baud\b|\bgst\s*10\b/.test(t)) return "au";
  if (/\bus\$|\busd\b|\bsq\.?\s*ft\b|\bsqft\b/.test(t)) return "us";
  if (/\b\d+(?:\.\d+)?\s*m\b/.test(t) && /\b(re-?roof|colorsteel|coloursteel|longrun)\b/.test(t)) return "nz";
  return undefined;
}

/** Hash query: `#/bid?loc=nz&sample=1`. `market=` is accepted as an alias. */
export function marketFromSearchParams(params: URLSearchParams): MarketId | undefined {
  const v = (params.get("loc") ?? params.get("market") ?? "").toLowerCase();
  return isMarketId(v) ? v : undefined;
}

export function sampleFromSearchParams(params: URLSearchParams): boolean {
  const v = (params.get("sample") ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Browser language + timezone when the URL has no loc. URL always wins. */
export function inferMarket(language = "", timeZone = ""): MarketId {
  const l = language.toLowerCase();
  const z = timeZone;
  if (l.includes("-nz") || l === "mi" || z === "Pacific/Auckland") return "nz";
  if (l.includes("-au") || z.startsWith("Australia/")) return "au";
  if (l.includes("-us") || z.startsWith("America/")) return "us";
  return DEFAULT_MARKET_ID;
}

export function resolveMarket(
  params: URLSearchParams,
  language = "",
  timeZone = "",
): MarketId {
  return marketFromSearchParams(params) ?? inferMarket(language, timeZone);
}

export function bidSearch(id: MarketId, opts?: { sample?: boolean }): string {
  const p = new URLSearchParams();
  p.set("loc", id);
  if (opts?.sample) p.set("sample", "1");
  return `?${p.toString()}`;
}

export function bidHref(id: MarketId, opts?: { sample?: boolean }): string {
  return `#/bid${bidSearch(id, opts)}`;
}
