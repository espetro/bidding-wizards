/**
 * One object per market. Add UK VAT or CA HST later without forking the bid sheet.
 * Area math stays unit-agnostic; only labels, currency, and tax rate change.
 */
export type AreaUnit = "ft" | "m";

export type MarketId = "us" | "au" | "nz" | "mx";

export type Market = {
  id: MarketId;
  /** UI language for the estimator. */
  lang: "en" | "es";
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

/** Frío Regio-style HVAC sub bid (sample data, not a real job). */
export const SAMPLE_MX_NAVE = `Nave industrial en Apodaca: 3 equipos paquete de 10 TR montados en techo, 120 m² de ducto galvanizado. Cuadrilla de 4 técnicos, 3 días en techo, 9 horas por día; 3 técnicos 2 días en piso.`;

export const MARKETS: Record<MarketId, Market> = {
  us: {
    id: "us",
    lang: "en",
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
    lang: "en",
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
    lang: "en",
    label: "New Zealand",
    chip: "NZ · GST 15%",
    locale: "en-US",
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
  mx: {
    id: "mx",
    lang: "es",
    label: "México",
    chip: "MX · IVA 16%",
    locale: "es-MX",
    currency: "MXN",
    taxName: "IVA",
    taxPct: 16,
    areaUnit: "m",
    lengthLabel: "m",
    areaLabel: "m²",
    pricePerAreaLabel: "$/m²",
    exportUom: "M2",
    sampleName: "Nave industrial (ejemplo)",
    sampleBrief: SAMPLE_MX_NAVE,
  },
};

/**
 * Sample lines for markets whose briefs the English reader can't parse yet (MX).
 * Illustrative prices only — not quotes from any real job.
 */
export function sampleLinesFor(id: MarketId) {
  if (id !== "mx") return undefined;
  return {
    materials: [
      { kind: "qty" as const, item: "Equipo paquete 10 TR", quantity: 3, unit: "pza", unitCost: 185000 },
      { kind: "area" as const, item: "Ducto galvanizado", length: 120, width: 1, unit: "m" as const, pricePerArea: 650 },
    ],
    labor: [
      { role: "Montaje en techo", crew: 4, days: 3, hoursPerDay: 9, rate: 180 },
      { role: "Instalación en piso", crew: 3, days: 2, hoursPerDay: 9, rate: 160 },
    ],
  };
}

export const MARKET_LIST: Market[] = [MARKETS.nz, MARKETS.au, MARKETS.us, MARKETS.mx];

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
  return v === "us" || v === "au" || v === "nz" || v === "mx";
}

export function detectMarket(text: string): MarketId | undefined {
  const t = text.toLowerCase();
  if (/\bmxn\b|\biva\b|\bpesos?\b|monterrey|nuevo le[oó]n|cuadrilla/.test(t)) return "mx";
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
  if (l.startsWith("es-mx") || ["America/Monterrey", "America/Mexico_City", "America/Matamoros", "America/Chihuahua", "America/Tijuana", "America/Cancun", "America/Merida", "America/Mazatlan", "America/Hermosillo"].includes(z)) return "mx";
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
