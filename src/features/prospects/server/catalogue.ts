import { browse } from "./browse";
import { salesSummaryFields, salesSummaryJoins } from "./sales-summary";
import { z } from "zod";
import type { Actor } from "@/shared/contracts/actor";
import { ProjectError } from "@/shared/contracts/errors";
import { withCatalogueRead, type CatalogueRead, catalogueId } from "./access";
import type { Database } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import { commandSchema, eventSchema, prospectSchema } from "../schemas";

const memberSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  full_access: z.boolean(),
  shared: z.boolean(),
});
const labelSchema = z.object({ display_name: z.string() });

export class ProspectConflict extends ProjectError {
  readonly diagnosticCategory = "conflict" as const;
}
function unavailable() {
  return new ProjectError("Prospect unavailable.");
}

async function canBrowseAll({ role, tx, catalogueId, actor }: CatalogueRead) {
  if (role === "owner") return true;
  const grants = await queryRows(
    tx,
    z.object({ user_id: z.string() }),
    "SELECT user_id FROM prospect_catalogue_grants WHERE catalogue_id=$1 AND user_id=$2 FOR SHARE",
    [catalogueId, actor.userId],
  );
  return grants.length > 0;
}
async function memberName({ tx, catalogueId }: CatalogueRead, userId: string) {
  const [member] = await queryRows(
    tx,
    labelSchema,
    "SELECT display_name FROM prospect_memberships WHERE catalogue_id=$1 AND user_id=$2 FOR SHARE",
    [catalogueId, userId],
  );
  if (!member) throw new ProjectError("Choose a catalogue collaborator.");
  return member.display_name;
}
const visible =
  "p.catalogue_id=$1 AND ($3::boolean OR p.assignee_id=$2 OR EXISTS(SELECT 1 FROM prospect_shares s WHERE s.catalogue_id=p.catalogue_id AND s.prospect_id=p.id AND s.user_id=$2))";
const summary = `SELECT p.id,p.name,p.details,p.status,p.revision,p.assignee_id,p.on_board,m.display_name AS assignee_name,
  EXISTS (SELECT 1 FROM prospect_events e WHERE e.catalogue_id=p.catalogue_id AND e.prospect_id=p.id AND e.kind='call') AS called,
  (SELECT e.note FROM prospect_events e WHERE e.catalogue_id=p.catalogue_id AND e.prospect_id=p.id
    AND (e.outcome IS NOT NULL OR e.kind IN ('call','message','reply')) ORDER BY e.id DESC LIMIT 1) AS latest_outcome,
  ${salesSummaryFields}
  FROM prospects p LEFT JOIN prospect_memberships m ON m.catalogue_id=p.catalogue_id AND m.user_id=p.assignee_id
  ${salesSummaryJoins("p.catalogue_id", "p.id")}`;

