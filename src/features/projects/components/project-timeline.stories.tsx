import { Workspace } from "@/shared/ui/workspace-layout";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useT } from "@/shared/i18n/provider";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { ActionMenu } from "@/shared/ui/action-menu";
import type { StageProgress } from "@/features/projects/model";
import { ProjectTimeline } from "./project-timeline";

const sampleStages: StageProgress[] = [
  {
    id: "shape-01",
    hasMilestoneBoard: false,
    name: "User and context",
    answered: 2,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: true,
    reviewed: false,
    revisit: false,
  },
  {
    id: "shape-02",
    hasMilestoneBoard: false,
    name: "Core experience",
    answered: 5,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: true,
    reviewed: true,
    revisit: false,
  },
  {
    id: "shape-03",
    hasMilestoneBoard: false,
    name: "Architecture and data",
    answered: 0,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: false,
    reviewed: false,
    revisit: false,
  },
  {
    id: "shape-04",
    hasMilestoneBoard: true,
    name: "Quality and edge cases",
    answered: 0,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: false,
    reviewed: false,
    revisit: false,
  },
  {
    id: "shape-05",
    hasMilestoneBoard: false,
    name: "Release and learn",
    answered: 0,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: false,
    reviewed: false,
    revisit: false,
  },
];

function ProjectCardsPreview() {
  const t = useT();
  const cards = [
    { name: "Remeras Truchas", stages: sampleStages },
    { name: "Nakama", stages: undefined },
    {
      name: "Restaurant OS",
      stages: sampleStages.map((stage, index) =>
        index === 0 ? { ...stage, answered: 0, started: false } : stage,
      ),
    },
    { name: "Social Media Multibox", stages: undefined },
  ];
  return (
    <Workspace>
      <div
        className={
          "project-list lg:compact:grid lg:compact:grid-cols-[repeat(auto-fill,_minmax(360px,_1fr))] lg:compact:gap-2.5 lg:compact:items-stretch lg:compact:[&_>_h2]:[grid-column:1_/_-1] lg:compact:[&_>_h2]:mb-0 lg:compact:[&_>_.empty-state]:[grid-column:1_/_-1] lg:compact:[&_>_.empty-state]:mb-0"
        }
      >
        {cards.map((card) => (
          <article
            key={card.name}
            className={
              "project-card has-management block py-3.5 px-4 border border-line rounded-[9px] mb-2 [background:linear-gradient(120deg,_var(--theme-surface,#21342c),_var(--color-panel))] relative hover:[border-color:var(--theme-border,#9cba7b)] [&_.eyebrow]:flex [&_.eyebrow]:justify-between [&_p]:text-[14px] [&_p]:text-muted [&_p]:whitespace-pre-wrap [&_p]:wrap-anywhere [&_small]:text-muted [&_small]:text-[12px] lg:compact:py-3 lg:compact:px-4 lg:compact:rounded-[8px] lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:mt-1.25 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-1.75 lg:compact:[&_p]:leading-[1.45] lg:compact:[&_small]:text-[11px] lg:compact:mb-0"
            }
          >
            <a
              className={
                "project-card-link text-inherit no-underline focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 block"
              }
              href="#project"
            >
              <h3
                className={
                  "font-sans tracking-[-0.045em] font-semibold m-0 pt-1 px-0.5 pb-0.5 text-[16px] leading-[1.35] wrap-anywhere lg:compact:text-[15px] pr-8 pointer-coarse:pr-11"
                }
              >
                {card.name}
              </h3>
              <ProjectTimeline stages={card.stages} t={t} />
            </a>
            <div className="project-card-actions absolute top-1.5 right-1.5 [&_.ui-action-menu-items]:z-20">
              <ActionMenu label={t("Project actions")}>
                <Button type="button" variant="ghost">
                  <Icon name="edit" /> {t("Edit project")}
                </Button>
                <Button type="button" variant="ghost">
                  <Icon name="delete" /> {t("Delete project")}
                </Button>
              </ActionMenu>
            </div>
          </article>
        ))}
      </div>
    </Workspace>
  );
}

const meta = {
  title: "Features/Projects/Project timeline",
  component: ProjectCardsPreview,
} satisfies Meta<typeof ProjectCardsPreview>;

export default meta;
export const CompactCards: StoryObj<typeof meta> = {};
