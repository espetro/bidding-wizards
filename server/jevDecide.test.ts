import { describe, expect, it } from "vitest";
import { SAMPLE_ELECTRICAL_BLUEPRINT } from "../src/features/documents/blueprintMock";
import { processDocuments, typeSafeApiKey } from "./jevDecide";

describe("processDocuments", () => {
  it("uses the heuristic when TYPESAFE_API_KEY is unset", async () => {
    expect(typeSafeApiKey()).toBeUndefined();
    const result = await processDocuments({
      kind: "document",
      file: SAMPLE_ELECTRICAL_BLUEPRINT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mock).toBe(true);
    expect(result.decision.source).toBe("heuristic");
    expect(result.takeoff?.matched).toContain("18 duplex receptacles");
  });

  it("classifies a written job as a form with hidden-condition hints", async () => {
    const result = await processDocuments({
      kind: "form",
      notes: "Occupied house guest bath possible hidden water damage behind the tub.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formHints?.contingencyBump).toBe(6);
    expect(result.takeoff).toBeUndefined();
  });
});
