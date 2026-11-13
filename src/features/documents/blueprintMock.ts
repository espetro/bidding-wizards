import { DEFAULT_CONTINGENCY, DEFAULT_MARKUP } from "../../domain/catalog";
import { emptyLabor, emptyMaterial, emptySqFt, newId, type LaborLine, type MaterialLine } from "../../domain/estimate";

/** File metadata the Pages-hosted UI can inspect without a server. */
export type BlueprintFileMeta = {
  name: string;
  size: number;
  type: string;
};

export type BlueprintTakeoff = {
  ok: true;
  mock: boolean;
  title: string;
  brief: string;
  pages: number;
  matched: string[];
  materials: MaterialLine[];
  labor: LaborLine[];
  markupPct: number;
  contingencyPct: number;
};

export type BlueprintTakeoffError = {
  ok: false;
  message: string;
};

export type BlueprintTakeoffResult = BlueprintTakeoff | BlueprintTakeoffError;

/** Sample electrical set — smaller take-off than a full architectural AI parse. */
export const SAMPLE_ELECTRICAL_BLUEPRINT: BlueprintFileMeta = {
  name: "Tallowwood-Electrical-E1.pdf",
  size: 186_400,
  type: "application/pdf",
};

export function isPdfBlueprint(file: BlueprintFileMeta): boolean {
  const name = file.name.trim().toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (type === "application/pdf" || type === "application/x-pdf") return true;
  return name.endsWith(".pdf");
}

/** Fake sheet count from file size so the demo can talk about pages. */
export function mockPageCount(size: number): number {
  if (!Number.isFinite(size) || size <= 0) return 1;
  return Math.max(1, Math.min(24, Math.ceil(size / 90_000)));
}

function qty(item: string, quantity: number, unit: string, unitCost: number): MaterialLine {
  return { ...emptyMaterial(), id: newId(), item, quantity, unit, unitCost };
}

function sqft(item: string, length: number, width: number, pricePerSqFt: number): MaterialLine {
  return { ...emptySqFt(), id: newId(), item, length, width, pricePerSqFt };
}

function crew(role: string, hours: number, rate: number): LaborLine {
  return { ...emptyLabor(), id: newId(), role, hours, rate };
}

export function electricalTakeoff(pages: number, filename: string, mock = true): BlueprintTakeoff {
  const via = mock ? "Mock take-off" : "Jev-routed take-off";
  return {
    ok: true,
    mock,
    title: mock ? "Electrical take-off (mock)" : "Electrical take-off (Jev)",
    brief: `${via} from ${filename} (${pages} sheet${pages === 1 ? "" : "s"}). Duplexes, GFCIs, cans, and 12/2 from a lighting & power plan.`,
    pages,
    matched: ["18 duplex receptacles", "4 GFCI", "12 LED cans", "420 ft 12/2", "200A panel"],
    materials: [
      qty("Duplex receptacle", 18, "ea", 8.5),
      qty("GFCI receptacle", 4, "ea", 18),
      qty("LED can light", 12, "ea", 95),
      qty("NM-B 12/2 Romex", 420, "ft", 1.15),
      qty("200A panel + breakers", 1, "ea", 620),
      sqft("Lighting coverage (E-1)", 22, 18, 2.4),
    ],
    labor: [crew("Electrician", 16, 95), crew("Helper", 8, 42)],
    markupPct: DEFAULT_MARKUP,
    contingencyPct: DEFAULT_CONTINGENCY + 2,
  };
}

/**
 * Client-side stand-in for PDF blueprint AI take-off.
 * GitHub Pages cannot run a parser; this fills a real bid sheet from canned counts.
 */
export function mockBlueprintTakeoff(file: BlueprintFileMeta): BlueprintTakeoffResult {
  const name = file.name.trim();
  if (!name) {
    return { ok: false, message: "Choose a PDF blueprint first." };
  }
  if (!isPdfBlueprint(file)) {
    return { ok: false, message: "Upload a PDF blueprint (.pdf). Other drawings wait for a server." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: "That PDF looks empty." };
  }

  const pages = mockPageCount(file.size);
  const lower = name.toLowerCase();

  return takeoffForKind(classifyBlueprintName(lower), pages, name, true);
}

export type BlueprintKind = "electrical" | "architectural";

export function classifyBlueprintName(lowerName: string): BlueprintKind {
  if (/\b(quantum|architectural|arch[-_ ]?set|floor[-_ ]?plan)\b/.test(lowerName)) {
    return "architectural";
  }
  return "electrical";
}

export function architecturalTakeoff(pages: number, filename: string, mock = true): BlueprintTakeoff {
  const via = mock ? "Mock first cut" : "Jev-routed first cut";
  return {
    ok: true,
    mock,
    title: mock ? "Architectural take-off (mock, deprioritized)" : "Architectural take-off (Jev)",
    brief: `${via} from ${filename}. Full quantity extraction is still canned; Jev only classifies the set.`,
    pages,
    matched: ["guest bath tile field", "vanity", "outlets"],
    materials: [
      sqft("Guest bath tile field", 8, 6, 4.25),
      qty("Bathroom vanity", 1, "ea", 420),
      qty("Duplex receptacle", 6, "ea", 8.5),
    ],
    labor: [crew("Tile setter", 6, 75), crew("Electrician", 4, 95)],
    markupPct: DEFAULT_MARKUP,
    contingencyPct: DEFAULT_CONTINGENCY,
  };
}

export function takeoffForKind(
  kind: BlueprintKind,
  pages: number,
  filename: string,
  mock: boolean,
): BlueprintTakeoff {
  return kind === "architectural"
    ? architecturalTakeoff(pages, filename, mock)
    : electricalTakeoff(pages, filename, mock);
}
