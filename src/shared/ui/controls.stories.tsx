import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input, Select, Textarea } from "./controls";
const meta = { title: "UI/Form controls", component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fields: Story = {
  render: () => (
    <form
      className={
        "form-stack flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_button]:mt-2 lg:compact:gap-1.75"
      }
      style={{ maxWidth: 400 }}
    >
      <label htmlFor="story-name" className={"text-[13px] text-ink"}>
        Project name
      </label>
      <Input
        id="story-name"
        defaultValue="Research notes"
        required
        className={"w-full [resize:vertical]"}
      />
      <label htmlFor="story-description" className={"text-[13px] text-ink"}>
        Description
      </label>
      <Textarea
        id="story-description"
        rows={3}
        className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
      />
      <label htmlFor="story-status" className={"text-[13px] text-ink"}>
        Status
      </label>
      <Select id="story-status" className={"max-w-full focus-visible:[outline-offset:4px]"}>
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
      <p id="invalid-error" className={"mb-[1em] mt-0"}>
        Enter a project name.
      </p>
    </>
  ),
};
