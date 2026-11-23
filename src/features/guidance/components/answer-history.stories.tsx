import type { Meta } from "@storybook/nextjs-vite";
import { AnswerHistory } from "./answer-history";
export default { title: "Guidance/Answer history" } satisfies Meta;
export const Revisions = {
  render: () => (
    <AnswerHistory
      olderHref="?historyBefore=3"
      history={[
        {
          revision: 3,
          content: "A library of shared tools",
          status: "answered",
          choice: null,
          author_id: "author",
          author_name: "Project owner",
          origin: "human",
          created_at: new Date("2026-01-02T12:00:00Z"),
        },
        {
          revision: 2,
          content: "A neighborhood workshop",
          status: "draft",
          choice: null,
          author_id: "former",
          author_name: null,
          origin: "human",
          created_at: new Date("2026-01-01T12:00:00Z"),
        },
      ]}
    />
  ),
};
