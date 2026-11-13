import { MarkerHighlight } from "./MarkerHighlight";
import { ScribbleUnderline } from "./ScribbleUnderline";
import { WavyUnderline } from "./WavyUnderline";
import { RatingBar } from "./RatingBar";
import { PhoneMockup } from "./PhoneMockup";
import { PhoneChatDemo, type PhoneChatCopy } from "./PhoneChatDemo";
import { ArrowRightIcon, ChevronRightIcon } from "./icons";
import type { ReactNode, RefObject } from "react";

export type PlayfulHeroRefs = {
  leftRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  phoneBoxRef: RefObject<HTMLDivElement | null>;
  phoneRef: RefObject<HTMLDivElement | null>;
};

export type PlayfulHeroCopy = {
  headlineLine1: string;
  headlineMarker: string;
  headlineLine2: string;
  headlineScribble: string;
  subtitleBefore: string;
  subtitleHighlight: string;
  subtitleAfter: string;
  ctaLabel: string;
  ghostLabel: string;
  rating: string;
  ratingNote: string;
  statusTime: string;
  phone: PhoneChatCopy;
};

type PlayfulHeroProps = {
  refs?: PlayfulHeroRefs;
  copy: PlayfulHeroCopy;
  /** Primary CTA destination (platform entry). */
  ctaHref: string;
  /** Ghost CTA destination (reach out). */
  ghostHref?: string;
  onIslandClick?: () => void;
  waitlistSlot?: ReactNode;
};

export function PlayfulHero({
  refs,
  copy,
  ctaHref,
  ghostHref,
  onIslandClick,
  waitlistSlot,
}: PlayfulHeroProps) {
  return (
    <div className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
      {/* Left Column: Copy & Actions */}
      <div ref={refs?.leftRef} className="flex max-w-2xl flex-col items-start lg:col-span-7">
        {/* Big Bold Title with Marker Accents */}
        <h1
          ref={refs?.titleRef}
          className="text-4xl font-black leading-[1.08] tracking-tight text-neutral-900 sm:text-6xl lg:text-[4.25rem]"
        >
          {copy.headlineLine1}
          <br className="hidden sm:inline" />
          <MarkerHighlight>{copy.headlineMarker}</MarkerHighlight>
          {copy.headlineLine2}
          <br className="hidden sm:inline" />
          <span className="relative mt-1 inline-block sm:mt-0">
            {copy.headlineScribble}
            {/* Hand-drawn yellow marker underline */}
            <ScribbleUnderline />
          </span>
        </h1>

        {/* Subtitle with Discount Highlight */}
        <p className="mt-8 max-w-xl text-base font-normal leading-relaxed text-neutral-500 sm:text-lg">
          {copy.subtitleBefore}{" "}
          <span className="relative inline-block font-medium text-neutral-800">
            {copy.subtitleHighlight}
            {/* Subtitle wavy marker underline */}
            <WavyUnderline />
          </span>{" "}
          {copy.subtitleAfter}
        </p>

        {/* CTA Buttons & Waitlist */}
        <div className="mt-8 flex w-full flex-col items-start gap-5">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            <a
              href={ctaHref}
              className="flex items-center gap-2 rounded-xl bg-[#FACC15] px-6 py-3.5 text-sm font-bold text-neutral-950 shadow-sm transition-all hover:bg-[#EAB308] hover:shadow-md active:scale-[0.98]"
            >
              <span>{copy.ctaLabel}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </a>

            {ghostHref && (
              <a
                href={ghostHref}
                className="group flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:text-black"
              >
                <span>{copy.ghostLabel}</span>
                <ChevronRightIcon className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
          </div>

          {waitlistSlot}
        </div>

        {/* Trust Bar */}
        <RatingBar rating={copy.rating} note={copy.ratingNote} />
      </div>

      {/* Right Column: iPhone 15 Pro Mockup */}
      <div className="flex justify-center lg:col-span-5 lg:justify-end">
        <PhoneMockup
          ref={refs?.phoneRef}
          boxRef={refs?.phoneBoxRef}
          statusTime={copy.statusTime}
          onIslandClick={onIslandClick}
        >
          <PhoneChatDemo copy={copy.phone} />
        </PhoneMockup>
      </div>
    </div>
  );
}