export function prospectService(db: Database) {
  return {
    read(person: Actor, selected?: string, page = 1, search = "", filters?: URLSearchParams) {
      return withCatalogueRead(db, person, async (scope) => {
        const { tx, role } = scope;
        const all = await canBrowseAll(scope);
        const values = [catalogueId, person.userId, all];
        if (selected !== undefined && !z.uuid().safeParse(selected).success) throw unavailable();
        const pageSize = 40;
        const currentPage = Number.isSafeInteger(page) && page > 0 && page <= 1000000 ? page : 1;
        const result = selected
          ? await queryRows(
              tx,
              prospectSchema,
              summary + " WHERE " + visible + " AND p.id=$4 FOR SHARE OF p",
              [...values, selected],
            )
          : filters
            ? []
            : await queryRows(
                tx,
                prospectSchema,
                summary +
                  " WHERE " +
                  visible +
                  " AND position(lower($6) in lower(p.name))>0 ORDER BY lower(p.name),p.id LIMIT $4 OFFSET $5",
                [...values, pageSize + 1, (currentPage - 1) * pageSize, search.slice(0, 300)],
              );
        const prospects = selected ? [] : result.slice(0, pageSize);
        const prospect = selected ? result[0] : undefined;
        if (selected && !prospect) throw unavailable();
        // Recheck visibility in the history query in case a handoff occurred during this read.
        const timeline = prospect
          ? await queryRows(
              tx,
              eventSchema,
              `SELECT e.id::text,e.kind,e.outcome,e.actor_name,e.previous_assignee,e.next_assignee,e.note,e.created_at,e.profile_changes
          FROM prospect_events e JOIN prospects p ON p.id=e.prospect_id AND p.catalogue_id=e.catalogue_id
          WHERE ${visible} AND p.id=$4 ORDER BY e.id DESC`,
              [...values, prospect.id],
            )
          : [];
        const research = prospect
          ? (
              await queryRows(
                tx,
                z.object({ research: z.record(z.string(), z.json()) }),
                "SELECT research FROM prospects WHERE catalogue_id=$1 AND id=$2",
                [catalogueId, prospect.id],
              )
            )[0]!.research
          : {};
        const sources = prospect
          ? await queryRows(
              tx,
              z.object({ source_rank: z.number(), payload: z.record(z.string(), z.json()) }),
              "SELECT source_rank,payload FROM prospect_sources WHERE catalogue_id=$1 AND prospect_id=$2 ORDER BY source_rank DESC",
              [catalogueId, prospect.id],
            )
          : [];
        const images = prospect
          ? await queryRows(
              tx,
              z.object({ sha256: z.string(), available: z.boolean() }),
              `SELECT r.sha256,f.sha256 IS NOT NULL AS available FROM prospect_image_refs r LEFT JOIN prospect_image_files f USING(catalogue_id,sha256)
          WHERE r.catalogue_id=$1 AND r.prospect_id=$2 ORDER BY (r.sha256=(SELECT cover_sha256 FROM prospect_sources WHERE catalogue_id=$1 AND prospect_id=$2 AND source_rank=2)) DESC NULLS LAST,r.sha256`,
              [catalogueId, prospect.id],
            )
          : [];
        const receipts =
          role === "owner" && !selected
            ? await queryRows(
                tx,
                z.object({
                  digest: z.string(),
                  completed_at: z.coerce.date(),
                  businesses: z.number(),
                  missing: z.number(),
                  tables: z.record(z.string(), z.number()),
                  format: z.string(),
                }),
                `SELECT digest,completed_at,(report->>'businesses')::int AS businesses,(report->>'missingImageFiles')::int AS missing,report->>'format' AS format,report->'tables' AS tables
          FROM prospect_imports WHERE catalogue_id=$1 AND completed_at IS NOT NULL ORDER BY completed_at DESC,sequence DESC LIMIT 20`,
                [catalogueId],
              )
            : [];
        const invitations =
          role === "owner" && !selected
            ? await queryRows(
                tx,
                z.object({
                  email: z.string(),
                  state: z.enum(["Pending", "Accepted", "Expired", "Revoked"]),
                }),
                "SELECT email,CASE WHEN revoked_at IS NOT NULL THEN 'Revoked' WHEN accepted_by IS NOT NULL THEN 'Accepted' WHEN expires_at<=now() THEN 'Expired' ELSE 'Pending' END AS state FROM prospect_invitations WHERE catalogue_id=$1 ORDER BY email",
                [catalogueId],
              )
            : [];
        const members =
          role === "owner"
            ? await queryRows(
                tx,
                memberSchema,
                `SELECT m.user_id,m.display_name,
          EXISTS(SELECT 1 FROM prospect_shares s WHERE s.catalogue_id=m.catalogue_id AND s.prospect_id=$2 AND s.user_id=m.user_id) AS shared,
          g.user_id IS NOT NULL AS full_access FROM prospect_memberships m LEFT JOIN prospect_catalogue_grants g USING(catalogue_id,user_id)
          WHERE m.catalogue_id=$1 ORDER BY lower(m.display_name),m.user_id`,
                [catalogueId, selected ?? null],
              )
            : [];
        const listing =
          filters && !selected ? await browse(scope, all, filters, currentPage, visible) : null;
        const todos = prospect
          ? await queryRows(
              tx,
              z.object({ id: z.uuid(), title: z.string(), done: z.boolean() }),
              "SELECT id,title,done FROM prospect_todos WHERE catalogue_id=$1 AND prospect_id=$2 ORDER BY created_at,id",
              [catalogueId, prospect.id],
            )
          : [];
        const linear = prospect
          ? ((
              await queryRows(
                tx,
                z.object({ linear_url: z.string().nullable() }),
                "SELECT linear_url FROM prospects WHERE catalogue_id=$1 AND id=$2",
                [catalogueId, prospect.id],
              )
            )[0]?.linear_url ?? null)
          : null;
        return {
          availableStages: scope.availableStages,
          listing,
          todos,
          linear,
          prospects,
          prospect,
          timeline,
          research,
          sources,
          images,
          receipts,
          members,
          invitations,
          owner: role === "owner",
          all,
          page: currentPage,
          hasNext: !selected && result.length > pageSize,
        };
      });
    },
    image(person: Actor, id: string, hash: string) {
      return withCatalogueRead(db, person, async (scope) => {
        if (!z.uuid().safeParse(id).success || !/^[a-f0-9]{64}$/.test(hash)) throw unavailable();
        const all = await canBrowseAll(scope);
        const [f] = await queryRows(
          scope.tx,
          z.object({ media_type: z.string(), content: z.instanceof(Uint8Array) }),
          `SELECT f.content,f.media_type FROM prospects p JOIN prospect_image_refs r ON r.catalogue_id=p.catalogue_id AND r.prospect_id=p.id
          JOIN prospect_image_files f ON f.catalogue_id=r.catalogue_id AND f.sha256=r.sha256 WHERE ${visible} AND p.id=$4 AND f.sha256=$5`,
          [catalogueId, person.userId, all, id, hash],
        );
        if (!f) throw unavailable();
        return f;
      });
    },
    change(person: Actor, input: unknown) {
      return withCatalogueRead(db, person, async (scope) => {
        const { tx, role } = scope;
        const parsed = commandSchema.safeParse(input);
        if (!parsed.success) throw new ProjectError("Check the prospect details and try again.");
        const cmd = parsed.data;
        if (
          !["log", "my_board", "stage", "linear", "todo_add", "todo_check"].includes(cmd.type) &&
          role !== "owner"
        )
          throw unavailable();
        if (cmd.type === "add") {
          const { id, name, details } = cmd.record;
          const inserted = await queryRows(
            tx,
            z.object({ id: z.uuid() }),
            `INSERT INTO prospects(catalogue_id,id,name,details,edited_name,edited_details)
            VALUES($1,$2,$3,$4,true,true) ON CONFLICT(catalogue_id,id) DO NOTHING RETURNING id`,
            [catalogueId, id, name, details],
          );
          if (!inserted.length) {
            const [match] = await queryRows(
              tx,
              z.object({ matches: z.boolean() }),
              "SELECT name=$3 AND details=$4 AS matches FROM prospects WHERE catalogue_id=$1 AND id=$2 FOR SHARE",
              [catalogueId, id, name, details],
            );
            if (!match?.matches)
              throw new ProspectConflict(
                "This prospect changed. Review the timeline before saving again.",
              );
          }
          return { added: inserted.length };
        }
        if (cmd.type === "invite" || cmd.type === "cancel_invite") {
          const email = cmd.email.toLowerCase();
          if (cmd.type === "invite")
            await tx.query(
              "INSERT INTO prospect_invitations(catalogue_id,email) SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM prospect_memberships WHERE catalogue_id=$1 AND joined_email=$2) ON CONFLICT (catalogue_id,email) DO UPDATE SET revoked_at=NULL,accepted_by=NULL,expires_at=excluded.expires_at WHERE prospect_invitations.revoked_at IS NOT NULL OR (prospect_invitations.accepted_by IS NULL AND prospect_invitations.expires_at<=now())",
              [catalogueId, email],
            );
          else
            await tx.query(
              "UPDATE prospect_invitations SET revoked_at=now() WHERE catalogue_id=$1 AND email=$2 AND accepted_by IS NULL AND revoked_at IS NULL",
              [catalogueId, email],
            );
          return;
        }
        if (cmd.type === "remove") {
          if (cmd.userId === person.userId)
            throw new ProjectError("The owner already has full access.");
          await tx.query("SELECT id FROM prospect_catalogues WHERE id=$1 FOR NO KEY UPDATE", [
            catalogueId,
          ]);
          await tx.query(
            "UPDATE prospect_invitations SET revoked_at=now() WHERE catalogue_id=$1 AND accepted_by=$2 AND revoked_at IS NULL",
            [catalogueId, cmd.userId],
          );
          await tx.query(
            "DELETE FROM prospect_memberships WHERE catalogue_id=$1 AND user_id=$2 AND role='member'",
            [catalogueId, cmd.userId],
          );
          return;
        }
        if (cmd.type === "share") {
          await memberName(scope, cmd.userId);
          const [row] = await queryRows(
            tx,
            z.object({ id: z.uuid() }),
            "SELECT id FROM prospects WHERE catalogue_id=$1 AND id=$2 FOR SHARE",
            [catalogueId, cmd.id],
          );
          if (!row) throw unavailable();
          if (cmd.enabled)
            await tx.query("INSERT INTO prospect_shares VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [
              catalogueId,
              cmd.id,
              cmd.userId,
            ]);
          else
            await tx.query(
              "DELETE FROM prospect_shares WHERE catalogue_id=$1 AND prospect_id=$2 AND user_id=$3",
              [catalogueId, cmd.id, cmd.userId],
            );
          return;
        }
        if (cmd.type === "access") {
          if (cmd.userId === person.userId)
            throw new ProjectError("The owner already has full access.");
          await memberName(scope, cmd.userId);
          if (cmd.enabled)
            await tx.query(
              "INSERT INTO prospect_catalogue_grants(catalogue_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
              [catalogueId, cmd.userId],
            );
          else
            await tx.query(
              "DELETE FROM prospect_catalogue_grants WHERE catalogue_id=$1 AND user_id=$2",
              [catalogueId, cmd.userId],
            );
          return;
        }
        if (cmd.type === "assign" || cmd.type === "my_board") {
          // Membership removal takes this same lock before releasing the member's assignments.
          await tx.query("SELECT id FROM prospect_catalogues WHERE id=$1 FOR NO KEY UPDATE", [
            catalogueId,
          ]);
        }
        const all = await canBrowseAll(scope);
        const [current] = await queryRows(
          tx,
          prospectSchema.pick({ assignee_id: true, status: true, revision: true, on_board: true }),
          `SELECT p.assignee_id,p.status,p.revision,p.on_board FROM prospects p WHERE ${visible} AND p.id=$4 FOR UPDATE`,
          [catalogueId, person.userId, all, cmd.id],
        );
        if (!current) throw unavailable();
        if (current.revision !== cmd.revision)
          throw new ProspectConflict(
            "This prospect changed. Review the timeline before saving again.",
          );
        const actorName = await memberName(scope, person.userId);
        if (cmd.type === "my_board") {
          const unassigned = current.assignee_id === null;
          if (
            current.assignee_id !== person.userId &&
            !(unassigned && role === "owner" && cmd.enabled)
          )
            throw unavailable();
          if (current.on_board === cmd.enabled) return;
          await tx.query(
            "UPDATE prospects SET on_board=$4,assignee_id=$3,revision=revision+1 WHERE catalogue_id=$1 AND id=$2",
            [catalogueId, cmd.id, person.userId, cmd.enabled],
          );
          if (unassigned)
            await tx.query(
              "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,next_assignee,next_assignee_id) VALUES($1,$2,'assignment',$3,$4,$4,$3)",
              [catalogueId, cmd.id, person.userId, actorName],
            );
          await tx.query(
            "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,profile_changes) VALUES($1,$2,'stage',$3,$4,$5)",
            [
              catalogueId,
              cmd.id,
              person.userId,
              actorName,
              JSON.stringify({
                board: cmd.enabled ? "added" : "removed",
                from: current.status,
                to: current.status,
              }),
            ],
          );
          return;
        }
        if (
          cmd.type === "stage" ||
          cmd.type === "linear" ||
          cmd.type === "todo_add" ||
          cmd.type === "todo_check"
        ) {
          let kind: "stage" | "profile" = "profile";
          let changes: Record<string, unknown>;
          if (cmd.type === "stage") {
            if (!scope.availableStages.includes(cmd.status))
              throw new ProjectError("Choose a current sales stage.");
            if (current.status === "assess_fit" && cmd.status !== "assess_fit")
              throw new ProjectError(
                "Use the private assessment to mark this business ready to call.",
              );
            if (cmd.status === "assess_fit" && role !== "owner") throw unavailable();
            const entering =
              !current.on_board && current.assignee_id === person.userId && cmd.status === "ready";
            if (cmd.status === current.status && !entering) return;
            await tx.query(
              "UPDATE prospects SET status=$3,on_board=on_board OR $4 WHERE catalogue_id=$1 AND id=$2",
              [catalogueId, cmd.id, cmd.status, entering],
            );
            kind = "stage";
            changes = {
              from: current.status,
              to: cmd.status,
              ...(entering ? { board: "added" } : {}),
            };
          } else if (cmd.type === "linear") {
            const result = await tx.query(
              "UPDATE prospects SET linear_url=$3 WHERE catalogue_id=$1 AND id=$2 AND linear_url IS DISTINCT FROM $3 RETURNING id",
              [catalogueId, cmd.id, cmd.url],
            );
            if (!result.rows.length) return;
            changes = { linear: cmd.url ? "linked" : "cleared" };
          } else if (cmd.type === "todo_add") {
            const result = await tx.query(
              "INSERT INTO prospect_todos(catalogue_id,prospect_id,id,title) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id",
              [catalogueId, cmd.id, cmd.todoId, cmd.title],
            );
            if (!result.rows.length) return;
            changes = { todo: cmd.title, done: false };
          } else {
            const [item] = await queryRows(
              tx,
              z.object({ title: z.string() }),
              "UPDATE prospect_todos SET done=$4 WHERE catalogue_id=$1 AND prospect_id=$2 AND id=$3 AND done<>$4 RETURNING title",
              [catalogueId, cmd.id, cmd.todoId, cmd.done],
            );
            if (!item) return;
            changes = { todo: item.title, done: cmd.done };
          }
          await tx.query(
            "UPDATE prospects SET revision=revision+1 WHERE catalogue_id=$1 AND id=$2",
            [catalogueId, cmd.id],
          );
          await tx.query(
            "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,profile_changes) VALUES($1,$2,$3,$4,$5,$6)",
            [catalogueId, cmd.id, kind, person.userId, actorName, JSON.stringify(changes)],
          );
          return;
        }
        if (cmd.type === "profile") {
          const fields = cmd.research ?? {};
          if (
            Object.keys(fields).some((k) => !k.trim()) ||
            Buffer.byteLength(JSON.stringify(fields)) > 200000
          )
            throw new ProjectError("Check the prospect details and try again.");
          await tx.query(
            `UPDATE prospects SET name=coalesce($3,name),details=coalesce($4,details),
            edited_name=edited_name OR ($3::text IS NOT NULL AND name IS DISTINCT FROM $3),
            edited_details=edited_details OR ($4::text IS NOT NULL AND details IS DISTINCT FROM $4),
            research=research || $5::jsonb,revision=revision+1 WHERE catalogue_id=$1 AND id=$2`,
            [catalogueId, cmd.id, cmd.name ?? null, cmd.details ?? null, JSON.stringify(fields)],
          );
          await tx.query(
            "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,profile_changes) VALUES($1,$2,'profile',$3,$4,$5::jsonb)",
            [
              catalogueId,
              cmd.id,
              person.userId,
              actorName,
              JSON.stringify({ name: cmd.name, details: cmd.details, research: cmd.research }),
            ],
          );
          return;
        }
        if (cmd.type === "assign") {
          if (current.assignee_id === cmd.assignee) return;
          const from = current.assignee_id ? await memberName(scope, current.assignee_id) : null;
          const to = cmd.assignee ? await memberName(scope, cmd.assignee) : null;
          await tx.query(
            "UPDATE prospects SET assignee_id=$3,revision=revision+1 WHERE catalogue_id=$1 AND id=$2",
            [catalogueId, cmd.id, cmd.assignee],
          );
          await tx.query(
            `INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,previous_assignee,next_assignee,previous_assignee_id,next_assignee_id)
            VALUES($1,$2,'assignment',$3,$4,$5,$6,$7,$8)`,
            [
              catalogueId,
              cmd.id,
              person.userId,
              actorName,
              from,
              to,
              current.assignee_id,
              cmd.assignee,
            ],
          );
          return;
        }
        await tx.query("UPDATE prospects SET revision=revision+1 WHERE catalogue_id=$1 AND id=$2", [
          catalogueId,
          cmd.id,
        ]);
        await tx.query(
          "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,note,outcome) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [catalogueId, cmd.id, cmd.kind, person.userId, actorName, cmd.note, cmd.outcome ?? null],
        );
        return;
      });
    },
  };
}
