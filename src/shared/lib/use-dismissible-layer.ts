"use client";
import { useEffect, useEffectEvent, type RefObject } from "react";
export function useDismissibleLayer(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  close: () => void,
  restore: () => void,
  outsideManaged = false,
) {
  const onClose = useEffectEvent(close),
    onRestore = useEffectEvent(restore);
  useEffect(() => {
    if (!open) return;
    const element = root.current;
    if (!element) return;
    function outside(e: PointerEvent) {
      if (e.target instanceof Node && !element?.contains(e.target)) onClose();
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        onRestore();
      }
    }
    const keyboardTarget: HTMLElement | Document = outsideManaged ? element : document;
    // Listen on the open menu before the enclosing dialog handles Escape.
    const keyListener: EventListener = (e) => {
      if (e instanceof KeyboardEvent) escape(e);
    };
    keyboardTarget.addEventListener("keydown", keyListener);
    if (!outsideManaged) document.addEventListener("pointerdown", outside);
    return () => {
      keyboardTarget.removeEventListener("keydown", keyListener);
      if (!outsideManaged) document.removeEventListener("pointerdown", outside);
    };
  }, [open, root, outsideManaged]);
}
