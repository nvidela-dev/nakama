"use client";
import { useEffect, useRef, type ComponentProps } from "react";

type AccessibleName = { label: string; labelledBy?: never } | { label?: never; labelledBy: string };
export type DialogProps = Omit<
  ComponentProps<"dialog">,
  "open" | "onClose" | "aria-label" | "aria-labelledby"
> &
  AccessibleName & {
    open: boolean;
    onClose: () => void;
    dismissible?: boolean;
  };

/** Native modal focus trapping, Escape/backdrop dismissal and focus restoration. */
export function Dialog({
  open,
  onClose,
  dismissible = true,
  label,
  labelledBy,
  onCancel,
  onClick,
  onKeyDown,
  ...props
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);
  return (
    <dialog
      {...props}
      ref={dialog}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClose={() => {
        if (open && dismissible) onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Tab") return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        onCancel?.(event);
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!dismissible || event.defaultPrevented || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    />
  );
}
