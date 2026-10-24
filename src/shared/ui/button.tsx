import { cn } from "./cn";
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
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "[:where(&)]:inline-flex [:where(&)]:min-h-12 [:where(&)]:items-center [:where(&)]:justify-center [:where(&)]:gap-3 [:where(&)]:rounded-[9px] [:where(&)]:border-0 [:where(&)]:bg-lime [:where(&)]:px-5.5 [:where(&)]:py-3.25 [:where(&)]:font-mono [:where(&)]:font-bold [:where(&)]:text-dark [:where(&)]:transition-[background,transform] [:where(&)]:duration-150 hover:[:where(&)]:-translate-y-px hover:[:where(&)]:bg-[#e9ffc1] focus-visible:[:where(&)]:outline-3 focus-visible:[:where(&)]:outline-lime focus-visible:[:where(&)]:outline-offset-[5px] disabled:[:where(&)]:cursor-wait disabled:[:where(&)]:translate-y-0 disabled:[:where(&)]:opacity-60 [:where(&)]:cursor-pointer",
        variant === "secondary" &&
          "secondary border border-[#658451] bg-[#344c39] text-lime hover:bg-[#456248]",
        variant === "ghost" &&
          "min-h-11 bg-transparent p-2 text-[11px] text-lime hover:bg-[#ffffff0a]",
        variant === "danger" && "danger",
        className,
      )}
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
