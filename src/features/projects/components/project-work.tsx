"use client";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/shared/i18n/provider";
import { Tabs } from "@/shared/ui/tabs";
type View = "steps" | "tasks" | "artifacts";
export function ProjectWork({
  children,
  tasks,
  artifacts,
}: {
  children: ReactNode;
  tasks?: ReactNode;
  artifacts?: ReactNode;
}) {
  const t = useT(),
    router = useRouter(),
    path = usePathname(),
    query = useSearchParams();
  const active: View =
    query.get("view") === "artifacts" && artifacts
      ? "artifacts"
      : query.get("view") === "tasks"
        ? "tasks"
        : "steps";
  function select(view: View) {
    const params = new URLSearchParams(query);
    if (view !== "steps") {
      params.set("view", view);
      params.delete("stage");
      params.delete("node");
    } else {
      params.delete("view");
    }
    params.delete("commentsBefore");
    params.delete("comment");
    router.replace(`${path}${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  if (!tasks) return <>{children}</>;
  const items: { value: View; label: string; content: ReactNode }[] = [
    { value: "steps", label: t("Project steps"), content: children },
    { value: "tasks", label: t("To-do"), content: tasks },
  ];
  if (artifacts) items.push({ value: "artifacts", label: t("Artifacts"), content: artifacts });
  return (
    <Tabs
      items={items}
      value={active}
      onChange={select}
      label={t("Project workspace")}
      listClassName={
        'project-work-tabs flex gap-1.5 mt-[-16px] mx-[-16px] mb-3.5 py-2 px-3 bg-[var(--theme-surface-low,#13211e)] border-b border-b-line rounded-[9px_9px_0_0] lg:compact:mt-[-14px] lg:compact:mb-3 [&_[role="tab"]]:bg-transparent [&_[role="tab"]]:text-muted [&_[role="tab"]]:min-h-7.5 [&_[role="tab"]]:py-1.25 [&_[role="tab"]]:px-2.75 [&_[role="tab"]]:text-[11.5px] [&_[role="tab"]]:rounded-[6px] [&_[role="tab"]]:border [&_[role="tab"]]:border-[transparent] [&_[aria-selected="true"]]:bg-[var(--theme-selected,#23382e)] [&_[aria-selected="true"]]:text-lime [&_[aria-selected="true"]]:border-line pointer-coarse:[&_[role="tab"]]:min-h-11'
      }
      panelClassName={
        "project-work-panel min-w-0 [&_>_.panel]:border-0 [&_>_.panel]:p-0 [&_>_.panel]:bg-transparent [&[hidden]]:hidden!"
      }
    />
  );
}
