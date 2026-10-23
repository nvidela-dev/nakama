"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

/** Native disclosure: actions retain ordinary button semantics and Tab navigation. */
export function ActionMenu({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target) && ref.current)
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return (
    <details
      ref={ref}
      className="ui-action-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary role="button" id={id} aria-label={label} title={label}>
        <Icon name="chevronDown" />
      </summary>
      <div
        className="ui-action-menu-items"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("button:not(:disabled)") &&
            ref.current
          )
            ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
