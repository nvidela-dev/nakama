import type { Meta } from "@storybook/nextjs-vite";
import { StageNodeTree } from "./stage-node-tree";
import type { FlowStage } from "../model/flows";
export default { title: "Guidance/Stage tree" } satisfies Meta;
const stage: FlowStage = {
  id: "demo",
  name: "Explore",
  question: "What should we learn?",
  nodes: [
    {
      id: "audience",
      kind: "question",
      label: "Audience",
      question: "Who benefits?",
      example: "Neighbors",
      after: [],
    },
    {
      id: "problem",
      kind: "question",
      label: "Problem",
      question: "What do they need?",
      example: "Shared tools",
      after: ["audience"],
    },
  ],
};
export const TwoLevels = {
  render: () => (
    <StageNodeTree activeStage={stage} answerById={new Map()} href={(_, node) => `#${node}`} />
  ),
};
