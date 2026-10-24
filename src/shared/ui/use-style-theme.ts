"use client";
import { useSyncExternalStore } from "react";
import { defaultStyleTheme, parseStyleTheme } from "./style-theme";
function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
/** Canvas renderers need to rebuild their colors when the server updates the root palette. */
export function useStyleTheme() {
  return useSyncExternalStore(
    subscribe,
    () => parseStyleTheme(document.documentElement.dataset.theme),
    () => defaultStyleTheme,
  );
}
