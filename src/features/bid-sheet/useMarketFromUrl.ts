import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MARKETS,
  inferMarket,
  marketFromSearchParams,
  resolveMarket,
  sampleFromSearchParams,
  type MarketId,
} from "../../domain/markets";

/** The market (?loc=) and sample flag (?sample=1) live in the URL so a bid link is shareable. */
export function useMarketFromUrl() {
  const [params, setParams] = useSearchParams();
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  const timeZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const marketId = resolveMarket(params, language, timeZone);
  const wantSample = sampleFromSearchParams(params);
  const market = MARKETS[marketId];

  function writeLoc(id: MarketId, replace = false, dropSample = false) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("loc", id);
        next.delete("market");
        if (dropSample) next.delete("sample");
        return next;
      },
      { replace },
    );
  }

  function markSample() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("loc", marketId);
      next.set("sample", "1");
      return next;
    });
  }

  // First visit without ?loc=: pin the inferred market into the URL.
  useEffect(() => {
    if (marketFromSearchParams(params)) return;
    writeLoc(inferMarket(language, timeZone), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { marketId, market, wantSample, writeLoc, markSample };
}
