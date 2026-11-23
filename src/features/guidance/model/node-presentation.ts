import type { NodeStatus, FlowStage } from "./flows";
import type { IconName } from "@/shared/ui/icon";
export const symbols: Record<NodeStatus, IconName> = {
  unanswered: "unanswered",
  draft: "draft",
  answered: "answered",
  skipped: "skipped",
  blocked: "warning",
};
export function computeNodeDepths(stage: FlowStage) {
  const depth = new Map<string, number>();
  for (const node of stage.nodes)
    depth.set(
      node.id,
      node.after.length ? Math.max(...node.after.map((id) => depth.get(id) ?? 0)) + 1 : 0,
    );
  return depth;
}
export function levels(stage: FlowStage) {
  const depth = computeNodeDepths(stage);
  return [...new Set(depth.values())].map((level) =>
    stage.nodes.filter((n) => depth.get(n.id) === level),
  );
}
