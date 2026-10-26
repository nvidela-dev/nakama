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
        "[font:inherit] border-[var(--theme-border)]! rounded-[9px] max-[700px]:text-[16px]! focus-visible:[:where(&)]:outline-3 focus-visible:[:where(&)]:outline-solid focus-visible:[:where(&)]:outline-lime focus-visible:[:where(&)]:outline-offset-5",
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
        "[font:inherit] border-[var(--theme-border)]! rounded-[9px] max-[700px]:text-[16px]! focus-visible:[:where(&)]:outline-3 focus-visible:[:where(&)]:outline-solid focus-visible:[:where(&)]:outline-lime focus-visible:[:where(&)]:outline-offset-5",
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
      className={cn(
        "border-[var(--theme-border)]! rounded-[9px] max-[700px]:text-[16px]! focus-visible:outline-3 focus-visible:outline-lime focus-visible:outline-offset-3",
        className,
      )}
      {...props}
      disabled={disabled || (controlled && !hydrated)}
    />
  );
}
