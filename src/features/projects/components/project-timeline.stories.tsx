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
    <div className="workspace">
      <div className="project-list">
        {cards.map((card) => (
          <article key={card.name} className="project-card has-management">
            <a className="project-card-link" href="#project">
              <h3>{card.name}</h3>
              <ProjectTimeline stages={card.stages} t={t} />
            </a>
            <div className="project-card-actions">
              <Button type="button" title={t("Edit project")} aria-label={t("Edit project")}>
                <Icon name="edit" />
              </Button>
              <Button type="button" title={t("Delete project")} aria-label={t("Delete project")}>
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
