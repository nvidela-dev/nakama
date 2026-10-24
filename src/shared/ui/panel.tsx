import { cn } from "./cn";
import type { ComponentProps, ReactNode } from "react";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={cn(
        "panel [:where(&)]:p-7.5 [:where(&)]:bg-panel [:where(&)]:border [:where(&)]:border-line [:where(&)]:rounded-[16px] [:where(&)]:min-w-0 [&_p]:[:where(&)]:text-muted [&_h3]:[:where(&)]:mt-7 max-[1000px]:[:where(&)]:p-5.5 max-[700px]:[:where(&)]:p-6 lg:compact:[:where(&)]:p-4 lg:compact:[:where(&)]:rounded-[10px] lg:compact:[&_h3]:[:where(&)]:mt-4.5",
        className,
      )}
    />
  );
}
export function StatusMessage({
  tone = "success",
  children,
}: {
  tone?: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={[
        `message${tone === "error" ? " error" : ""}`,
        "text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[#4e3030] [color:#ffe4dd]!",
      ]
        .filter(Boolean)
        .join(" ")}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      className={
        "empty-state text-center py-15 px-5 [border:1px_dashed_var(--color-line)] rounded-[12px] text-muted [&_>_span]:text-[52px] [&_>_span]:text-lime [&_p]:text-[14px] lg:compact:py-6 lg:compact:px-4 lg:compact:[&_>_span]:text-[30px]"
      }
    >
      <h3
        className={
          "mb-[1em] font-mono tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-ink mt-5"
        }
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
