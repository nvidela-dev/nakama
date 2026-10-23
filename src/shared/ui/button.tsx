import type { ComponentProps } from "react";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  pending?: boolean;
};

/** Native button semantics, refs and form actions remain available. */
export function Button({
  variant = "primary",
  pending = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass = variant === "ghost" ? "text-button" : variant === "primary" ? "" : variant;
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={[variantClass, className].filter(Boolean).join(" ")}
    />
  );
}

type IconButtonProps = Omit<ButtonProps, "aria-label"> & { label: string };
export function IconButton({ label, children, ...props }: IconButtonProps) {
  return (
    <Button {...props} aria-label={label}>
      {children}
    </Button>
  );
}
