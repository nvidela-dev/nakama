"use client";
import { Button } from "./button";
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="bg-transparent! hover:bg-transparent! p-0 w-11 min-h-8 pointer-coarse:min-h-11 rounded-md"
    >
      <span
        aria-hidden="true"
        className={`relative block w-9 h-5 rounded-full border border-line ${checked ? "bg-lime" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full ${checked ? "translate-x-4 bg-dark" : "translate-x-0 bg-ink"}`}
        />
      </span>
    </Button>
  );
}
