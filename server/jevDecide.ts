/// <reference types="node" />
import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_decide, type Experimental_DecisionModel } from "ai";
import {
  DOCUMENT_QUESTIONS,
  assembleDocumentsResult,
  decisionFromJevAnswers,
  heuristicDecision,
  type DocumentsRequest,
  type DocumentsResult,
  type JevDocumentAnswers,
} from "../src/features/documents/documentDecision";

const NOTES_CAP = 12_000;

export function typeSafeApiKey(): string | undefined {
  const value = process.env.TYPESAFE_API_KEY?.trim();
  return value ? value : undefined;
}

function clipNotes(notes: string | undefined): string {
  if (!notes) return "";
  return notes.length > NOTES_CAP ? notes.slice(0, NOTES_CAP) : notes;
}

export async function processDocuments(
  request: DocumentsRequest,
  model?: Experimental_DecisionModel,
): Promise<DocumentsResult> {
  const notes = clipNotes(request.notes);
  const file = request.file
    ? { name: request.file.name.slice(0, 240), size: request.file.size, type: request.file.type.slice(0, 80) }
    : undefined;
  const normalized: DocumentsRequest = { kind: request.kind, file, notes };

  const key = typeSafeApiKey();
  if (!key && !model) {
    return assembleDocumentsResult(normalized, heuristicDecision(normalized), true);
  }

  try {
    const jev =
      model ??
      createTypeSafeAi({ apiKey: key }).decisionModel("jev-latest");
    const result = await experimental_decide({
      model: jev,
      state: {
        filename: file?.name ?? "",
        bytes: file?.size ?? 0,
        mime: file?.type ?? "",
        notes,
        kind: normalized.kind,
      },
      questions: DOCUMENT_QUESTIONS,
    });
    const decision = decisionFromJevAnswers(result.answers as JevDocumentAnswers);
    return assembleDocumentsResult(normalized, decision, false);
  } catch {
    return assembleDocumentsResult(normalized, heuristicDecision(normalized), true);
  }
}
