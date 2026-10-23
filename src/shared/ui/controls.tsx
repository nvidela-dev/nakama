"use client";
import type { ComponentProps } from "react";
import { useHydrated } from "@/shared/lib/use-hydrated";

// A controlled field must not accept input before React can retain its draft.
// Uncontrolled/hidden server-form inputs remain progressively usable.
export function Input({ disabled, ...props }: ComponentProps<"input">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && (props.value !== undefined || props.checked !== undefined);
  return <input {...props} disabled={disabled || (controlled && !hydrated)} />;
}
export function Textarea({ disabled, ...props }: ComponentProps<"textarea">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && props.value !== undefined;
  return <textarea {...props} disabled={disabled || (controlled && !hydrated)} />;
}
export function Select({ disabled, ...props }: ComponentProps<"select">) {
  const hydrated = useHydrated();
  const controlled = !!props.onChange && props.value !== undefined;
  return <select {...props} disabled={disabled || (controlled && !hydrated)} />;
}
