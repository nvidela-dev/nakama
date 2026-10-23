import { invitationAcceptanceSchema, projectSchema, membershipSchema, memberSchema, invitationSchema } from "./row-schemas";
import type { DatabaseRows } from "./database.generated";
import { queryRows, required } from "./query";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { recordActivity } from "./activity-log";
import { z } from "zod";
import type { Database, Queryable } from "./database";

import { ProjectError } from "./errors";
export { ProjectError } from "./errors";
export type Actor = {
  userId: string;
  verifiedEmails: string[];
  displayName?: string;
};
export type Project = DatabaseRows["projects"] & Pick<DatabaseRows["project_memberships"],"role">;
export type Member = Pick<DatabaseRows["project_memberships"],"user_id"|"display_name"|"role"|"joined_at">;
export type Invitation = Pick<DatabaseRows["project_invitations"],"id"|"email"|"expires_at"|"accepted_at"|"revoked_at">;
const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
});
const uuid = z.uuid();
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
function requireActor(actor: Actor) {
  if (!actor.userId) throw new ProjectError("Please sign in to continue.");
}
export async function membership(
  tx: Queryable,
  actor: Actor,
  projectId: string,
  ownerOnly = false,
) {
  requireActor(actor);
  if (!uuid.safeParse(projectId).success)
    throw new ProjectError("Project not found.");
  const rows = await queryRows(tx,membershipSchema,
    "SELECT role FROM project_memberships WHERE project_id = $1 AND user_id = $2 FOR SHARE",
    [projectId, actor.userId],
  );
  if (!rows[0] || (ownerOnly && rows[0].role !== "owner"))
    throw new ProjectError(
      "Project not found or access is no longer available.",
    );
  return rows[0];
}
export function projectService(db: Database) {
  return {
    async create(actor: Actor, input: unknown) {
      requireActor(actor);
      const parsed = projectInput.safeParse(input);
      if (!parsed.success)
        throw new ProjectError(
          "Add a name (up to 100 characters) and a description (up to 2,000).",
        );
      const id = randomUUID();
      await db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)",
          [id, parsed.data.name, parsed.data.description],
        );
        await tx.query(
          "INSERT INTO project_memberships (project_id, user_id, display_name, role) VALUES ($1, $2, $3, 'owner')",
          [id, actor.userId, actor.displayName || "Crew member"],
        );
        await recordActivity(tx, actor, id, "project_created");
      });
      return id;
    },
    async deleteProject(actor: Actor, projectId: string, confirmation: string) {
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const project = (await queryRows(tx,projectSchema.pick({name:true}),"SELECT name FROM projects WHERE id = $1 FOR UPDATE", [projectId]))[0];
        if (!project || confirmation !== project.name)
          throw new ProjectError("Type the project name exactly to confirm deletion.");
        // Delete dependent records first. All removals are scoped to this project and atomic.
        for (const table of ["project_artifacts", "answer_revisions", "node_answers", "stage_review_history", "stage_reviews", "project_flows", "project_invitations", "project_memberships"])
          await tx.query(`DELETE FROM ${table} WHERE project_id = $1`, [projectId]);
        await tx.query("DELETE FROM projects WHERE id = $1", [projectId]);
      });
    },
    async list(actor: Actor) {
      requireActor(actor);
      return queryRows(db,projectSchema.extend({content_revision:z.number().int().nonnegative()}),
          "SELECT p.*, m.role, COALESCE(f.content_revision, 0) AS content_revision FROM projects p JOIN project_memberships m ON m.project_id = p.id LEFT JOIN project_flows f ON f.project_id = p.id WHERE m.user_id = $1 ORDER BY p.created_at DESC, p.id",
          [actor.userId],
      );
    },
    async get(actor: Actor, projectId: string) {
      return db.transaction(async (tx) => {
        const member = await membership(tx, actor, projectId);
        const rows = await queryRows(tx,projectSchema.omit({role:true}),
          "SELECT * FROM projects WHERE id = $1",
          [projectId],
        );
        return { ...required(rows[0]), role: member.role };
      });
    },
    async people(actor: Actor, projectId: string) {
      return db.transaction(async (tx) => {
        const member = await membership(tx, actor, projectId);
        const members = (
          await queryRows(tx,memberSchema,
            "SELECT user_id, display_name, role, joined_at FROM project_memberships WHERE project_id = $1 ORDER BY joined_at",
            [projectId],
          )
        );
        const invitations =
          member.role === "owner"
            ? (
                await queryRows(tx,invitationSchema,
                  "SELECT id, email, expires_at, accepted_at, revoked_at FROM project_invitations WHERE project_id = $1 ORDER BY created_at DESC",
                  [projectId],
                )
              )
            : [];
        return { members, invitations };
      });
    },
    async invite(actor: Actor, projectId: string, input: unknown) {
      const parsed = z.email().trim().toLowerCase().max(254).safeParse(input);
      if (!parsed.success)
        throw new ProjectError("Enter a valid email address.");
      const email = parsed.data;
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        // Serialize invitation replacement for this project, including simultaneous submissions.
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR NO KEY UPDATE", [
          projectId,
        ]);
        await tx.query(
          "UPDATE project_invitations SET revoked_at = now() WHERE project_id = $1 AND email = $2 AND accepted_at IS NULL AND revoked_at IS NULL",
          [projectId, email],
        );
        const token = randomBytes(32).toString("base64url");
        const id = randomUUID();
        await tx.query(
          "INSERT INTO project_invitations (id, project_id, email, token_hash, invited_by, expires_at) VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')",
          [id, projectId, email, digest(token), actor.userId],
        );
        await recordActivity(tx, actor, projectId, "invitation_created");
        return { id, token };
      });
    },
    async revoke(actor: Actor, projectId: string, invitationId: string) {
      if (!uuid.safeParse(invitationId).success)
        throw new ProjectError("Invitation not found.");
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const revoked = await queryRows(tx,invitationSchema.pick({id:true}),
          "UPDATE project_invitations SET revoked_at = now() WHERE id = $1 AND project_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id",
          [invitationId, projectId],
        );
        if (revoked.length) await recordActivity(tx, actor, projectId, "invitation_revoked");
      });
    },
    async accept(actor: Actor, token: string) {
      requireActor(actor);
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new ProjectError("This invitation is unavailable.");
      return db.transaction(async (tx) => {
        const rows = await queryRows(tx,invitationAcceptanceSchema,"SELECT project_id, email, invited_by, accepted_by, revoked_at, expires_at <= now() AS expired FROM project_invitations WHERE token_hash = $1 FOR UPDATE", [digest(token)]);
        const invitation = rows[0];
        if (
          !invitation ||
          invitation.revoked_at ||
          !actor.verifiedEmails
            .map((e) => e.toLowerCase())
            .includes(invitation.email)
        )
          throw new ProjectError(
            "This invitation is unavailable for your verified email.",
          );
        if (invitation.accepted_by) {
          if (invitation.accepted_by !== actor.userId)
            throw new ProjectError("This invitation is unavailable.");
          await membership(tx, actor, invitation.project_id);
          return invitation.project_id;
        }
        if (invitation.expired)
          throw new ProjectError(
            "This invitation has expired. Ask for a new link.",
          );
        await membership(
          tx,
          { userId: invitation.invited_by, verifiedEmails: [] },
          invitation.project_id,
          true,
        );
        const joined = await queryRows(tx,memberSchema.pick({user_id:true}),
          "INSERT INTO project_memberships (project_id, user_id, display_name, role) VALUES ($1, $2, $3, 'member') ON CONFLICT DO NOTHING RETURNING user_id",
          [
            invitation.project_id,
            actor.userId,
            actor.displayName || "Crew member",
          ],
        );
        await tx.query(
          "UPDATE project_invitations SET accepted_by = $1, accepted_at = now() WHERE token_hash = $2",
          [actor.userId, digest(token)],
        );
        if (joined.length) await recordActivity(tx, actor, invitation.project_id, "member_joined");
        return invitation.project_id;
      });
    },
    async remove(actor: Actor, projectId: string, userId: string) {
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR NO KEY UPDATE", [
          projectId,
        ]);
        // Lock invitation rows before deleting membership, matching accept's lock order.
        // Revoke unused links to addresses this member previously used to join.
        const emails = await queryRows(tx,invitationSchema.pick({email:true}),"SELECT DISTINCT email FROM project_invitations WHERE project_id = $1 AND accepted_by = $2", [projectId, userId]);
        if (emails.length)
          await tx.query(
            "UPDATE project_invitations SET revoked_at = now() WHERE project_id = $1 AND email = ANY($2::text[]) AND accepted_at IS NULL AND revoked_at IS NULL",
            [projectId, emails.map((row) => row.email)],
          );
        const removed = await queryRows(tx,memberSchema.pick({display_name:true}),"DELETE FROM project_memberships WHERE project_id = $1 AND user_id = $2 AND role = 'member' RETURNING display_name", [projectId, userId]);
        const removedMember=removed[0];
        if (removedMember) await recordActivity(tx, actor, projectId, "member_removed", { subjectName: removedMember.display_name });
      });
    },
  };
}
