import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Icon, iconCatalog, type IconName } from "./icon";
const meta = {
  title: "UI/Icon",
  component: Icon,
  args: { name: "bell" },
  argTypes: { name: { control: "select", options: Object.keys(iconCatalog) } },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Catalog: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 16,
      }}
    >
      {(Object.keys(iconCatalog) as IconName[]).map((name) => (
        <div key={name}>
          <Icon name={name} /> <code>{name}</code>
        </div>
      ))}
    </div>
  ),
};
