import type { CSSProperties } from "react";
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
      className={["progress-marker", className].filter(Boolean).join(" ")}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      style={{ "--stage-progress": `${percentage}%` } as CSSProperties}
    />
  );
}
