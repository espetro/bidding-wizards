import { HowItWorks } from "./HowItWorks";
import { MinimalFooter } from "./MinimalFooter";
import { PlayfulHero } from "./PlayfulHero";
import { Toast } from "./Toast";
import { useFitToViewport } from "./useFitToViewport";
import { bidHref } from "../../domain/markets";
import { useState } from "react";

const COPY = {
  headlineLine1: "Know your ",
  headlineMarker: "margin",
  headlineLine2: " before",
  headlineScribble: "you send the bid.",
  subtitleBefore: "Paste the job, or drop a PDF blueprint. Bidding Wizards itemizes",
  subtitleHighlight: "materials, labor, contingency and markup",
  subtitleAfter: "so the profit you'll keep is on the page before you send it. Metres or feet, GST on its own line — same sheet, location in the URL.",
  ctaLabel: "Open the NZ re-roof",
  ghostLabel: "Try a blueprint take-off",
  rating: "Built for trades",
  ratingNote: "AI reads the brief. Every dollar figure is plain code you can check by hand.",
  statusTime: "9:41",
  phone: {
    userMessage: "Re-roof, 18 m x 12 m, NZ$85 per m²",
    userMeta: "9:40 AM",
    agentMessage:
      "Area line: 18 m × 12 m = 216 m² × NZ$85 = NZ$18,360. GST 15% on its own line. Total inc. GST NZ$21,114.",
    agentMeta: "9:41 AM · Bidding Wizards",
    board: {
      title: "NZ re-roof bid",
      filled: "Itemized",
      rows: [
        { name: "Re-roof · 18 m × 12 m", kind: "Area", status: "216 m²" },
        { name: "NZ$85 per m²", kind: "Rate", status: "NZ$18,360" },
        { name: "Bid ex GST", kind: "On area", status: "NZ$18,360" },
        { name: "GST 15%", kind: "On bid", status: "NZ$2,754" },
        { name: "Total inc GST", kind: "Client pays", status: "NZ$21,114" },
      ],
    },
    quickPrompts: [
      { label: "Kitchen backsplash", text: "Kitchen backsplash, 32 sq ft subway tile and a quartz countertop." },
      { label: "Roof tear-off", text: "Tear off and reroof 22 squares of architectural shingles." },
      { label: "NZ re-roof", text: "Re-roof, 18 m x 12 m, NZ$85 per m²" },
    ],
    inputPlaceholder: "Brief the job…",
    replyDefault: "Drafting a line-item bid from that brief — materials, labor, then contingency and markup.",
    replyKitchen:
      "Kitchen: subway tile + quartz, tile setter and carpenter. Markup on cost-to-complete, margin on the bid.",
    replyRoof: "Roof: shingles + underlayment, roofer hours. I'll bump contingency if the deck is unknown.",
    replyNzRoof:
      "NZ re-roof: 18 m × 12 m = 216 m² × NZ$85 = NZ$18,360 on the bid line. GST 15% on its own line, total inc. GST in NZ$.",
    replyFence: "Fence: cedar boards + carpenter + laborer. Add the linear run and I'll extend the takeoff.",
    replyMeta: "Just now · Bidding Wizards",
  },
};

export function Landing() {
  const fit = useFitToViewport();
  const [toast, setToast] = useState(false);

  return (
    <div className="playful-root flex min-h-screen flex-col bg-[#FAFAFA]">
      <header className="flex w-full items-center justify-between px-6 py-4 sm:px-10">
        <a href="#/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FACC15] text-sm font-black text-neutral-950">
            W
          </span>
          <span className="text-sm font-bold tracking-tight text-neutral-900">Bidding Wizards</span>
        </a>
        <nav className="flex items-center gap-4">
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="hidden text-xs font-semibold text-neutral-500 hover:text-neutral-900 sm:inline"
          >
            How it works
          </a>
          <a
            href={bidHref("nz", { sample: true })}
            className="rounded-lg bg-[#FACC15] px-3.5 py-2 text-xs font-bold text-neutral-950 shadow-sm hover:bg-[#EAB308]"
          >
            NZ re-roof
          </a>
        </nav>
      </header>

      <main
        ref={fit.mainRef}
        className="flex flex-1 flex-col items-center justify-center px-6 py-8 lg:px-10 lg:py-6"
      >
        <PlayfulHero
          refs={{
            leftRef: fit.leftRef,
            titleRef: fit.titleRef,
            phoneBoxRef: fit.phoneBoxRef,
            phoneRef: fit.phoneRef,
          }}
          copy={COPY}
          ctaHref={bidHref("nz", { sample: true })}
          ghostHref={bidHref("nz")}
          onIslandClick={() => {
            setToast(true);
            window.setTimeout(() => setToast(false), 2200);
          }}
        />
      </main>

      <HowItWorks />

      <MinimalFooter
        ref={fit.footerRef}
        copyright="Bidding Wizards"
        links={[
          { label: "NZ re-roof", href: bidHref("nz", { sample: true }) },
          { label: "US sq ft", href: bidHref("us", { sample: true }) },
          { label: "Pitch deck", href: "./pitch.html" },
          { label: "Classic BidBench", href: "./bidbench.html" },
          { label: "GitHub", href: "https://github.com/espetro/bidding-wizards" },
        ]}
      />

      <Toast message="Live — paste a job in the estimator." visible={toast} />
    </div>
  );
}
