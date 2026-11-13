type ScribbleUnderlineProps = {
  className?: string;
};

export function ScribbleUnderline({
  className = "absolute -bottom-2 sm:-bottom-3 left-0 w-full overflow-visible pointer-events-none",
}: ScribbleUnderlineProps) {
  return (
    <svg
      className={className}
      height="14"
      viewBox="0 0 320 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="hand-drawn-line"
        d="M3 9.5C65 5 185 3.5 316 8.5C260 11.5 130 11.5 50 11.5"
        stroke="#FACC15"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
