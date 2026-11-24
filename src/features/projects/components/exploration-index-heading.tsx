import type { ReactNode } from "react";

export const explorationIndexSpacing = "pt-2! lg:pt-3!";

export function ExplorationIndexHeading({
  actions,
  label,
  count,
}: {
  actions?: ReactNode;
  label?: string;
  count?: number;
}) {
  return (
    <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-between">
      {actions && (
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {actions}
        </div>
      )}
      {label && (
        <h2 className="flex min-w-0 items-baseline gap-2 text-base font-semibold wrap-anywhere">
          {label} <small className="text-muted font-normal">{count}</small>
        </h2>
      )}
    </div>
  );
}
