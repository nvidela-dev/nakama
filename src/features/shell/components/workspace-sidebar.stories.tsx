import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DesktopSidebar, MobileSidebar } from "./workspace-sidebar";

const meta = {
  title: "Features/Shell/Workspace sidebar",
  component: MobileSidebar,
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/projects/a-project" } } },
} satisfies Meta<typeof MobileSidebar>;
export default meta;
type Story = StoryObj<typeof meta>;
const render: Story["render"] = (args) => (
  <div className="grid min-h-60 w-full lg:grid-cols-[3.75rem_minmax(0,1fr)]">
    <DesktopSidebar {...args} />
    <div>
      <MobileSidebar {...args} />
      <main>Example workspace</main>
    </div>
  </div>
);
export const Owner: Story = { args: { owner: true }, render };
export const Collaborator: Story = { args: { owner: false }, render };
