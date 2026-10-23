import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input, Select, Textarea } from "./controls";
const meta = { title: "UI/Form controls", component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fields: Story = {
  render: () => (
    <form className="form-stack" style={{ maxWidth: 400 }}>
      <label htmlFor="story-name">Project name</label>
      <Input id="story-name" defaultValue="Research notes" required />
      <label htmlFor="story-description">Description</label>
      <Textarea id="story-description" rows={3} />
      <label htmlFor="story-status">Status</label>
      <Select id="story-status">
        <option>In progress</option>
        <option>Ready</option>
      </Select>
    </form>
  ),
};
export const Invalid: Story = {
  render: () => (
    <>
      <label htmlFor="invalid-name">Project name</label>
      <Input id="invalid-name" aria-invalid aria-describedby="invalid-error" />
      <p id="invalid-error">Enter a project name.</p>
    </>
  ),
};
