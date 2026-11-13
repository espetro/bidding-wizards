import { describe, expect, it } from "vitest";
import { money } from "../shared/money";
import {
  DEFAULT_MARKET_ID,
  bidHref,
  detectMarket,
  inferMarket,
  labelsForAreaUnit,
  marketFromSearchParams,
  MARKETS,
  resolveMarket,
  sampleFromSearchParams,
} from "./markets";

describe("markets", () => {
  it("detects NZ from Mereana's brief and formats NZD", () => {
    expect(detectMarket("Re-roof, 18 m x 12 m, NZ$85 per m²")).toBe("nz");
    expect(MARKETS.nz.taxPct).toBe(15);
    expect(MARKETS.nz.currency).toBe("NZD");
    expect(money(85, "NZD", MARKETS.nz.locale)).toBe("NZ$85.00");
    expect(money(18360, "NZD", "en-NZ")).toMatch(/18,360/);
  });

  it("detects AU from A$ and US from sq ft", () => {
    expect(detectMarket("Composite deck 6 m x 4 m at A$180 per m²")).toBe("au");
    expect(detectMarket("Guest bath 48 sq ft subway tile")).toBe("us");
  });

  it("defaults the live demo to NZ metres, never sf labels", () => {
    expect(DEFAULT_MARKET_ID).toBe("nz");
    const labels = labelsForAreaUnit("m", "NZD");
    expect(labels.areaSuffix).toBe("m²");
    expect(labels.price).toBe("NZ$/m²");
    expect(labels.length).toContain("(m)");
  });

  it("reads loc from URL search and infers from language/timezone", () => {
    expect(marketFromSearchParams(new URLSearchParams("loc=nz"))).toBe("nz");
    expect(marketFromSearchParams(new URLSearchParams("market=au"))).toBe("au");
    expect(sampleFromSearchParams(new URLSearchParams("sample=1"))).toBe(true);
    expect(inferMarket("en-NZ", "UTC")).toBe("nz");
    expect(inferMarket("en-US", "America/Chicago")).toBe("us");
    expect(resolveMarket(new URLSearchParams(""), "en-AU", "Australia/Sydney")).toBe("au");
    expect(resolveMarket(new URLSearchParams("loc=nz"), "en-US", "America/New_York")).toBe("nz");
    expect(bidHref("nz", { sample: true })).toBe("#/bid?loc=nz&sample=1");
  });
});
