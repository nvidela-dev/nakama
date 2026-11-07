"use client";
import { Input as AntInput } from "antd";
import type { ComponentProps } from "react";
import { useHydrated } from "@/shared/lib/use-hydrated";
export function Input({
  disabled,
  type = "text",
  ref,
  size,
  prefix,
  ...props
}: ComponentProps<"input">) {
  const hydrated = useHydrated();
  const locked =
    disabled ||
    (!hydrated && !!props.onChange && (props.value !== undefined || props.checked !== undefined));
  if (["checkbox", "radio", "file", "hidden", "color", "range"].includes(type))
    return <input {...props} {...{ ref, type, size, prefix }} disabled={locked} />;
  return (
    <AntInput
      {...(props as Omit<ComponentProps<typeof AntInput>, "ref">)}
      {...(size ? { htmlSize: size } : {})}
      prefix={prefix}
      type={type}
      disabled={locked}
      ref={(instance) => {
        if (typeof ref === "function") return ref(instance?.input ?? null);
        if (ref) ref.current = instance?.input ?? null;
      }}
    />
  );
}
export function Textarea({ disabled, ref, ...props }: ComponentProps<"textarea">) {
  const hydrated = useHydrated();
  return (
    <AntInput.TextArea
      {...(props as Omit<ComponentProps<typeof AntInput.TextArea>, "ref">)}
      disabled={disabled || (!hydrated && !!props.onChange && props.value !== undefined)}
      ref={(instance) => {
        const element = instance?.resizableTextArea?.textArea ?? null;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
    />
  );
}
// Native options retain browser form submission, keyboard selection and reset behavior.
export function Select({ disabled, className, ...props }: ComponentProps<"select">) {
  const hydrated = useHydrated();
  return (
    <select
      {...props}
      className={`rounded-md border border-line bg-panel px-2 min-h-8 ${className ?? ""}`}
      disabled={disabled || (!hydrated && !!props.onChange && props.value !== undefined)}
    />
  );
}
