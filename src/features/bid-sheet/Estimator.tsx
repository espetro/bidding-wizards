import { BlueprintUpload } from "../documents";
import { BidSummary } from "./BidSummary";
import { BidToolbar } from "./BidToolbar";
import { JobDetails } from "./JobDetails";
import { JobReader } from "./JobReader";
import { LaborSection } from "./LaborSection";
import { MaterialsSection } from "./MaterialsSection";
import { PricingInputs } from "./PricingInputs";
import { useBidSheet } from "./useBidSheet";

/** The /bid page: layout only. State and actions live in useBidSheet. */
export function Estimator() {
  const sheet = useBidSheet();
  return (
    <div className="playful-root min-h-screen bg-[#FAFAFA] text-neutral-900">
      <BidToolbar sheet={sheet} />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <JobDetails job={sheet.draft.job} onChange={(job) => sheet.set("job", job)} />
          <JobReader sheet={sheet} />
          <BlueprintUpload busy={sheet.reading} onTakeoff={sheet.applyTakeoff} />
          <MaterialsSection sheet={sheet} />
          <LaborSection sheet={sheet} />
          <PricingInputs sheet={sheet} />
        </div>
        <BidSummary sheet={sheet} />
      </main>

      <footer className="border-t border-neutral-200/70 px-4 py-5 text-center text-xs text-neutral-400 sm:px-8">
        Bidding Wizards
        <span className="no-print">
          {" · "}
          <a href="./bidbench.html" className="underline-offset-2 hover:underline">
            Classic BidBench
          </a>
        </span>
      </footer>
    </div>
  );
}
