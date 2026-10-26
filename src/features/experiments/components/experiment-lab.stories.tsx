import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExperimentLab } from "./experiment-lab";
import type { Experiment } from "../model";
const timestamp = "2026-10-26T12:00:00.000Z";
const experiment: Experiment = {
  id: "00000000-0000-4000-8000-000000000001",
  revision: 1,
  plans: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      experiment_id: "00000000-0000-4000-8000-000000000001",
      version: 1,
      author_id: "example",
      created_at: timestamp,
      definition: {
        claim: "Can a shorter form help participants finish without assistance?",
        method: "Observe five synthetic prototype sessions.",
        criteria: "Four participants finish without help.",
        scope: "This prototype and these sessions only.",
        metric: "Participants completing independently",
        baseline: "",
        owner: "Example reviewer",
        limits: "No external writes",
        milestone: "First prototype",
        nodeId: "",
      },
    },
  ],
  runs: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      experiment_id: "00000000-0000-4000-8000-000000000001",
      plan_id: "00000000-0000-4000-8000-000000000002",
      context: { nodeId: "", revision: 0, content: "", prompt: "" },
      status: "completed",
      executor: "Example researcher",
      started_by: "example",
      started_at: timestamp,
      ended_at: timestamp,
      effort_minutes: 40,
      cost: null,
      deviations: "Synthetic example only",
      stale: false,
    },
  ],
  evidence: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      experiment_id: "00000000-0000-4000-8000-000000000001",
      run_id: "00000000-0000-4000-8000-000000000003",
      kind: "observation",
      content: "Three of five participants completed independently.",
      source: "Synthetic session notes; illustrative data only.",
      measurement: "3",
      unit: "participants",
      author_id: "example",
      recorded_at: timestamp,
    },
  ],
  reviews: [],
  proposals: [],
};
const meta = {
  title: "Features/Experiments/Lab",
  component: ExperimentLab,
  args: {
    projectId: "00000000-0000-4000-8000-000000000000",
    initial: [experiment],
    questions: [],
    names: { example: "Example reviewer" },
    save: async () => ({ error: "Preview only. Draft retained; no project data saved." }),
    reload: async () => ({ items: [experiment] }),
    exportBrief: async () => ({ brief: "Synthetic scoped brief. External execution only." }),
  },
} satisfies Meta<typeof ExperimentLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EvidenceReview: Story = {};
export const Empty: Story = { args: { initial: [] } };
export const ChangedContext: Story = {
  args: { initial: [{ ...experiment, runs: experiment.runs.map((r) => ({ ...r, stale: true })) }] },
};
