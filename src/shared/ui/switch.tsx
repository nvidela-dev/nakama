"use client";
import AntSwitch from "antd/es/switch";
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <AntSwitch
      checked={checked}
      onChange={onCheckedChange}
      aria-label={label}
      disabled={disabled}
    />
  );
}
