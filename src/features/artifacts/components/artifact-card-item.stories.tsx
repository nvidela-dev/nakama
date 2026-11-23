import type { Meta } from "@storybook/nextjs-vite";
import { ArtifactCardItem } from "./artifact-card-item";
import type { ArtifactCard } from "../model";
export default { title: "Artifacts/Card" } satisfies Meta;
const card: ArtifactCard = {
  id: "design",
  project_id: "workshop",
  project_name: "Design workshop",
  name: "First prototype",
  description: "Initial layout",
  flow_id: null,
  stage_id: null,
  kind: "markdown",
  status: "in_progress",
  github_url: null,
  revision: 1,
  updated_at: new Date("2026-01-01Z"),
  collection: null,
  shirt_poster: null,
  shirt_cover: null,
  cover_id: null,
  file_count: 1,
  task_count: 3,
  done_task_count: 2,
};
export const ProjectLibrary = {
  render: () => <ArtifactCardItem card={card} showProject={false} />,
};
export const GlobalLibrary = { render: () => <ArtifactCardItem card={card} showProject /> };
