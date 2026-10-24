import { cn } from "./cn";
type AccessibleName = { decorative: true; label?: never } | { decorative?: false; label: string };
export function ProgressMarker({
  value,
  max,
  className,
  decorative,
  label,
}: AccessibleName & { value: number; max: number; className?: string }) {
  const percentage =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : 0;
  return (
    <span
      className={cn(
        "progress-marker relative inline-grid place-items-center w-6.5 h-6.5 border border-line rounded-full bg-panel isolate",
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
    >
      <span
        className="progress-marker-fill absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime"
        style={{ width: `${percentage}%`, height: `${percentage}%` }}
      />
    </span>
  );
}
