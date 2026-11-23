"use client";
import { useLayoutEffect, useRef, type ComponentProps } from "react";

type AccessibleName = { label: string; labelledBy?: never } | { label?: never; labelledBy: string };
export type DialogProps = Omit<
  ComponentProps<"dialog">,
  "open" | "onClose" | "aria-label" | "aria-labelledby"
> &
  AccessibleName & {
    open: boolean;
    onClose: () => void;
    dismissible?: boolean;
    size?: "md" | "lg" | "fullscreen";
  };

/** Native modal focus trapping, Escape/backdrop dismissal and focus restoration. */
export function Dialog({
  open,
  onClose,
  dismissible = true,
  size = "md",
  className = "",
  label,
  labelledBy,
  onCancel,
  onClick,
  onKeyDown,
  ...props
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      // React may still be enabling the trigger in this commit (for example,
      // when an async save settles). Restore after those DOM updates, without
      // stealing focus from a newly opened dialog or another focused control.
      queueMicrotask(() => {
        if (!(previousFocus instanceof HTMLElement) || !previousFocus.isConnected) return;
        const active = document.activeElement;
        const modal = document.querySelector("dialog:modal");
        if (modal && !modal.contains(previousFocus)) return;
        if (active === document.body || active === previousFocus || !active?.isConnected)
          previousFocus.focus();
      });
    };
  }, [open]);
  return (
    <dialog
      {...props}
      className={`${{ md: "[:where(&)]:w-[min(36rem,calc(100vw-2rem))]", lg: "[:where(&)]:w-[min(56rem,calc(100vw-2rem))]", fullscreen: "[:where(&)]:w-screen [:where(&)]:h-dvh" }[size]} [:where(&)]:max-h-[90dvh] [:where(&)]:overflow-y-auto [:where(&)]:rounded-lg [:where(&)]:bg-panel [:where(&)]:text-ink ${className}`}
      ref={dialog}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClose={(event) => {
        if (!event.currentTarget.open && open && dismissible) onClose();
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
