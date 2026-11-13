import { useState } from "react";
import { Link } from "react-router-dom";
import { MARKET_LIST, bidSearch } from "../../domain/markets";
import { bidRows, download, toProcoreBudgetCsv, toQuickBooksIif, xlsxFromRows } from "../export";
import type { BidSheet } from "./useBidSheet";

const buttonClass =
  "rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50";

export function BidToolbar({ sheet }: { sheet: BidSheet }) {
  const { input, market, marketId, wantSample, t } = sheet;
  const es = market.lang === "es";
  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      window.prompt("Copy share link", href);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/70 px-4 py-3 sm:px-8">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FACC15] text-sm font-black text-neutral-950">
          W
        </span>
        <span className="text-sm font-bold tracking-tight">Bidding Wizards</span>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-white p-0.5">
          {MARKET_LIST.map((m) => (
            <Link
              key={m.id}
              to={{ pathname: "/bid", search: bidSearch(m.id, { sample: wantSample }) }}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                marketId === m.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {m.chip}
            </Link>
          ))}
        </div>
        <button type="button" onClick={sheet.newBid} className={buttonClass}>
          {t("New bid")}
        </button>
        <button type="button" onClick={() => void sheet.copyBid()} className={buttonClass}>
          {t("Copy bid")}
        </button>
        <button type="button" onClick={sheet.loadSample} className={buttonClass}>
          Sample: {market.sampleName}
        </button>
        <button type="button" onClick={() => void copyShareLink()} className={buttonClass}>
          {copied ? t("Link copied") : t("Copy link")}
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              `${(sheet.draft.job.name || (es ? "cotizacion" : "bid")).replace(/[^\w\- ]+/g, "")}.xlsx`,
              xlsxFromRows(bidRows(input, market), es ? "Cotización" : "Bid"),
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
          }
          className={buttonClass}
        >
          {t("Excel")}
        </button>
        <button
          type="button"
          onClick={() => download("procore-budget.csv", toProcoreBudgetCsv(input), "text/csv")}
          className={buttonClass}
        >
          {t("Procore budget")}
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              "quickbooks-estimate.iif",
              toQuickBooksIif(input, window.prompt("QuickBooks customer:job name", "Customer:Job") ?? ""),
            )
          }
          className={buttonClass}
        >
          {t("QuickBooks")}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[#FACC15] px-3 py-2 text-xs font-bold text-neutral-950 hover:bg-[#EAB308]"
        >
          {t("Print bid")}
        </button>
      </div>
    </header>
  );
}
