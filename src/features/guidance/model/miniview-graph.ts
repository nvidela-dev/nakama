import * as THREE from "three";
import type { Guidance } from "./types";
import { stageCoverage, stageLabel } from "./stage-progress";
import { computeNodeDepths } from "./node-presentation";
export type Point = {
  id: string;
  stageId: string;
  nodeId?: string | undefined;
  label: string;
  status: string;
  revisit: boolean;
  position: THREE.Vector3;
};
export function buildMiniviewGraph(guidance: Guidance) {
  const points: Point[] = [];
  const edges: [string, string][] = [];
  guidance.flow.stages.forEach((stage, index) => {
    const x = (index - (guidance.flow.stages.length - 1) / 2) * 3.5;
    const y = index % 2 ? 2.5 : 1.3;
    const z = index % 2 ? -2 : 1.5;
    const coverage = stageCoverage(stage, guidance);
    points.push({
      id: stage.id,
      stageId: stage.id,
      label: stage.name,
      status: stageLabel(coverage),
      revisit: coverage.revisit,
      position: new THREE.Vector3(x, y, z),
    });
    const previous = guidance.flow.stages[index - 1];
    if (previous) edges.push([previous.id, stage.id]);
    const depths = computeNodeDepths(stage);
    for (const node of stage.nodes) {
      const depth = depths.get(node.id)!;
      const siblings = stage.nodes.filter((n) => depths.get(n.id) === depth);
      const lane = siblings.indexOf(node) - (siblings.length - 1) / 2;
      const answer = guidance.answers.find((a) => a.node_id === node.id);
      points.push({
        id: node.id,
        stageId: stage.id,
        nodeId: node.id,
        label: node.label,
        status: answer?.status ?? "unanswered",
        revisit: answer?.needs_review ?? false,
        position: new THREE.Vector3(
          x + lane * 1.1,
          y - 1.6 - depth * 0.82,
          z + depth * 0.35 + lane * 0.3,
        ),
      });
      for (const parent of node.after.length ? node.after : [stage.id])
        edges.push([parent, node.id]);
    }
  });
  return { points, edges };
}
