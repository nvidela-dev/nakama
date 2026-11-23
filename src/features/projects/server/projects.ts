import { membershipSchema } from "@/server/database/row-schemas";
import { flowCountSchema } from "./schemas";
import {
  projectNameSchema,
  projectDescriptionSchema,
  uuidSchema as uuid,
} from "@/shared/contracts/domain-schemas";
import {
  membership,
  requireActor,
  withProjectRead,
  type ProjectRead,
} from "@/server/database/membership";
import { isLinearLink } from "@/shared/contracts/linear-link";
import { listPage, listPageSize, readListCursor } from "@/server/database/list-page";
import { invitationAcceptanceSchema, invitationSchema } from "@/features/projects/server/schemas";
import { projectSchema, memberSchema } from "@/server/database/row-schemas";
import { flowIdSchema } from "@/shared/contracts/domain-schemas";
import { queryRows, required } from "@/server/database/query";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { recordActivity } from "@/server/database/activity-log";
import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";

import { ProjectError } from "@/shared/contracts/errors";
import type { Actor } from "@/shared/contracts/actor";
export type { Project, Member, Invitation } from "@/features/projects/model";
const projectInput = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
});

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export async function readProject({ tx, projectId, role }: ProjectRead) {
  const rows = await queryRows(
    tx,
    projectSchema.omit({ role: true }),
    "SELECT * FROM projects WHERE id = $1",
    [projectId],
  );
  return { ...required(rows[0]), role: role };
}
export async function readPeople({ tx, projectId, role }: ProjectRead) {
  const members = await queryRows(
    tx,
    memberSchema,
    "SELECT user_id, display_name, role, joined_at FROM project_memberships WHERE project_id = $1 ORDER BY joined_at",
    [projectId],
  );
  const invitations =
    role === "owner"
      ? await queryRows(
          tx,
          invitationSchema,
          "SELECT id, email, expires_at, accepted_at, revoked_at FROM project_invitations WHERE project_id = $1 ORDER BY created_at DESC",
          [projectId],
        )
      : [];
  return { members, invitations };
}
function projectChoices(tx: Queryable, actor: Actor, activeOnly = false) {
  requireActor(actor);
  return queryRows(
    tx,
    projectSchema.pick({ id: true, name: true }).extend({ flow_id: flowIdSchema.nullable() }),
    "SELECT p.id,p.name,f.flow_id FROM projects p JOIN project_memberships m ON m.project_id=p.id LEFT JOIN project_flows f ON f.project_id=p.id WHERE m.user_id=$1 AND (NOT $2::boolean OR NOT p.archived) ORDER BY p.created_at DESC,p.id",
    [actor.userId, activeOnly],
  );
}
export function readProjectChoices({ tx, actor }: ProjectRead) {
  return projectChoices(tx, actor);
}
const projectSummary = projectSchema.extend({
  flow_id: flowIdSchema.nullable(),
  content_revision: z.number().int().nonnegative(),
});
const projectListSql = `SELECT p.*,m.role,f.flow_id,COALESCE(f.content_revision,0) AS content_revision,
  to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
  FROM projects p JOIN project_memberships m ON m.project_id=p.id
  LEFT JOIN project_flows f ON f.project_id=p.id WHERE m.user_id=$1`;
