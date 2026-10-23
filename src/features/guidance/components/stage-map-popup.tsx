"use client";
import type { ReactNode } from "react";
import { useT } from "@/shared/i18n/provider";
import { Dialog } from "@/shared/ui/dialog";
import { IconButton } from "@/shared/ui/button";
export function StageMapPopup({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog
      open
      onClose={onClose}
      id="project-stage-map"
      className="stage-map-popup"
      label={t("3D stage map")}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("a[href]") &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        )
          onClose();
      }}
    >
      <div className="stage-map-popup-toolbar">
        <IconButton variant="ghost" label={t("Close")} onClick={onClose} autoFocus>
          ×
        </IconButton>
      </div>
      {children}
    </Dialog>
  );
}
