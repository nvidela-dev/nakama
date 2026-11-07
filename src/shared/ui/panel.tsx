"use client";
import { Alert, Card, Empty } from "antd";
import type { ComponentProps, ReactNode } from "react";
export function Panel({ children, className = "", ...props }: ComponentProps<"section">) {
  return (
    <section {...props} className={`panel min-w-0 ${className}`}>
      <Card size="small">{children}</Card>
    </section>
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
    <Alert title={children} showIcon type={tone} role={tone === "error" ? "alert" : "status"} />
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<span className="text-muted">{title}</span>}
    >
      {children}
    </Empty>
  );
}