export function projectService(db: Database) {
  return {
    saveLinearLink(person: Actor, projectId: string, revision: number, input: string) {
      return db.transaction(async (tx) => {
        await membership(tx, person, projectId, true);
        const url = input.trim() || null;
        if ((url && !isLinearLink(url, true)) || !Number.isSafeInteger(revision) || revision < 0)
          throw new ProjectError("Enter a direct Linear project URL.");
        const change = await tx.query(
          "UPDATE projects SET linear_project_url=$3,linear_link_revision=linear_link_revision+1 WHERE id=$1 AND linear_link_revision=$2 RETURNING id",
          [projectId, revision, url],
        );
        if (!change.rows.length)
          throw new ProjectError("The Linear link changed. Reload before saving.");
      });
    },
    async create(actor: Actor, input: unknown) {
      requireActor(actor);
      const parsed = projectInput.safeParse(input);
      if (!parsed.success)
        throw new ProjectError(
          "Add a name (up to 100 characters) and a description (up to 2,000).",
        );
      const id = randomUUID();
      await db.transaction(async (tx) => {
        await tx.query("INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)", [
          id,
          parsed.data.name,
          parsed.data.description,
        ]);
        await tx.query(
          "INSERT INTO project_memberships (project_id, user_id, display_name, role) VALUES ($1, $2, $3, 'owner')",
          [id, actor.userId, actor.displayName || "Crew member"],
        );
        await recordActivity(tx, actor, id, "project_created");
      });
      return id;
    },
    async setArchived(actor: Actor, projectId: string, archived: boolean) {
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const changed = await queryRows(
          tx,
          projectSchema.pick({ id: true }),
          "UPDATE projects SET archived=$2 WHERE id=$1 AND archived<>$2 RETURNING id",
          [projectId, archived],
        );
        if (changed.length)
          await recordActivity(
            tx,
            actor,
            projectId,
            archived ? "project_archived" : "project_restored",
          );
      });
    },
    async deleteProject(actor: Actor, projectId: string, confirmation: string) {
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const project = (
          await queryRows(
            tx,
            projectSchema.pick({ name: true }),
            "SELECT name FROM projects WHERE id = $1 FOR UPDATE",
            [projectId],
          )
        )[0];
        if (!project || confirmation !== project.name)
          throw new ProjectError("Type the project name exactly to confirm deletion.");
        await tx.query("DELETE FROM projects WHERE id = $1", [projectId]);
      });
    },
    async list(actor: Actor) {
      requireActor(actor);
      return queryRows(db, projectSummary, projectListSql + " ORDER BY p.created_at DESC,p.id", [
        actor.userId,
      ]);
    },
    choices: (actor: Actor, options?: { activeOnly: boolean }) =>
      projectChoices(db, actor, options?.activeOnly),
    async page(actor: Actor, after?: string, archived = false) {
      requireActor(actor);
      const [time, id] = readListCursor(after);
      const rows = await queryRows(
        db,
        projectSummary.extend({ cursor_time: z.string() }),
        projectListSql +
          `
        AND p.archived=$5 AND ($2::timestamptz IS NULL OR p.created_at < $2 OR (p.created_at=$2 AND p.id>$3::uuid))
        ORDER BY p.created_at DESC,p.id LIMIT $4`,
        [actor.userId, time, id, listPageSize + 1, archived],
      );
      return listPage(rows);
    },
    async groupCounts(actor: Actor, archived = false) {
      requireActor(actor);
      return queryRows(
        db,
        flowCountSchema,
        "SELECT f.flow_id,count(*)::int AS total FROM project_memberships m JOIN projects p ON p.id=m.project_id LEFT JOIN project_flows f ON f.project_id=m.project_id WHERE m.user_id=$1 AND p.archived=$2 GROUP BY f.flow_id",
        [actor.userId, archived],
      );
    },
    async get(actor: Actor, projectId: string) {
      return withProjectRead(db, actor, projectId, readProject);
    },
    async people(actor: Actor, projectId: string) {
      return withProjectRead(db, actor, projectId, readPeople);
    },
    async invite(
      actor: Actor,
      projectId: string,
      input: unknown,
      recipientIds: readonly string[] = [],
    ) {
      const parsed = z.email().trim().toLowerCase().max(254).safeParse(input);
      if (!parsed.success) throw new ProjectError("Enter a valid email address.");
      const email = parsed.data;
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        // Serialize invitation replacement for this project, including simultaneous submissions.
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR NO KEY UPDATE", [projectId]);
        if (
          recipientIds.length &&
          (
            await queryRows(
              tx,
              membershipSchema,
              "SELECT role FROM project_memberships WHERE project_id=$1 AND user_id=ANY($2::text[]) LIMIT 1",
              [projectId, recipientIds],
            )
          ).length
        )
          throw new ProjectError("Choose an approved person who is not already a project member.");
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
      if (!uuid.safeParse(invitationId).success) throw new ProjectError("Invitation not found.");
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const revoked = await queryRows(
          tx,
          invitationSchema.pick({ id: true }),
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
        // Acceptance and issue/replacement take the project lock before an invitation row.
        await tx.query(
          `SELECT p.id FROM projects p JOIN project_invitations i ON i.project_id=p.id
          WHERE i.token_hash=$1 AND i.email=ANY($2::text[]) FOR NO KEY UPDATE OF p`,
          [digest(token), actor.verifiedEmails.map((email) => email.toLowerCase())],
        );
        const rows = await queryRows(
          tx,
          invitationAcceptanceSchema,
          "SELECT project_id, email, invited_by, accepted_by, revoked_at, expires_at <= now() AS expired FROM project_invitations WHERE token_hash = $1 FOR UPDATE",
          [digest(token)],
        );
        const invitation = rows[0];
        if (
          !invitation ||
          invitation.revoked_at ||
          !actor.verifiedEmails.map((e) => e.toLowerCase()).includes(invitation.email)
        )
          throw new ProjectError("This invitation is unavailable for your verified email.");
        if (invitation.accepted_by) {
          if (invitation.accepted_by !== actor.userId)
            throw new ProjectError("This invitation is unavailable.");
          await membership(tx, actor, invitation.project_id);
          return invitation.project_id;
        }
        if (invitation.expired)
          throw new ProjectError("This invitation has expired. Ask for a new link.");
        await membership(
          tx,
          { userId: invitation.invited_by, verifiedEmails: [] },
          invitation.project_id,
          true,
        );
        const joined = await queryRows(
          tx,
          memberSchema.pick({ user_id: true }),
          "INSERT INTO project_memberships (project_id, user_id, display_name, role) VALUES ($1, $2, $3, 'member') ON CONFLICT DO NOTHING RETURNING user_id",
          [invitation.project_id, actor.userId, actor.displayName || "Crew member"],
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
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR NO KEY UPDATE", [projectId]);
        // Lock invitation rows before deleting membership, matching accept's lock order.
        // Revoke unused links to addresses this member previously used to join.
        const emails = await queryRows(
          tx,
          invitationSchema.pick({ email: true }),
          "SELECT DISTINCT email FROM project_invitations WHERE project_id = $1 AND accepted_by = $2",
          [projectId, userId],
        );
        if (emails.length)
          await tx.query(
            "UPDATE project_invitations SET revoked_at = now() WHERE project_id = $1 AND email = ANY($2::text[]) AND accepted_at IS NULL AND revoked_at IS NULL",
            [projectId, emails.map((row) => row.email)],
          );
        const removed = await queryRows(
          tx,
          memberSchema.pick({ display_name: true }),
          "DELETE FROM project_memberships WHERE project_id = $1 AND user_id = $2 AND role = 'member' RETURNING display_name",
          [projectId, userId],
        );
        const removedMember = removed[0];
        if (removedMember)
          await recordActivity(tx, actor, projectId, "member_removed", {
            subjectName: removedMember.display_name,
          });
      });
    },
  };
}
