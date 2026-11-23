import { z } from "zod";
import type { Actor } from "@/shared/contracts/actor";
import { ProjectError } from "@/shared/contracts/errors";
import { membershipSchema } from "./row-schemas";
import { queryRows } from "./query";
import type { Database, Queryable } from "./database";

const uuid = z.uuid();
export function requireActor(actor: Actor) {
  if (!actor.userId) throw new ProjectError("Please sign in to continue.");
}
export async function membership(
  tx: Queryable,
  actor: Actor,
  projectId: string,
  ownerOnly = false,
) {
  requireActor(actor);
  if (!uuid.safeParse(projectId).success) throw new ProjectError("Project not found.");
  const rows = await queryRows(
    tx,
    membershipSchema,
    "SELECT role FROM project_memberships WHERE project_id = $1 AND user_id = $2 FOR SHARE",
    [projectId, actor.userId],
  );
  if (!rows[0] || (ownerOnly && rows[0].role !== "owner"))
    throw new ProjectError("Project not found or access is no longer available.");
  return rows[0];
}
const verifiedProject = Symbol("verified project membership");
export type ProjectRead = {
  readonly [verifiedProject]: true;
  readonly tx: Queryable;
  readonly actor: Actor;
  readonly projectId: string;
  readonly role: Awaited<ReturnType<typeof membership>>["role"];
};
export function withProjectRead<T>(
  db: Database,
  actor: Actor,
  projectId: string,
  read: (scope: ProjectRead) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    const { role } = await membership(tx, actor, projectId);
    return read({ [verifiedProject]: true, tx, actor, projectId, role });
  });
}

export async function lockProject(
  tx: Queryable,
  person: Actor,
  projectId: string,
  mode: "read" | "write",
) {
  const member = await membership(tx, person, projectId);
  await tx.query(
    mode === "write"
      ? "SELECT id FROM projects WHERE id=$1 FOR UPDATE"
      : "SELECT id FROM projects WHERE id=$1 FOR SHARE",
    [projectId],
  );
  return member;
}
