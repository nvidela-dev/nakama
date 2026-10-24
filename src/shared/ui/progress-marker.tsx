import { cn } from "./cn";
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
      className={cn(
        'progress-marker [:where(&)]:relative [:where(&)]:inline-grid [:where(&)]:place-items-center [:where(&)]:w-6 [:where(&)]:h-6 [:where(&)]:[border:2px_solid_var(--color-line)] [:where(&)]:rounded-full [:where(&)]:bg-panel [:where(&)]:isolate before:[content:""] before:absolute before:[:where(&)]:top-1/2 before:[:where(&)]:left-1/2 before:[:where(&)]:[transform:translate(-50%,_-50%)] before:[:where(&)]:w-[var(--stage-progress,_0%)] before:[:where(&)]:h-[var(--stage-progress,_0%)] before:[:where(&)]:rounded-full before:[:where(&)]:bg-lime',
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      style={{ "--stage-progress": `${percentage}%` } as CSSProperties}
    />
  );
}
