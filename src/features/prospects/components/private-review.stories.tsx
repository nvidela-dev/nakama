import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProspectPrivateReview } from "./private-review";

const meta = {
  title: "Features/Prospects/Private review",
  component: ProspectPrivateReview,
  args: {
    prospectId: "00000000-0000-4000-8000-000000000001",
    olderHref: null,
    canAdvance: true,
    review: {
      assessment: {
        revision: 2,
        value: { answers: { business: "Fixture notes" }, ratings: { evidence: 2 } },
      },
      draft: {
        id: "17",
        revision: 1,
        value: { outcome: "voicemail", happenedOn: "2026-11-23", actions: [] },
      },
      history: [],
      previous: null,
    },
    saveReviewAction: async (command) =>
      command.type === "assessment"
        ? {
            success: command.advance ? "Moved deliberately" : "Assessment draft saved",
            revision: command.revision + 1,
          }
        : {
            success: command.record ? "Call recorded" : "Call draft saved",
            revision: command.record ? 0 : command.revision + 1,
            draftId: command.record ? null : (command.draftId ?? "17"),
          },
  },
} satisfies Meta<typeof ProspectPrivateReview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Owner: Story = {};
