import type { ReactNode } from "react";
import Link from "next/link";
import Form from "next/form";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";

export const workspaceFilterLabel = "grid min-w-0 gap-1 text-xs text-muted";

type Props = {
  label: string;
  action: string;
  applyLabel: string;
  clear?: { href: string; label: string } | undefined;
  views: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function WorkspaceToolbar({
  label,
  action,
  applyLabel,
  clear,
  views,
  actions,
  children,
}: Props) {
  return (
    <div role="group" aria-label={label} className="relative grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line">
        {views}
        {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
      </div>
      <Form action={action} className="flex min-w-0 flex-wrap items-end gap-2">
        {children}
        <Button type="submit" variant="secondary" className="shrink-0">
          {applyLabel}
        </Button>
        {clear && (
          <Link
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-xs text-muted hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            href={clear.href}
          >
            <Icon name="rotateLeft" size={14} />
            {clear.label}
          </Link>
        )}
      </Form>
    </div>
  );
}
