import type { ReactNode, RefObject } from "react";
import { BatteryChargingIcon, SignalIcon, WifiIcon } from "./icons";

type PhoneMockupProps = {
  children: ReactNode;
  statusTime: string;
  onIslandClick?: () => void;
  /** The phone itself. The viewport-fit hook scales it. */
  ref?: RefObject<HTMLDivElement | null>;
  /** The layout box around the phone. The viewport-fit hook sizes it to the
   *  scaled phone so the unscaled phone never drives the layout height. */
  boxRef?: RefObject<HTMLDivElement | null>;
};

export function PhoneMockup({
  children,
  statusTime,
  onIslandClick,
  ref,
  boxRef,
}: PhoneMockupProps) {
  return (
    <div ref={boxRef} className="floating-mockup relative select-none">
      {/* Absolutely positioned so the unscaled phone does not drive the
          layout height; the box above is sized to the scaled phone. */}
      <div ref={ref} className="absolute left-0 top-0 origin-top-left">
        {/* Outer Phone Body with Hardware Buttons */}
        <div className="relative flex h-[640px] w-[310px] flex-col overflow-hidden rounded-[48px] border-[7px] border-black bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)] sm:h-[700px] sm:w-[350px] sm:rounded-[54px] sm:border-[8px]">
          {/* Left Side Hardware Buttons (Action Button & Volume Keys) */}
          <div className="absolute -left-[11px] top-24 h-7 w-[3.5px] rounded-l-md bg-neutral-900" />
          <div className="absolute -left-[11px] top-36 h-12 w-[3.5px] rounded-l-md bg-neutral-900" />
          <div className="absolute -left-[11px] top-52 h-12 w-[3.5px] rounded-l-md bg-neutral-900" />
          {/* Right Side Power/Lock Button */}
          <div className="absolute -right-[11px] top-36 h-16 w-[3.5px] rounded-r-md bg-neutral-900" />

          {/* iOS Status Bar */}
          <div className="z-20 flex w-full items-center justify-between px-7 pt-3 text-[11px] font-semibold text-neutral-800">
            <span>{statusTime}</span>

            {/* Dynamic Island Notch */}
            <div
              onClick={onIslandClick}
              className="flex h-6 w-24 cursor-pointer items-center justify-between rounded-full bg-black px-3.5 shadow-inner transition-transform hover:scale-105 sm:w-28"
            >
              <div className="h-2.5 w-2.5 rounded-full border border-neutral-700 bg-neutral-900" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>

            <div className="flex items-center gap-1.5 text-neutral-800">
              <SignalIcon className="h-3 w-3" />
              <WifiIcon className="h-3 w-3" />
              <BatteryChargingIcon className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Phone Screen Content Area */}
          <div className="flex flex-1 flex-col justify-between overflow-y-auto px-5 pb-4 pt-8">
            {children}
          </div>
        </div>

        {/* Decorative Ambient Shadow & Glow */}
        <div className="absolute -bottom-6 -left-6 -right-6 -z-10 h-12 rounded-full bg-neutral-400/20 blur-2xl" />
      </div>
    </div>
  );
}
