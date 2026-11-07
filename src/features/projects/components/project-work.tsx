"use client";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/shared/i18n/provider";
import dynamic from "next/dynamic";
const Tabs = dynamic(() => import("@/shared/ui/tabs").then((module) => module.Tabs<View>));
type View = "steps" | "tasks" | "artifacts" | "tests" | "activity";
export function ProjectWork({
  children,
  tasks,
  artifacts,
  tests,
  activity,
}: {
  children: ReactNode;
  tasks?: ReactNode;
  artifacts?: ReactNode;
  tests?: ReactNode;
  activity?: ReactNode;
}) {
  const t = useT(),
    router = useRouter(),
    path = usePathname(),
    query = useSearchParams();
  const active: View =
    query.get("view") === "activity" && activity
      ? "activity"
      : query.get("view") === "tests" && tests
        ? "tests"
        : query.get("view") === "artifacts" && artifacts
          ? "artifacts"
          : query.get("view") === "tasks"
            ? "tasks"
            : "steps";
  function select(view: View) {
    const params = new URLSearchParams(query);
    if (view !== "steps") {
      params.set("view", view);
      // Keep the selected question mounted while switching workspaces so drafts survive.
    } else {
      params.delete("view");
    }
    params.delete("commentsBefore");
    params.delete("comment");
    params.delete("activityBefore");
    router.replace(`${path}${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  if (!tasks) return <>{children}</>;
  const items: { value: View; label: string; content: ReactNode }[] = [
    { value: "steps", label: t("Project flow"), content: children },
    { value: "tasks", label: t("To-do"), content: tasks },
  ];
  if (artifacts) items.push({ value: "artifacts", label: t("Artifacts"), content: artifacts });
  if (tests) items.push({ value: "tests", label: t("Tests"), content: tests });
  if (activity) items.push({ value: "activity", label: t("Activity"), content: activity });
  return <Tabs items={items} value={active} onChange={select} label={t("Project workspace")} />;
}
