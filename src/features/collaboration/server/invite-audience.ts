import type { ProjectRead } from "@/server/database/membership";
import { ProjectError } from "@/shared/contracts/errors";
export type InviteAudience = ReturnType<typeof inviteAudience>;
export function inviteAudience(scope: ProjectRead, members: readonly { user_id: string }[]) {
  if (scope.role !== "owner") throw new ProjectError("Only the project owner can invite members.");
  return { person: scope.actor, members };
}
