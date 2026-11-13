type WavyUnderlineProps = {
  className?: string;
};

export function WavyUnderline({
  className = "absolute -bottom-1 left-0 w-full overflow-visible",
}: WavyUnderlineProps) {
  return (
    <svg className={className} height="6" viewBox="0 0 100 6" fill="none">
      <path d="M2 3.5C25 1.5 75 5 98 3" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
