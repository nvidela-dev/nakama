import { z } from "zod";
import type { Actor } from "@/shared/contracts/actor";
import { ProjectError } from "@/shared/contracts/errors";
import type { Database, Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import { catalogueId, catalogueMembership } from "./access";
import { assessmentSchema, callReviewSchema, reviewCommand, reviewCursor } from "../review-schema";
import type { PrivateProspectReview } from "../review-model";
import { ProspectStatusValues } from "@/shared/contracts/database.generated";

const revision = z.number().int().positive();
const assessmentRow = z.object({ revision, value: assessmentSchema });
const draftRow = z.object({ id: z.string(), revision, value: callReviewSchema });
const recordedRow = z.object({
  id: z.string(),
  recorded_at: z.coerce.date(),
  value: callReviewSchema,
});
const currentProspect = z.object({
  status: z.enum(ProspectStatusValues),
  display_name: z.string(),
});
const size = 25;
const unavailable = () => new ProjectError("Prospect review unavailable.");
const conflict = () => new ProjectError("This draft changed. Refresh before saving again.");

async function requireOwnerProspect(
  tx: Queryable,
  actor: Actor,
  prospectId: string,
  lock: boolean,
) {
  await catalogueMembership(tx, actor, true);
  const [p] = await queryRows(
    tx,
    currentProspect,
    `SELECT p.status,m.display_name FROM prospects p JOIN prospect_memberships m ON m.catalogue_id=p.catalogue_id AND m.user_id=$3
      WHERE p.catalogue_id=$1 AND p.id=$2 ${lock ? "FOR UPDATE OF p" : "FOR SHARE OF p"}`,
    [catalogueId, prospectId, actor.userId],
  );
  if (!p) throw unavailable();
  return p;
}

export function prospectReview(db: Database) {
  return {
    read(actor: Actor, prospectId: string, before?: string): Promise<PrivateProspectReview> {
      if (!z.uuid().safeParse(prospectId).success) throw unavailable();
      const cursor = reviewCursor.safeParse(before).data ?? null;
      return db.transaction(async (tx) => {
        await requireOwnerProspect(tx, actor, prospectId, false);
        const params = [catalogueId, prospectId];
        const [assessment] = await queryRows(
          tx,
          assessmentRow,
          "SELECT revision,assessment AS value FROM prospect_assessments WHERE catalogue_id=$1 AND prospect_id=$2",
          params,
        );
        const [draft] = await queryRows(
          tx,
          draftRow,
          "SELECT id::text,revision,review AS value FROM prospect_call_reviews WHERE catalogue_id=$1 AND prospect_id=$2 AND recorded_at IS NULL",
          params,
        );
        const rows = await queryRows(
          tx,
          recordedRow,
          `SELECT id::text,recorded_at,review AS value FROM prospect_call_reviews
          WHERE catalogue_id=$1 AND prospect_id=$2 AND recorded_at IS NOT NULL AND ($3::bigint IS NULL OR id<$3)
          ORDER BY id DESC LIMIT $4`,
          [...params, cursor, size + 1],
        );
        const history = rows.slice(0, size).map((r) => ({
          id: r.id,
          value: r.value,
          recordedAt: r.recorded_at.toISOString(),
        }));
        return {
          assessment: assessment ?? null,
          draft: draft ?? null,
          history,
          previous: rows.length > size ? (history.at(-1)?.id ?? null) : null,
        };
      });
    },
    change(actor: Actor, input: unknown) {
      return db.transaction(async (tx) => {
        const parsed = reviewCommand.safeParse(input);
        if (!parsed.success) throw new ProjectError("Check the prospect review and try again.");
        const cmd = parsed.data;
        const prospect = await requireOwnerProspect(tx, actor, cmd.prospectId, true);
        const params = [catalogueId, cmd.prospectId];
        if (cmd.type === "assessment") {
          if (cmd.advance && cmd.value.decision !== "ready")
            throw new ProjectError("Choose Ready to call to move this business.");
          const [current] = await queryRows(
            tx,
            assessmentRow,
            "SELECT revision,assessment AS value FROM prospect_assessments WHERE catalogue_id=$1 AND prospect_id=$2",
            params,
          );
          if ((current?.revision ?? 0) !== cmd.revision) throw conflict();
          const [saved] = await queryRows(
            tx,
            z.object({ revision }),
            `INSERT INTO prospect_assessments(catalogue_id,prospect_id,assessment)
             VALUES($1,$2,$3::jsonb) ON CONFLICT(catalogue_id,prospect_id) DO UPDATE SET
             assessment=excluded.assessment,revision=prospect_assessments.revision+1,updated_at=now() RETURNING revision`,
            [...params, JSON.stringify(cmd.value)],
          );
          if (cmd.advance && prospect.status === "assess_fit") {
            await tx.query(
              "UPDATE prospects SET status='ready',revision=revision+1 WHERE catalogue_id=$1 AND id=$2",
              params,
            );
            await tx.query(
              `INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,profile_changes)
               VALUES($1,$2,'stage',$3,$4,'{"from":"assess_fit","to":"ready"}'::jsonb)`,
              [...params, actor.userId, prospect.display_name],
            );
          }
          return { revision: saved!.revision, draftId: null };
        }
        const [draft] = await queryRows(
          tx,
          draftRow,
          "SELECT id::text,revision,review AS value FROM prospect_call_reviews WHERE catalogue_id=$1 AND prospect_id=$2 AND recorded_at IS NULL",
          params,
        );
        if ((draft?.id ?? null) !== cmd.draftId || (draft?.revision ?? 0) !== cmd.revision)
          throw conflict();
        if (cmd.record && (!cmd.value.outcome || !cmd.value.happenedOn))
          throw new ProjectError("Choose the call result and date before recording it.");
        if (cmd.record && cmd.value.actions.some((a) => !a.due))
          throw new ProjectError("Give each next action a date before recording the call.");
        if (cmd.record && cmd.value.next === "follow_up" && !cmd.value.actions.length)
          throw new ProjectError("Add a dated action for the follow-up.");
        const payload = [...params, JSON.stringify(cmd.value), cmd.record];
        const [saved] = await queryRows(
          tx,
          z.object({ id: z.string(), revision }),
          draft
            ? `UPDATE prospect_call_reviews SET review=$3::jsonb,revision=revision+1,
                 recorded_at=CASE WHEN $4::boolean THEN now() END WHERE catalogue_id=$1 AND prospect_id=$2 AND id=$5 RETURNING id::text,revision`
            : `INSERT INTO prospect_call_reviews(catalogue_id,prospect_id,review,recorded_at)
                 VALUES($1,$2,$3::jsonb,CASE WHEN $4::boolean THEN now() END) RETURNING id::text,revision`,
          draft ? [...payload, draft.id] : payload,
        );
        return cmd.record
          ? { revision: 0, draftId: null }
          : { revision: saved!.revision, draftId: saved!.id };
      });
    },
  };
}
