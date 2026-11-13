import {
  classifyBlueprintName,
  isPdfBlueprint,
  mockPageCount,
  takeoffForKind,
  type BlueprintFileMeta,
  type BlueprintKind,
  type BlueprintTakeoff,
  type BlueprintTakeoffResult,
} from "./blueprintMock";
import { DEFAULT_CONTINGENCY } from "../../domain/catalog";

export const DOCUMENT_KIND = {
  electrical_plan: "electrical_plan",
  architectural_plan: "architectural_plan",
  bid_form: "bid_form",
  other: "other",
} as const;

export type DocumentKind = (typeof DOCUMENT_KIND)[keyof typeof DOCUMENT_KIND];

export type DocumentDecision = {
  documentKind: DocumentKind;
  isTradeDocument: boolean;
  hiddenConditions: boolean;
  completeness: number;
  isBidForm: boolean;
  source: "jev" | "heuristic";
};

export type FormHints = {
  contingencyBump: number;
  documentKind: DocumentKind;
};

export type DocumentsOk = {
  ok: true;
  mock: boolean;
  decision: DocumentDecision;
  takeoff?: BlueprintTakeoff;
  formHints?: FormHints;
};

export type DocumentsFail = { ok: false; message: string };
export type DocumentsResult = DocumentsOk | DocumentsFail;

export type DocumentsRequest = {
  kind: "document" | "form";
  file?: BlueprintFileMeta;
  notes?: string;
};

/** Questions Jev answers in one round trip (AI SDK `experimental_decide`). */
export const DOCUMENT_QUESTIONS = {
  documentKind: {
    type: "choice" as const,
    instructions:
      "What is `filename` plus `notes`? Pick the closest document type for a contractor estimator.",
    criteria: {
      electrical_plan:
        "Lighting and power drawings, panel schedules, receptacle counts, Tallowwood-style E sheets",
      architectural_plan: "Floor plans, architectural sets, Quantum-style building drawings",
      bid_form: "A filled job form, intake questionnaire, or written bid brief with no drawing set",
      other: "Anything that is not a trade drawing or a bid form",
    },
  },
  isTradeDocument: {
    type: "boolean" as const,
    instructions: "Is this a construction trade document or form Bidding Wizards can bid from?",
    criteria: {
      true: "Electrical or architectural drawings, or a job/bid form with trade scope",
      false: "Unrelated files, empty notes, or non-construction paperwork",
    },
  },
  hiddenConditions: {
    type: "boolean" as const,
    instructions:
      "Do `notes` mention occupied space, hidden water, unknown existing conditions, or similar risk?",
    criteria: {
      true: "Occupied home, hidden damage, open-up, unknown existing work",
      false: "Clean new work with no hidden-condition language",
    },
  },
  completeness: {
    type: "score" as const,
    instructions: "How complete is this package for a first-cut take-off?",
    criteria: [
      "Filename only, almost no scope",
      "Partial plan or a short written brief",
      "Permit-level set or a full job form",
    ],
  },
  isBidForm: {
    type: "boolean" as const,
    instructions: "Is the payload a written job form or pasted brief rather than a drawing PDF?",
    criteria: {
      true: "Intake form, questionnaire, or free-text job description",
      false: "A blueprint or drawing set",
    },
  },
};

export type JevDocumentAnswers = {
  documentKind: { type: "choice"; choice: string; probabilities?: Record<string, number> };
  isTradeDocument: { type: "boolean"; probability: number };
  hiddenConditions: { type: "boolean"; probability: number };
  completeness: { type: "score"; score: number };
  isBidForm: { type: "boolean"; probability: number };
};

function asKind(value: string): DocumentKind {
  if (value === DOCUMENT_KIND.electrical_plan) return DOCUMENT_KIND.electrical_plan;
  if (value === DOCUMENT_KIND.architectural_plan) return DOCUMENT_KIND.architectural_plan;
  if (value === DOCUMENT_KIND.bid_form) return DOCUMENT_KIND.bid_form;
  return DOCUMENT_KIND.other;
}

