import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderIndicators } from "./header-indicators";
import { MobileSidebar } from "./workspace-sidebar";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { WaveMark } from "@/shared/ui/wave-mark";

const meta = {
  title: "Features/Shell/Header indicators",
  component: HeaderIndicators,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HeaderIndicators>;
export default meta;
type Story = StoryObj<typeof meta>;
const explorations = { active: 3, withFlow: 1, withoutFlow: 2, parked: 2, finished: 1 };
const render: Story["render"] = (args) => (
  <header className="grid min-h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-line bg-panel px-2 py-1 min-[520px]:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4 lg:px-6">
    <div className="flex min-w-0 items-center gap-1">
      <MobileSidebar owner={!!args.metrics?.jobs} />
      <span className="flex min-h-11 items-center gap-1 text-xl font-extrabold tracking-tight">
        <span className="text-2xl text-lime">
          <WaveMark />
        </span>
        <span>nakama</span>
      </span>
    </div>
    <div
      aria-label="Workspace preferences"
      role="group"
      className="col-span-2 row-start-2 flex min-h-11 min-w-0 items-center justify-end gap-1 border-t border-line min-[520px]:col-span-1 min-[520px]:col-start-2 min-[520px]:row-start-1 min-[520px]:border-0"
    >
      {args.metrics?.jobs && (
        <Button aria-label="Administration" variant="ghost" className="size-11!">
          <Icon name="admin" />
        </Button>
      )}
      <Button aria-label="Theme" variant="ghost">
        Daylight
      </Button>
      <Button aria-label="Language" variant="ghost" className="size-11!">
        <Icon name="language" />
      </Button>
    </div>
    <div className="col-start-2 row-start-1 flex min-h-11 shrink-0 items-center justify-end gap-0.5 text-xs min-[520px]:col-start-3 sm:gap-2">
      <HeaderIndicators {...args} />
      <div className="grid size-11 place-items-center">
        <Button className="size-11! p-0!" aria-label="Alerts" variant="ghost">
          <Icon name="bell" />
        </Button>
      </div>
      <div className="grid size-11 place-items-center">
        <Button className="size-11! p-0!" aria-label="Account" variant="ghost">
          <span className="size-7 rounded-full bg-lime" />
        </Button>
      </div>
    </div>
  </header>
);
export const Owner: Story = {
  args: {
    locale: "es",
    metrics: {
      explorations,
      jobs: { active: 12, stages: [] },
      consultancy: { active: 1590, stages: [] },
    },
  },
  render,
};
export const Collaborator: Story = {
  args: { locale: "en", metrics: { explorations, jobs: null, consultancy: null } },
  render,
};
