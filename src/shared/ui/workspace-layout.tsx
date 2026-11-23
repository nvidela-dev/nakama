import type { ComponentProps, ReactNode } from "react";

const pageSpacing =
  "m-auto pt-12 px-[6%] pb-22.5 max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0";
const wide =
  "lg:compact:max-w-none min-[2000px]:compact:px-10 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none";
const widths = {
  standard: `max-w-300 ${wide}`,
  artifacts: `artifact-workspace max-w-390 ${wide}`,
  narrow: "narrow max-w-162.5 lg:compact:max-w-190 min-[2000px]:compact:px-10",
  preview:
    "w-full max-w-300 lg:max-w-360 lg:compact:max-w-360 min-[1280px]:[&:has(>_.has-discussion)]:max-w-360",
  project:
    "w-full max-w-none m-auto pt-4 px-4 pb-6 max-[700px]:pt-3 lg:compact:pt-3 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&_.eyebrow]:mb-1.5",
  dashboard: "w-full p-4 lg:p-6",
};
export function Workspace({
  variant = "standard",
  fullHeight,
  className = "",
  ...props
}: ComponentProps<"main"> & {
  variant?: keyof typeof widths;
  fullHeight?: boolean;
}) {
  return (
    <main
      {...props}
      className={`workspace ${widths[variant]} ${variant === "project" || variant === "dashboard" ? "" : pageSpacing} ${fullHeight ? "min-h-screen" : "min-h-[70vh]"} ${className}`}
    />
  );
}
export function PageHeading({
  compact,
  className = "",
  ...props
}: ComponentProps<"div"> & { compact?: boolean }) {
  const spacing = compact
    ? "project-heading mt-0 mb-3"
    : "mt-7.5 mb-10.5 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5";
  return <div {...props} className={`page-heading mx-0 ${spacing} ${className}`} />;
}
export function FormStack({
  dense,
  className = "",
  ...props
}: ComponentProps<"form"> & { dense?: boolean }) {
  return (
    <form
      {...props}
      className={`form-stack flex flex-col ${dense ? "gap-1.5" : "gap-3"} lg:compact:gap-1.75 [&_textarea]:w-full [&_select]:max-w-full [&_small]:text-[11px] [&_small]:text-muted ${className}`}
    />
  );
}
export function SidebarSection({
  heading,
  count,
  children,
  className = "",
  ...props
}: ComponentProps<"details"> & { heading: ReactNode; count?: number }) {
  return (
    <details
      {...props}
      className={`panel min-w-0 max-w-full bg-panel border border-line p-3 rounded-[8px] lg:compact:p-2.5 lg:compact:rounded-[10px] ${className}`}
    >
      <summary className="cursor-pointer select-none [[open]>&]:mb-2">
        <h2 className="font-sans tracking-[-0.045em] font-medium inline-flex items-center m-0 text-[14px] leading-[1.3]">
          {heading}
          {count !== undefined && <Badge className="count ml-1.25">{count}</Badge>}
        </h2>
      </summary>
      {children}
    </details>
  );
}

export function Badge({ className = "", ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={`text-muted border border-line rounded-full text-[11px] py-0.5 px-1.5 ${className}`}
    />
  );
}
export function Eyebrow({ className = "", ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={`eyebrow text-[11px] tracking-[2px] text-lime font-bold block [&_>_span:first-child:not(:last-child)]:inline-block ${className}`}
    />
  );
}
