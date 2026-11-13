import { localDocumentsResult, type DocumentsRequest, type DocumentsResult } from "./documentDecision";

export async function processDocumentsClient(request: DocumentsRequest): Promise<DocumentsResult> {
  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (response.ok) {
      return (await response.json()) as DocumentsResult;
    }
  } catch {
    // GitHub Pages has no API. Fall through to the local stand-in.
  }
  return localDocumentsResult(request);
}
