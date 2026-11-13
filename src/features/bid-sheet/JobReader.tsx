import type { BidSheet } from "./useBidSheet";

/** Free-text job notes in, catalog-matched lines out. */
export function JobReader({ sheet }: { sheet: BidSheet }) {
  const { draft, status, reading } = sheet;
  return (
    <section className="no-print rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-black tracking-tight">Read this job</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            Paste the work in your own words. The on-device catalog fills the sheet. You own the numbers after that.
          </p>
        </div>
        <button
          type="button"
          disabled={reading}
          onClick={() => void sheet.readNotes(draft.notes)}
          className="rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-neutral-950 shadow-sm hover:bg-[#EAB308] disabled:opacity-60"
        >
          {reading ? "Reading…" : "Read this job"}
        </button>
      </div>
      <textarea
        value={draft.notes}
        onChange={(e) => sheet.set("notes", e.target.value)}
        rows={5}
        placeholder="e.g. Re-roof, 18 m x 12 m, NZ$85 per m²"
        className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      {status.kind !== "idle" && (
        <p
          className={`mt-3 text-sm ${status.kind === "err" ? "font-medium text-red-600" : "text-neutral-600"}`}
          role="status"
        >
          {status.text}
        </p>
      )}
    </section>
  );
}
