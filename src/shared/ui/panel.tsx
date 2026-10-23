import type { ComponentProps, ReactNode } from "react";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section {...props} className={["panel", className].filter(Boolean).join(" ")} />;
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
      className={`message${tone === "error" ? " error" : ""}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
