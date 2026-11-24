import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeDigest } from "./home-digest";

const meta = { title: "Features/Shell/Home digest", component: HomeDigest } satisfies Meta<
  typeof HomeDigest
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Recent: Story = {
  args: {
    locale: "es",
    activity: [
      {
        id: "jobs:1",
        source: "jobs",
        title: "Long job title " + "TextoSinSeparación".repeat(20),
        action: "Interview logged",
        href: "/jobs?role=example",
        occurredAt: "2026-11-24T18:00:00.000Z",
      },
      {
        id: "consultancy:2",
        source: "consultancy",
        title: "Example business",
        action: "Call logged",
        href: "/prospects?business=example",
        occurredAt: "2026-11-24T17:00:00.000Z",
      },
      {
        id: "explorations:3",
        source: "explorations",
        title: "Example exploration",
        action: "Answer saved",
        href: "/projects/example",
        occurredAt: "2026-11-24T16:00:00.000Z",
      },
    ],
  },
};
export const Empty: Story = { args: { locale: "en", activity: [] } };
