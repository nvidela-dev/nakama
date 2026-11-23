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
      className={`pointer-coarse:min-h-11! pointer-coarse:min-w-11! ${props.className ?? ""}`}
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

export function buttonClassName(variant: "primary" | "secondary" = "primary") {
  return `button inline-flex items-center justify-center gap-2 min-h-9 rounded-md px-3 py-2 font-semibold no-underline focus-visible:outline-2 focus-visible:outline-lime pointer-coarse:min-h-11 ${variant === "secondary" ? "secondary border border-line bg-panel text-ink hover:border-lime" : "bg-lime text-bg"}`;
}
export function ButtonLink({
  variant,
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: "primary" | "secondary" }) {
  return <a {...props} className={`${buttonClassName(variant)} ${className}`} />;
}
