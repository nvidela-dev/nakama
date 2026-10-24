"use client";
import { cn } from "./cn";
import type { ComponentProps } from "react";
import { useHydrated } from "@/shared/lib/use-hydrated";

// A controlled field must not accept input before React can retain its draft.
// Uncontrolled/hidden server-form inputs remain progressively usable.
export function Input({ disabled, className, ...props }: ComponentProps<"input">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && (props.value !== undefined || props.checked !== undefined);
  return (
    <input
      {...props}
      disabled={disabled || (controlled && !hydrated)}
      className={cn(
        "[font:inherit] focus-visible:[:where(&)]:[outline:3px_solid_var(--color-lime)] focus-visible:[:where(&)]:[outline-offset:5px]",
        className,
      )}
    />
  );
}
export function Textarea({ disabled, className, ...props }: ComponentProps<"textarea">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && props.value !== undefined;
  return (
    <textarea
      {...props}
      disabled={disabled || (controlled && !hydrated)}
      className={cn(
        "[font:inherit] focus-visible:[:where(&)]:[outline:3px_solid_var(--color-lime)] focus-visible:[:where(&)]:[outline-offset:5px]",
        className,
      )}
    />
  );
}
export function Select({ disabled, className, ...props }: ComponentProps<"select">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && props.value !== undefined;
  return (
    <select
      className={cn("", className)}
      {...props}
      disabled={disabled || (controlled && !hydrated)}
    />
  );
}
