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
    if (view !== "steps") params.set("view", view);
    else params.delete("view");
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
      listClassName="project-work-tabs"
      panelClassName="project-work-panel"
    />
  );
}
