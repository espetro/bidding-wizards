import { useEffect, useRef } from "react";

/** Desktop only. Stacked (mobile) layouts are taller than the viewport by
 *  nature and are expected to scroll. */
const DESKTOP_MIN_WIDTH = 1024;

/** Headline floor. Below this the display type stops reading as the design. */
const MIN_TITLE_PX = 40;

/** Device floor. Below this the phone mockup stops reading as a phone. */
const MIN_PHONE_SCALE = 0.62;

/**
 * Fits the hero into the viewport height without scrolling.
 *
 * Two independent levers, both measured from the real layout (no magic
 * constants for text heights, so it survives font swaps and copy changes):
 *
 *  - the device mockup is scaled *uniformly* (aspect ratio preserved), so it
 *    reads as the same phone, just smaller next to the text;
 *  - the headline steps down in font size until the left column fits.
 *
 * Everything else keeps the reference's exact proportions.
 */
export function useFitToViewport() {
  const mainRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const phoneBoxRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    const footer = footerRef.current;
    const left = leftRef.current;
    const title = titleRef.current;
    const phoneBox = phoneBoxRef.current;
    const phone = phoneRef.current;
    if (!main || !footer || !left || !title || !phoneBox || !phone) return;

    // Natural sizes captured before any mutation. The title's inline
    // font-size would otherwise contaminate later measurements (the phone is
    // safe: offsetWidth/Height are layout sizes, unaffected by transform).
    const naturalTitlePx = parseFloat(getComputedStyle(title).fontSize);

    const measure = () => {
      // offsetWidth/Height are layout sizes: unaffected by the transform we
      // apply, so this is always the phone's natural size.
      const naturalPhoneW = phone.offsetWidth;
      const naturalPhoneH = phone.offsetHeight;

      if (window.innerWidth < DESKTOP_MIN_WIDTH) {
        // Stacked layout: natural flow, the page scrolls.
        title.style.fontSize = "";
        phone.style.transform = "";
        phoneBox.style.width = `${naturalPhoneW}px`;
        phoneBox.style.height = `${naturalPhoneH}px`;
        return;
      }

      const mainStyle = getComputedStyle(main);
      const padding = parseFloat(mainStyle.paddingTop) + parseFloat(mainStyle.paddingBottom);
      const available = window.innerHeight - footer.offsetHeight - padding;

      // The device sets the floor for the left column: the text column has to
      // fit in the same vertical space as the scaled phone.
      const phoneScale = Math.max(MIN_PHONE_SCALE, Math.min(1, available / naturalPhoneH));

      // Start from the natural design and step the headline down until the
      // left column fits the available height.
      let titlePx = naturalTitlePx;
      title.style.fontSize = `${titlePx}px`;
      while (left.offsetHeight > available && titlePx > MIN_TITLE_PX) {
        titlePx -= 1;
        title.style.fontSize = `${titlePx}px`;
      }

      phoneBox.style.width = `${naturalPhoneW * phoneScale}px`;
      phoneBox.style.height = `${naturalPhoneH * phoneScale}px`;
      phone.style.transform = `scale(${phoneScale})`;
    };

    measure();

    // Only the viewport is a real input here: the elements we measure are
    // also the ones we mutate, so observing them would loop on our writes.
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { mainRef, footerRef, leftRef, titleRef, phoneBoxRef, phoneRef };
}
