"use client";
import { useState, type ReactNode } from "react";
import { Dialog } from "@/shared/ui/dialog";
import { Icon } from "@/shared/ui/icon";
import { ToolbarAction } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";

export function CatalogueAction({
  label,
  icon,
  children,
}: {
  label: string;
  icon: "plus" | "upload" | "consultancy";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <ToolbarAction label={t(label)} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon name={icon} size={16} />
      </ToolbarAction>
      <Dialog
        label={t(label)}
        open={open}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[85dvh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-panel p-4 text-ink backdrop:bg-black/40"
      >
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t(label)}</h2>
          <ToolbarAction label={t("Close")} onClick={() => setOpen(false)}>
            <Icon name="close" />
          </ToolbarAction>
        </header>
        {children}
      </Dialog>
    </>
  );
}
