"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "./language";

export function StageMapPopup({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialog} id="project-stage-map" className="stage-map-popup" aria-label={t("3D stage map")}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }
      // Navigation from the map returns to the unobstructed project workspace.
      if (event.target instanceof Element && event.target.closest("a[href]") && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) onClose();
    }}>
    <div className="stage-map-popup-toolbar"><button type="button" className="text-button" aria-label={t("Close")} onClick={onClose} autoFocus>×</button></div>
    {children}
  </dialog>;
}
