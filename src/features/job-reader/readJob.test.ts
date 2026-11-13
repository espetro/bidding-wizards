import { describe, expect, it } from "vitest";
import { isAreaLine, isAreaPricedLine, isSqFtLine } from "../../domain/estimate";
import { SAMPLE_NZ_REROOF } from "../../domain/markets";
import { SAMPLE_JOB, parseAreaPhrases, parseSqFtPhrases, readJob } from "./readJob";

describe("readJob", () => {
  it("reads a guest-bath brief into catalog materials and implied labor", () => {
    const result = readJob(SAMPLE_JOB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const items = result.materials.map((m) => m.item);
    expect(items).toContain("Subway tile");
    expect(items).toContain("Bathroom vanity");
    expect(items).toContain("Toilet");
    expect(items).toContain("Faucet");
    expect(items).toContain("Interior paint");

    const tile = result.materials.find((m) => m.item === "Subway tile");
    expect(tile && isSqFtLine(tile)).toBe(true);
    if (tile && isSqFtLine(tile)) {
      expect(tile.length).toBe(48);
      expect(tile.width).toBe(1);
      expect(tile.pricePerSqFt).toBe(4.25);
    }

    const paint = result.materials.find((m) => m.item === "Interior paint");
    expect(paint && !isAreaPricedLine(paint) && paint.quantity).toBe(2);

    const roles = result.labor.map((l) => l.role);
    expect(roles).toContain("Tile setter");
    expect(roles).toContain("Plumber");
    expect(roles).toContain("Painter");

    expect(result.contingencyPct).toBeGreaterThan(8);
    expect(result.matched.length).toBeGreaterThan(3);
  });

  it("qualifies out non-trade jobs", () => {
    const result = readJob(
      "Build a SaaS website and mobile app for our wedding catering marketplace, plus the lawsuit against the florist.",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("out_of_scope");
  });

  it("rejects an empty brief", () => {
    const result = readJob("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty");
  });

  it("extracts roofing quantities from a roof brief", () => {
    const result = readJob("Tear off and reroof 22 squares of architectural shingles with ice and water underlayment.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.materials.some((m) => m.item === "Asphalt shingles")).toBe(true);
    const shingles = result.materials.find((m) => m.item === "Asphalt shingles");
    expect(shingles && !isAreaPricedLine(shingles) && shingles.quantity).toBe(22);
    expect(result.labor.some((l) => l.role === "Roofer")).toBe(true);
  });
});

describe("parseSqFtPhrases", () => {
  it("reads 12x14 room as length × width", () => {
    const parsed = parseSqFtPhrases("12x14 room");
    expect(parsed).toMatchObject([{ item: "Room", length: 12, width: 14 }]);
  });

  it("reads 12 by 14", () => {
    const parsed = parseSqFtPhrases("Install flooring in a 12 by 14 living room");
    expect(parsed.some((p) => p.length === 12 && p.width === 14)).toBe(true);
  });

  it("reads 800 sq ft flooring as area with width 1", () => {
    const parsed = parseSqFtPhrases("800 sq ft flooring");
    expect(parsed[0]).toMatchObject({ length: 800, width: 1 });
    expect(parsed[0]?.item.toLowerCase()).toContain("floor");
  });

  it("skips 2x4 lumber sizes", () => {
    expect(parseSqFtPhrases("Need 2x4 studs and 4x8 plywood sheets")).toEqual([]);
  });
});

describe("readJob metre area lines", () => {
  it("reads Mereana's NZ re-roof as L×W×NZ$/m² with GST 15%", () => {
    const result = readJob(SAMPLE_NZ_REROOF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const area = result.materials.find(isAreaLine);
    expect(area).toMatchObject({ length: 18, width: 12, unit: "m", pricePerArea: 85 });
    expect(result.marketId).toBe("nz");
    expect(result.gstPct).toBe(15);
    expect(result.markupPct).toBe(0);
    expect(result.contingencyPct).toBe(0);
    expect(result.labor).toEqual([]);
  });
});

describe("parseAreaPhrases", () => {
  it("reads 18 m x 12 m and NZ$85 per m²", () => {
    const parsed = parseAreaPhrases("Re-roof, 18 m x 12 m, NZ$85 per m²");
    expect(parsed.some((p) => p.length === 18 && p.width === 12 && p.unit === "m" && p.pricePerArea === 85)).toBe(true);
  });
});

describe("readJob sq-ft lines", () => {
  it("puts parsed rooms and coverings on the bid as sq-ft lines", () => {
    const result = readJob("12x14 room and 800 sq ft flooring, plus a new toilet.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sq = result.materials.filter(isSqFtLine);
    expect(sq.some((l) => l.length === 12 && l.width === 14)).toBe(true);
    const floor = sq.find((l) => l.length === 800 && l.width === 1);
    expect(floor).toBeTruthy();
    expect(floor?.pricePerSqFt).toBeGreaterThan(0);
    const toilet = result.materials.find((m) => !isAreaPricedLine(m) && m.item === "Toilet");
    expect(toilet && !isAreaPricedLine(toilet) && toilet.quantity).toBe(1);
  });
});

describe("metric briefs", () => {
  it("reads 12 x 8 m and 30 m2 as area lines", () => {
    const r = readJob("Roof 12 x 8 m colorbond reroof, plus 30 m² of floor tile in the bathroom");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const areas = r.materials.filter(isAreaPricedLine).map((l) => l.length * l.width).sort((a, b) => a - b);
    expect(areas).toEqual([30, 96]);
  });
});
