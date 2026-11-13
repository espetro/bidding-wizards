type MarkerHighlightProps = {
  children: string;
  className?: string;
};

export function MarkerHighlight({ children, className = "mr-2 sm:mr-3" }: MarkerHighlightProps) {
  return <span className={`marker-highlight ${className}`}>{children}</span>;
}
