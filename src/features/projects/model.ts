import type { DatabaseRows } from "@/shared/contracts/database.generated";
export type Project = DatabaseRows["projects"] & Pick<DatabaseRows["project_memberships"], "role">;
export type Member = Pick<
  DatabaseRows["project_memberships"],
  "user_id" | "display_name" | "role" | "joined_at"
>;
export type Invitation = Pick<
  DatabaseRows["project_invitations"],
  "id" | "email" | "expires_at" | "accepted_at" | "revoked_at"
>;

export type StageProgress = {
  id: string;
  name: string;
  answered: number;
  total: number;
  started: boolean;
  reviewed: boolean;
  revisit: boolean;
  blocked: number;
  skipped: number;
};

export type LinkedProject = { id: string; name: string };
export type ProjectLinks = { sources: LinkedProject[]; children: LinkedProject[] };
