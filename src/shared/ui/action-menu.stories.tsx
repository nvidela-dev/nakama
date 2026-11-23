import type { Meta } from "@storybook/nextjs-vite";
import { ActionMenu } from "./action-menu";
import { Button } from "./button";
export default { title: "UI/Action menu" } satisfies Meta;
export const ProjectActions = {
  render: () => (
    <ActionMenu label="Project actions">
      <Button variant="ghost">Edit project</Button>
      <Button variant="danger">Archive project</Button>
    </ActionMenu>
  ),
};
