import { describe, expect, it } from "vitest";
import { SAMPLE_ELECTRICAL_BLUEPRINT } from "./blueprintMock";
import {
  applyFormHints,
  assembleDocumentsResult,
  decisionFromJevAnswers,
  heuristicDecision,
  localDocumentsResult,
} from "./documentDecision";

describe("heuristicDecision", () => {
  it("treats the Tallowwood sample as an electrical plan", () => {
    const d = heuristicDecision({ kind: "document", file: SAMPLE_ELECTRICAL_BLUEPRINT });
    expect(d.documentKind).toBe("electrical_plan");
    expect(d.isBidForm).toBe(false);
    expect(d.source).toBe("heuristic");
  });

  it("treats pasted notes as a bid form and flags occupied risk", () => {
    const d = heuristicDecision({
      kind: "form",
      notes: "Occupied house — possible hidden water damage behind the tub. Guest bath remodel.",
    });
    expect(d.isBidForm).toBe(true);
    expect(d.hiddenConditions).toBe(true);
    expect(d.isTradeDocument).toBe(true);
  });
});

describe("decisionFromJevAnswers", () => {
  it("maps Jev choice/boolean/score into a document decision", () => {
    const d = decisionFromJevAnswers({
      documentKind: { type: "choice", choice: "electrical_plan", probabilities: { electrical_plan: 0.9 } },
      isTradeDocument: { type: "boolean", probability: 0.92 },
      hiddenConditions: { type: "boolean", probability: 0.2 },
      completeness: { type: "score", score: 1.4 },
      isBidForm: { type: "boolean", probability: 0.05 },
    });
    expect(d.source).toBe("jev");
    expect(d.documentKind).toBe("electrical_plan");
    expect(d.isTradeDocument).toBe(true);
    expect(d.hiddenConditions).toBe(false);
  });
});

describe("assembleDocumentsResult", () => {
  it("fills electrical take-off from a Jev electrical_plan decision", () => {
    const decision = decisionFromJevAnswers({
      documentKind: { type: "choice", choice: "electrical_plan" },
      isTradeDocument: { type: "boolean", probability: 0.99 },
      hiddenConditions: { type: "boolean", probability: 0.1 },
      completeness: { type: "score", score: 2 },
      isBidForm: { type: "boolean", probability: 0.01 },
    });
    const result = assembleDocumentsResult(
      { kind: "document", file: SAMPLE_ELECTRICAL_BLUEPRINT },
      decision,
      false,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mock).toBe(false);
    expect(result.takeoff?.mock).toBe(false);
    expect(result.takeoff?.matched).toContain("18 duplex receptacles");
  });

  it("returns form hints instead of a take-off for bid forms", () => {
    const result = localDocumentsResult({
      kind: "form",
      notes: "Occupied home guest bath with possible hidden water damage behind the tub surround.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.takeoff).toBeUndefined();
    expect(result.formHints?.contingencyBump).toBe(6);
    expect(applyFormHints(8, result.formHints)).toBe(14);
  });
});
