import { MinimalFooter } from "../components/landing/MinimalFooter";
import { PlayfulHero } from "../components/landing/PlayfulHero";
import { Toast } from "../components/landing/Toast";
import { useFitToViewport } from "../components/landing/useFitToViewport";
import { useState } from "react";

const COPY = {
  headlineLine1: "The bid ",
  headlineMarker: "you send",
  headlineLine2: " is now on",
  headlineScribble: "the money.",
  subtitleBefore: "Paste the job, or drop a PDF blueprint. Wizbid itemizes",
  subtitleHighlight: "materials, labor, contingency, markup and GST",
  subtitleAfter:
    "so you see the margin you'll keep before it goes out the door. TypeSafe Jev classifies PDFs and job forms when the API key is set; Pages still uses the canned take-off.",
  ctaLabel: "Open the estimator",
  ghostLabel: "Try a blueprint take-off",
  rating: "Built for trades",
  ratingNote: "Qty × cost and hours × rate live in code. Jev only classifies the document.",
  statusTime: "9:41",
  phone: {
    userMessage:
      "Guest bath: 48 sq ft subway tile, new vanity, toilet, paint the walls. Occupied house — possible water damage behind the tub.",
    userMeta: "9:40 AM",
    agentMessage:
      "First-cut bid: tile, vanity, toilet, paint, tile setter + plumber + painter. Contingency bumped for occupied home and hidden water.",
    agentMeta: "9:41 AM · Wizbid",
    board: {
      title: "Guest bath bid",
      filled: "Itemized",
      rows: [
        { name: "Subway tile · 48 sq ft", kind: "Material", status: "$204" },
        { name: "Vanity + toilet + faucet", kind: "Material", status: "$750" },
        { name: "Tile setter + plumber", kind: "Labor", status: "$1,140" },
        { name: "Contingency + markup", kind: "On cost", status: "$3.1k ex GST" },
        { name: "GST", kind: "10% of bid", status: "$310" },
        { name: "Total incl. GST", kind: "Payable", status: "$3.41k" },
      ],
    },
    quickPrompts: [
      { label: "Kitchen backsplash", text: "Kitchen backsplash, 32 sq ft subway tile and a quartz countertop." },
      { label: "Roof tear-off", text: "Tear off and reroof 22 squares of architectural shingles." },
      { label: "Privacy fence", text: "80 ft cedar privacy fence, helper for demo and haul away." },
    ],
    inputPlaceholder: "Brief the job…",
    replyDefault:
      "Drafting a line-item bid from that brief — materials, labor, contingency, markup, then GST as its own line and a GST-inclusive total.",
    replyKitchen:
      "Kitchen: subway tile + quartz, tile setter and carpenter. Markup on cost-to-complete, margin on the bid.",
    replyRoof: "Roof: shingles + underlayment, roofer hours. I'll bump contingency if the deck is unknown.",
    replyFence: "Fence: cedar boards + carpenter + laborer. Add the linear run and I'll extend the takeoff.",
    replyMeta: "Just now · Wizbid",
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
          <span className="text-sm font-bold tracking-tight text-neutral-900">Wizbid</span>
        </a>
        <a
          href="#/bid"
          className="rounded-lg bg-[#FACC15] px-3.5 py-2 text-xs font-bold text-neutral-950 shadow-sm hover:bg-[#EAB308]"
        >
          Estimator
        </a>
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
          ctaHref="#/bid"
          ghostHref="#/bid"
          onIslandClick={() => {
            setToast(true);
            window.setTimeout(() => setToast(false), 2200);
          }}
        />
      </main>

      <MinimalFooter
        ref={fit.footerRef}
        copyright="Bidding Wizards"
        links={[
          { label: "Estimator", href: "#/bid" },
          { label: "Blueprint mock", href: "#/bid" },
          { label: "GitHub", href: "https://github.com/espetro/bidding-wizards" },
        ]}
      />

      <Toast message="Live — paste a job in the estimator." visible={toast} />
    </div>
  );
}
