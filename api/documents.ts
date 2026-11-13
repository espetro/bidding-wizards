/// <reference types="node" />
import { processDocuments } from "../server/jevDecide";
import type { DocumentsRequest } from "../src/features/documents/documentDecision";

const MAX_BYTES = 100_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return json(413, { ok: false, message: "Request too large." });
  }

  let payload: DocumentsRequest;
  try {
    payload = (await request.json()) as DocumentsRequest;
  } catch {
    return json(400, { ok: false, message: "Send JSON with kind, optional file, and notes." });
  }

  if (payload.kind !== "document" && payload.kind !== "form") {
    return json(400, { ok: false, message: "kind must be document or form." });
  }

  const result = await processDocuments(payload);
  return json(result.ok ? 200 : 422, result);
}
