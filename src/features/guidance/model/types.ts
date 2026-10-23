import type { DatabaseRows, ProjectState } from "@/shared/contracts/database.generated";
import type { Flow } from "./flows";
export type Answer = Omit<DatabaseRows["node_answers"], "project_id">;
export type Revision = Omit<DatabaseRows["answer_revisions"], "project_id" | "node_id">;
export type StageReview = Omit<DatabaseRows["stage_reviews"], "project_id">;
export type Guidance = {
  flow: Flow;
  answers: Answer[];
  reviews: StageReview[];
  projectState: ProjectState;
  contentRevision: number;
};
