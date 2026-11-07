"use client";
import { LoadingState } from "@/shared/ui/loading-state";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { TaskList } from "./task-list";
const TaskWorkspace = dynamic(() => import("./task-list").then((module) => module.TaskList), {
  ssr: false,
  loading: () => <LoadingState variant="compact" label="Loading…" />,
});
export function ProjectTasks(props: ComponentProps<typeof TaskList>) {
  return <TaskWorkspace {...props} />;
}
