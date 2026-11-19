import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Workspace, PageHeading, FormStack, SidebarSection } from "./workspace-layout";
import { Input } from "./controls";
const meta = { title: "UI/Workspace layout", component: Workspace } satisfies Meta<
  typeof Workspace
>;
export default meta;
export const Project: StoryObj<typeof meta> = {
  args: { variant: "project" },
  render: (args) => (
    <Workspace {...args}>
      <PageHeading compact>
        <h1>Example project</h1>
      </PageHeading>
      <SidebarSection open heading="Members" count={0}>
        <FormStack>
          <label htmlFor="layout-email">Email address</label>
          <Input id="layout-email" type="email" />
        </FormStack>
      </SidebarSection>
    </Workspace>
  ),
};
