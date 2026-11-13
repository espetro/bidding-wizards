// Public API of the documents slice (blueprint take-off and form classification).
// server/ and api/ import documentDecision.ts directly because this index pulls in React.
export { BlueprintUpload } from "./BlueprintUpload";
export type { BlueprintTakeoff } from "./blueprintMock";
export { applyFormHints } from "./documentDecision";
export { processDocumentsClient } from "./processDocumentClient";
