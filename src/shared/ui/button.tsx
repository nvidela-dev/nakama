"use client";
import { Button as AntButton, Tooltip } from "antd";
import type { ComponentProps } from "react";
import { useHydrated } from "@/shared/lib/use-hydrated";
export type ButtonProps = Omit<
  ComponentProps<typeof AntButton>,
  "type" | "variant" | "htmlType" | "disabled"
> & {
  type?: "submit" | "button" | "reset";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  pending?: boolean;
  disabled?: boolean | undefined;
};
export function Button({
  type = "button",
  variant = "primary",
  pending = false,
  disabled,
  ...props
}: ButtonProps) {
  const hydrated = useHydrated();
  return (
    <AntButton
      {...props}
      htmlType={type}
      loading={pending}
      disabled={disabled || pending || (!!props.onClick && !hydrated)}
      aria-busy={pending || undefined}
      danger={variant === "danger"}
      type={variant === "secondary" ? "default" : variant === "ghost" ? "text" : "primary"}
    />
  );
}
export function IconButton({
  label,
  children,
  ...props
}: Omit<ButtonProps, "aria-label"> & { label: string }) {
  return <Button {...props} title={label} aria-label={label} icon={children} />;
}

/** Compact desktop actions keep a larger target on touchscreens. */
export function ToolbarAction({
  label,
  children,
  ...props
}: Omit<ButtonProps, "aria-label" | "variant" | "size" | "icon"> & { label: string }) {
  return (
    <Tooltip title={label} trigger={["hover", "focus"]}>
      <Button
        {...props}
        size="small"
        variant="ghost"
        className={`pointer-coarse:min-w-11! pointer-coarse:min-h-11! ${props.className ?? ""}`}
        aria-label={label}
        icon={children}
      />
    </Tooltip>
  );
}
