const inlineField =
  "rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none";

/** Borderless inline input used inside material and labor rows. */
export const fieldClass = `w-full ${inlineField}`;
/** Same, for short numeric cells (hours, rate). */
export const narrowFieldClass = `w-24 ${inlineField}`;
/** Same, for crew, days and hours/day. */
export const tinyFieldClass = `w-16 ${inlineField}`;
