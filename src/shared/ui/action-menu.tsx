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
      className={
        "ui-action-menu relative [flex:none] [&[open]_>_summary]:bg-[#ffffff12] [&[open]_>_summary]:text-ink"
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        role="button"
        id={id}
        aria-label={label}
        title={label}
        className={
          "focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] grid place-items-center w-6.5 h-6.5 p-0 rounded-[5px] list-none cursor-pointer text-muted pointer-coarse:w-9 pointer-coarse:h-9 [&::-webkit-details-marker]:hidden [&:hover]:bg-[#ffffff12] [&:hover]:text-ink"
        }
      >
        <Icon name="chevronDown" />
      </summary>
      <div
        className={
          "ui-action-menu-items absolute top-[calc(100%_+_3px)] right-0 z-[15] min-w-42.5 p-1 border border-line rounded-[8px] bg-[#172b25] [box-shadow:0_6px_20px_#0006] [&_button]:w-full [&_button]:[justify-content:flex-start] [&_button]:min-h-8 [&_button]:py-1.5 [&_button]:px-2 [&_button]:text-[12px] [&_button]:text-left [&_button]:border-0 pointer-coarse:[&_button]:min-h-11"
        }
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
