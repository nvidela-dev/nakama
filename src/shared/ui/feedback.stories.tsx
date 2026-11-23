import type { Meta } from "@storybook/nextjs-vite";
import { Feedback } from "./feedback";
export default { title: "UI/Feedback" } satisfies Meta;
export const Saved = { render: () => <Feedback state={{ success: "Artifact saved." }} /> };
export const WithReference = {
  render: () => <Feedback state={{ error: "Artifact not found.", reference: "demo-reference" }} />,
};