export function decisionFromJevAnswers(answers: JevDocumentAnswers): DocumentDecision {
  return {
    documentKind: asKind(answers.documentKind.choice),
    isTradeDocument: answers.isTradeDocument.probability >= 0.6,
    hiddenConditions: answers.hiddenConditions.probability >= 0.65,
    completeness: answers.completeness.score,
    isBidForm: answers.isBidForm.probability >= 0.6,
    source: "jev",
  };
}

export function heuristicDecision(input: { kind: "document" | "form"; file?: BlueprintFileMeta; notes?: string }): DocumentDecision {
  const notes = (input.notes ?? "").toLowerCase();
  const name = (input.file?.name ?? "").toLowerCase();
  const blob = `${name} ${notes}`;
  const hidden =
    /occupied|hidden water|water damage|unknown behind|existing conditions|open up/.test(blob);

  if (input.kind === "form" || (!input.file && notes.trim())) {
    return {
      documentKind: DOCUMENT_KIND.bid_form,
      isTradeDocument: notes.trim().length >= 12,
      hiddenConditions: hidden,
      completeness: notes.trim().length > 80 ? 2 : notes.trim().length > 20 ? 1 : 0,
      isBidForm: true,
      source: "heuristic",
    };
  }

  const kind: DocumentKind =
    classifyBlueprintName(name) === "architectural"
      ? DOCUMENT_KIND.architectural_plan
      : DOCUMENT_KIND.electrical_plan;

  return {
    documentKind: kind,
    isTradeDocument: Boolean(input.file && isPdfBlueprint(input.file)),
    hiddenConditions: hidden,
    completeness: 1,
    isBidForm: false,
    source: "heuristic",
  };
}

function kindToBlueprint(kind: DocumentKind): BlueprintKind {
  return kind === DOCUMENT_KIND.architectural_plan ? "architectural" : "electrical";
}

export function takeoffFromDecision(
  decision: DocumentDecision,
  file: BlueprintFileMeta,
  mock: boolean,
): BlueprintTakeoffResult {
  const base = takeoffForKind(
    kindToBlueprint(decision.documentKind),
    mockPageCount(file.size),
    file.name,
    mock,
  );
  if (!decision.hiddenConditions) return base;
  return {
    ...base,
    contingencyPct: base.contingencyPct + 6,
    matched: [...base.matched, "hidden-conditions flag"],
  };
}

export function formHintsFromDecision(decision: DocumentDecision): FormHints {
  return {
    documentKind: decision.documentKind,
    contingencyBump: decision.hiddenConditions ? 6 : 0,
  };
}

export function assembleDocumentsResult(
  request: DocumentsRequest,
  decision: DocumentDecision,
  mock: boolean,
): DocumentsResult {
  if (request.kind === "form" || decision.isBidForm) {
    if (!decision.isTradeDocument) {
      return { ok: false, message: "Jev (or the local stand-in) did not treat that as a trade form." };
    }
    return {
      ok: true,
      mock,
      decision,
      formHints: formHintsFromDecision(decision),
    };
  }

  const file = request.file;
  if (!file) return { ok: false, message: "Choose a PDF blueprint first." };
  if (!isPdfBlueprint(file)) {
    return { ok: false, message: "Upload a PDF blueprint (.pdf)." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: "That PDF looks empty." };
  }
  if (!decision.isTradeDocument) {
    return { ok: false, message: "That file does not look like a trade drawing we can bid." };
  }

  const takeoff = takeoffFromDecision(decision, file, mock);
  if (!takeoff.ok) return takeoff;
  return { ok: true, mock, decision, takeoff };
}

export function localDocumentsResult(request: DocumentsRequest): DocumentsResult {
  return assembleDocumentsResult(request, heuristicDecision(request), true);
}

/** Default contingency plus Jev/heuristic bump, never below the catalog default. */
export function applyFormHints(contingencyPct: number, hints?: FormHints): number {
  if (!hints) return contingencyPct;
  return Math.max(DEFAULT_CONTINGENCY, contingencyPct) + hints.contingencyBump;
}
