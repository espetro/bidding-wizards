import type { JobInfo } from "../../domain/job";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";

export function JobDetails({ job, onChange }: { job: JobInfo; onChange: (next: JobInfo) => void }) {
  const field = (key: keyof JobInfo, label: string, placeholder: string, type = "text") => (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <input
        type={type}
        value={job[key]}
        onChange={(e) => onChange({ ...job, [key]: e.target.value })}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );

  return (
    <>
      <section className="no-print grid gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
        {field("name", "Customer / job", "e.g. Guest bath, 14 Oak St")}
        {field("address", "Address", "Optional")}
        {field("date", "Estimate date", "", "date")}
      </section>

      {/* Printed bids need a header; the inputs above are hidden in print. */}
      <div className="hidden print:block">
        <h1 className="text-xl font-black">{job.name || "Bid"}</h1>
        <p className="text-sm text-neutral-600">{[job.address, job.date].filter(Boolean).join(" · ")}</p>
      </div>
    </>
  );
}
