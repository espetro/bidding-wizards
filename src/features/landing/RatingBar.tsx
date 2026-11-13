type RatingBarProps = {
  rating: string;
  note: string;
};

export function RatingBar({ rating, note }: RatingBarProps) {
  return (
    <div className="mt-12 flex w-full flex-wrap items-center gap-6 border-t border-neutral-200/70 pt-6 text-xs text-neutral-500">
      <span className="text-xs font-bold text-neutral-800">{rating}</span>
      <span className="hidden text-neutral-300 sm:inline">|</span>
      <span>{note}</span>
    </div>
  );
}
