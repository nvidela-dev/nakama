import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input, Select, Textarea } from "./controls";
const meta = { title: "UI/Form controls", component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fields: Story = {
  render: () => (
    <form
      className={
        "form-stack flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_button]:mt-2 lg:compact:gap-1.75 lg:compact:[&_button]:mt-1"
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
        className={
          "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
      />
      <label htmlFor="story-description" className={"text-[13px] text-ink"}>
        Description
      </label>
      <Textarea
        id="story-description"
        rows={3}
        className={
          "min-h-30 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
      />
      <label htmlFor="story-status" className={"text-[13px] text-ink"}>
        Status
      </label>
      <Select
        id="story-status"
        className={
          "bg-[#101c1b] text-ink border border-[#4b6056] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 [&:focus-visible]:[outline:3px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:4px]"
        }
      >
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
      <p id="invalid-error" className={"mb-[1em] mt-[0]"}>
        Enter a project name.
      </p>
    </>
  ),
};
