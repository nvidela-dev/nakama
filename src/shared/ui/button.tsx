"use client";
import { Button as AntButton } from "antd";
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
