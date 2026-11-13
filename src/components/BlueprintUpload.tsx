import { useRef, useState } from "react";
import { SAMPLE_ELECTRICAL_BLUEPRINT, type BlueprintFileMeta, type BlueprintTakeoff } from "../lib/blueprintMock";
import { processDocumentsClient } from "../lib/processDocumentClient";
import { extractPdfText } from "../lib/pdfText";
import { takeoffFromPdfText } from "../lib/pdfTakeoff";
import { isPdfBlueprint } from "../lib/blueprintMock";

type Props = {
  busy: boolean;
  onTakeoff: (takeoff: BlueprintTakeoff) => void;
};

type LocalStatus = { kind: "idle" } | { kind: "err"; text: string };

function asMeta(file: File): BlueprintFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

export function BlueprintUpload({ busy, onTakeoff }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileLabel, setFileLabel] = useState<string>("");
  const [status, setStatus] = useState<LocalStatus>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);

  async function run(meta: BlueprintFileMeta) {
    const result = await processDocumentsClient({ kind: "document", file: meta });
    if (!result.ok) {
      setStatus({ kind: "err", text: result.message });
      return;
    }
    if (!result.takeoff) {
      setStatus({ kind: "err", text: "Jev treated that as a form, not a drawing. Paste it under Read this job." });
      return;
    }
    const via = result.mock ? "heuristic" : "Jev";
    setFileLabel(`${meta.name} · ${result.takeoff.pages} sheet${result.takeoff.pages === 1 ? "" : "s"} (${via})`);
    setStatus({ kind: "idle" });
    onTakeoff(result.takeoff);
  }

  async function readFile(file: File) {
    if (!isPdfBlueprint(asMeta(file))) return run(asMeta(file));
    try {
      const { text, pages } = await extractPdfText(file);
      const result = takeoffFromPdfText(text, pages, file.name);
      if (!result.ok) {
        setStatus({ kind: "err", text: result.message });
        return;
      }
      setFileLabel(`${file.name} · ${pages} sheet${pages === 1 ? "" : "s"} (read from PDF)`);
      setStatus({ kind: "idle" });
      onTakeoff(result);
    } catch {
      setStatus({ kind: "err", text: "Could not read that PDF. Paste the scope under Read this job." });
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setFileLabel(file.name);
    void readFile(file);
  }

  return (
    <section className="no-print rounded-2xl border border-dashed border-neutral-300 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black tracking-tight">Blueprint take-off</h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Jev
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            Drop a PDF. Quantities are read from the drawing's own text (schedules, legends, notes) and priced from the
            catalog. Scanned drawings with no text layer need the scope pasted instead. The sample button stays canned.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setFileLabel(SAMPLE_ELECTRICAL_BLUEPRINT.name);
            void run(SAMPLE_ELECTRICAL_BLUEPRINT);
          }}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {busy ? "Reading…" : "Sample electrical PDF"}
        </button>
      </div>

      <div
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-[#FAFAFA]"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void pickFile(e.dataTransfer.files[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-sm font-semibold text-neutral-800">Upload PDF blueprint</p>
        <p className="mt-1 text-xs text-neutral-400">PDF only. Read in your browser; the file never leaves your device.</p>
        {fileLabel ? <p className="mt-2 text-xs font-medium text-neutral-600">{fileLabel}</p> : null}
      </div>

      {status.kind === "err" ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="status">
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
