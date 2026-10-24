"use client";
import { Icon } from "@/shared/ui/icon";
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
      className={
        "stage-map-popup fixed [inset:0] w-[min(1200px,_94vw)] max-w-[94vw] max-h-[90dvh] m-auto p-3 overflow-auto border border-line rounded-[10px] [background:rgb(16_28_27_/_90%)] text-ink backdrop:[background:transparent] [&_.stage-map-popup-toolbar_.text-button]:m-0 [&_.stage-map-popup-toolbar_.text-button]:min-w-8 [&_.stage-map-popup-toolbar_.text-button]:min-h-8 [&_.stage-map-popup-toolbar_.text-button]:p-1 [&_.stage-map-popup-toolbar_.text-button]:text-[22px] [&_.stage-map-popup-toolbar_.text-button]:leading-[1] [&_.stage-map-popup-toolbar_.text-button]:bg-panel [&_.journey-miniview]:m-0 [&_.journey-miniview]:p-0 [&_.journey-miniview]:border-0 [&_.journey-miniview]:bg-transparent [&_.journey-miniview]:[box-shadow:none] [&_.miniview-scene::after]:hidden [&_.miniview-scene]:h-[min(60dvh,_560px)] pointer-coarse:[&_.stage-map-popup-toolbar_.text-button]:min-w-11 pointer-coarse:[&_.stage-map-popup-toolbar_.text-button]:min-h-11"
      }
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
      <div className={"stage-map-popup-toolbar flex justify-end mb-[4px]"}>
        <IconButton variant="ghost" label={t("Close")} onClick={onClose} autoFocus>
          <Icon name="close" />
        </IconButton>
      </div>
      {children}
    </Dialog>
  );
}
