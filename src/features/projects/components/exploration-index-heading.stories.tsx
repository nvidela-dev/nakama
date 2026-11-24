import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Workspace } from "@/shared/ui/workspace-layout";
import { ExplorationIndexHeading, explorationIndexSpacing } from "./exploration-index-heading";

function Spacing({ legacy, empty }: { legacy: boolean; empty: boolean }) {
  const actions = (
    <>
      <Link
        href="/projects?view=archived"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Archived projects
      </Link>
      <Button className="min-h-11">New Exploration</Button>
    </>
  );
  return (
    <Workspace variant="dashboard" className={legacy ? "" : explorationIndexSpacing}>
      {legacy ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>
          </div>
          {!empty && (
            <h2 className="flex items-baseline gap-2 mb-2 font-semibold text-base">
              Video game <small className="text-muted font-normal">1</small>
            </h2>
          )}
        </>
      ) : (
        <ExplorationIndexHeading
          actions={actions}
          {...(empty ? {} : { label: "Video game", count: 1 })}
        />
      )}
      {empty ? (
        <div
          className="empty-state text-center py-15 px-5 rounded-[12px] text-muted"
          data-testid="first-entry"
        >
          No projects yet.
        </div>
      ) : (
        <div className="project-list grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-2">
          <article
            className="project-card relative rounded-lg border border-line bg-panel p-4"
            data-testid="first-entry"
          >
            <h3 className="font-semibold">Example exploration</h3>
          </article>
        </div>
      )}
    </Workspace>
  );
}
const meta = {
  title: "Features/Projects/Exploration index spacing",
  component: Spacing,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Spacing>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PriorPopulated: Story = { args: { legacy: true, empty: false } };
export const PriorEmpty: Story = { args: { legacy: true, empty: true } };
export const Populated: Story = { args: { legacy: false, empty: false } };
export const Empty: Story = { args: { legacy: false, empty: true } };
