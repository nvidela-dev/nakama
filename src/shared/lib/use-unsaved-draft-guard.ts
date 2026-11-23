"use client";
import { useEffect } from "react";
export function useUnsavedDraftGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (
        a instanceof HTMLAnchorElement &&
        !e.defaultPrevented &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey &&
        a.href !== window.location.href &&
        a.target !== "_blank" &&
        !a.hasAttribute("download") &&
        !a.getAttribute("href")?.startsWith("#") &&
        !window.confirm(message)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, message]);
}
