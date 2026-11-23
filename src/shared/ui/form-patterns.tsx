"use client";
import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { Button } from "./button";
import { Input } from "./controls";
export function FormField({
  label,
  children,
  ...props
}: ComponentProps<"label"> & { label: ReactNode }) {
  return (
    <label {...props} className={`grid gap-1 text-[13px] text-ink ${props.className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
export function ConfirmByName({
  expected,
  value,
  onChange,
  label,
  submitLabel,
  pending,
  id,
  children,
}: {
  expected: string;
  value: string;
  onChange: (value: string) => void;
  label: ReactNode;
  submitLabel: string;
  pending: boolean;
  id?: string;
  children?: ReactNode;
}) {
  const generated = useId();
  return (
    <>
      <FormField htmlFor={id ?? generated} label={label}>
        <Input
          id={id ?? generated}
          name="confirmation"
          autoComplete="off"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
      {children}
      <Button type="submit" variant="danger" pending={pending} disabled={value !== expected}>
        {submitLabel}
      </Button>
    </>
  );
}
export function InlineConfirm({
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending,
  submit,
}: {
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm?: () => void;
  pending: boolean;
  submit?: { name: string; value: string };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type={submit ? "submit" : "button"}
        {...submit}
        autoFocus
        variant="danger"
        pending={pending}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
      <Button variant="secondary" disabled={pending} onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}
export function ConflictBanner({ children, className = "", ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={`conflict border border-line rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}
export function FilterBar({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={`flex flex-wrap items-center gap-2 ${className}`} />;
}
