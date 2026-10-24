import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useT } from "@/shared/i18n/provider";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import type { StageProgress } from "@/features/projects/model";
import { ProjectTimeline } from "./project-timeline";

const sampleStages: StageProgress[] = [
  {
    id: "shape-01",
    name: "User and context",
    answered: 1,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: true,
    reviewed: false,
    revisit: false,
  },
  {
    id: "shape-02",
    name: "Core experience",
    answered: 0,
    blocked: 0,
    skipped: 0,
    total: 5,
    started: false,
    reviewed: false,
    revisit: false,
  },
  {
    id: "shape-03",
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
    <div
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-[none] lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_.button]:min-h-8.5 lg:compact:[&_.button]:py-2 lg:compact:[&_.button]:px-3 lg:compact:[&_.button]:text-[12px] lg:compact:[&_.button]:rounded-[7px] min-[2000px]:compact:[padding-inline:40px] min-[1280px]:[&:has(>_.has-discussion)]:max-w-[none] min-[1280px]:[&:has(>_.has-discussion)]:[padding-inline:24px] [&_.project-heading]:mt-0 compact:[&_.journey-content_>_.button.secondary]:text-[11px] compact:[&_.journey-content_>_.button.secondary]:min-h-7.5 compact:[&_.journey-content_>_.button.secondary]:py-1.5 compact:[&_.journey-content_>_.button.secondary]:px-2.5 pointer-coarse:compact:[&_.journey-content_>_.button.secondary]:min-h-11 lg:compact:[&_.answer-panel_h2]:my-1.5 lg:compact:[&_.answer-panel_h2]:mx-0 lg:compact:[&_.answer-panel_h2]:text-[14px] lg:compact:[&_.answer-panel_h2]:leading-[1.3] compact:[&_.stage-heading-row_.miniview-icon]:w-8 compact:[&_.stage-heading-row_.miniview-icon]:h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-w-8 compact:[&_.stage-heading-row_.miniview-icon]:p-0 compact:[&_.stage-heading-row_.miniview-icon]:rounded-[6px] pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:h-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-h-11 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:m-0 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:text-[13px] compact:[&_.journey-stage-heading_.stage-heading-row_h2]:leading-[1.3]"
      }
    >
      <div
        className={
          "project-list lg:compact:grid lg:compact:grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))] lg:compact:gap-2.5 lg:compact:items-stretch lg:compact:[&_>_h2]:[grid-column:1_/_-1] lg:compact:[&_>_h2]:mb-0 lg:compact:[&_>_.empty-state]:[grid-column:1_/_-1] lg:compact:[&_>_.empty-state]:mb-0"
        }
      >
        {cards.map((card) => (
          <article
            key={card.name}
            className={
              "project-card has-management block py-2.5 px-3.5 border border-line rounded-[9px] mb-2 [background:linear-gradient(120deg,_#21342c,_#182725)] relative hover:[border-color:#9cba7b] [&_.eyebrow]:flex [&_.eyebrow]:justify-between [&_p]:text-[14px] [&_p]:text-muted [&_p]:whitespace-pre-wrap [&_p]:wrap-anywhere [&_small]:text-muted [&_small]:text-[12px] lg:compact:py-2 lg:compact:px-3 lg:compact:rounded-[8px] lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:mt-1.25 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-1.75 lg:compact:[&_p]:leading-[1.45] lg:compact:[&_small]:text-[11px] [&.has-management_h3]:pr-15 pointer-coarse:[&.has-management_h3]:pr-23 lg:compact:mb-0"
            }
          >
            <a
              className={
                "project-card-link [color:inherit] no-underline focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] block"
              }
              href="#project"
            >
              <h3
                className={
                  "font-mono tracking-[-0.045em] font-semibold m-0 text-[15px] leading-[1.2] wrap-anywhere lg:compact:text-[13.5px]"
                }
              >
                {card.name}
              </h3>
              <ProjectTimeline stages={card.stages} t={t} />
            </a>
            <div className={"project-card-actions absolute top-[5px] right-[6px] flex gap-[2px]"}>
              <Button
                type="button"
                title={t("Edit project")}
                aria-label={t("Edit project")}
                className={
                  "lg:compact:min-h-8.5 lg:compact:py-2 lg:compact:px-3 lg:compact:text-[12px] lg:compact:rounded-[7px] p-0 w-6.5 min-h-6.5 bg-transparent text-muted text-[14px] pointer-coarse:w-11 pointer-coarse:min-h-11 [&:hover]:bg-line [&:hover]:text-lime"
                }
              >
                <Icon name="edit" />
              </Button>
              <Button
                type="button"
                title={t("Delete project")}
                aria-label={t("Delete project")}
                className={
                  "lg:compact:min-h-8.5 lg:compact:py-2 lg:compact:px-3 lg:compact:text-[12px] lg:compact:rounded-[7px] p-0 w-6.5 min-h-6.5 bg-transparent text-muted text-[14px] pointer-coarse:w-11 pointer-coarse:min-h-11 [&:hover]:bg-line [&:hover]:text-lime"
                }
              >
                <Icon name="delete" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Features/Projects/Project timeline",
  component: ProjectCardsPreview,
} satisfies Meta<typeof ProjectCardsPreview>;

export default meta;
export const CompactCards: StoryObj<typeof meta> = {};
