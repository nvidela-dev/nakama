import { salesStages, type SalesStage } from "../model";
import { z } from "zod";
import { isAppAdmin, normalizeEmail } from "@/features/access/server/app-access";
import type { Actor } from "@/shared/contracts/actor";
import { ProjectError } from "@/shared/contracts/errors";
import type { Database, Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
export const catalogueId = "business";
export class ProspectMigrationPending extends ProjectError {}
const roleSchema = z.object({ role: z.enum(["owner", "member"]) });
export async function catalogueMembership(tx: Queryable, actor: Actor, ownerOnly = false) {
  const denied = () => new ProjectError("Catalogue access is private.");
  if (!actor.userId) throw denied();
  const [schema] = await queryRows(
    tx,
    z.object({ ready: z.boolean(), reviews: z.boolean(), stages: z.array(z.string()) }),
    `SELECT to_regclass('prospect_sources') IS NOT NULL AS ready,
       to_regclass('prospect_call_reviews') IS NOT NULL AS reviews,
       ARRAY(SELECT enumlabel::text FROM pg_enum WHERE enumtypid=to_regtype('prospect_status')) AS stages`,
  );
  if (!schema?.ready) throw new ProspectMigrationPending();
  const find = async () =>
    (
      await queryRows(
        tx,
        roleSchema,
        "SELECT role FROM prospect_memberships WHERE catalogue_id=$1 AND user_id=$2 FOR SHARE",
        [catalogueId, actor.userId],
      )
    )[0];
  let member = await find();
  if (!member) {
    if (isAppAdmin(actor, process.env.NAKAMA_ADMIN_EMAIL)) {
      await tx.query(
        "INSERT INTO prospect_catalogues(id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [catalogueId, actor.userId],
      );
      await tx.query(
        "INSERT INTO prospect_memberships(catalogue_id,user_id,display_name,role) SELECT id,owner_id,$3,'owner' FROM prospect_catalogues WHERE id=$1 AND owner_id=$2 ON CONFLICT DO NOTHING",
        [catalogueId, actor.userId, actor.displayName ?? actor.userId],
      );
    }
    if (!ownerOnly && actor.verifiedEmails.length) {
      await tx.query(
        `WITH accepted AS (UPDATE prospect_invitations SET accepted_by=$2 WHERE catalogue_id=$1 AND email=ANY($4::text[]) AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at>now() RETURNING catalogue_id,email)
        INSERT INTO prospect_memberships(catalogue_id,user_id,display_name,role,joined_email) SELECT catalogue_id,$2,$3,'member',min(email) FROM accepted GROUP BY catalogue_id ON CONFLICT DO NOTHING`,
        [
          catalogueId,
          actor.userId,
          actor.displayName ?? actor.userId,
          actor.verifiedEmails.map(normalizeEmail),
        ],
      );
    }
    member = await find();
  }
  if (!member || (ownerOnly && member.role !== "owner")) throw denied();
  return {
    ...member,
    availableStages: salesStages.filter(
      (stage) => schema.stages.includes(stage) && (stage !== "assess_fit" || schema.reviews),
    ),
  };
}
export type CatalogueRead = {
  tx: Queryable;
  actor: Actor;
  catalogueId: string;
  role: "owner" | "member";
  availableStages: SalesStage[];
};
export function withCatalogueRead<T>(
  db: Database,
  actor: Actor,
  work: (scope: CatalogueRead) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    const membership = await catalogueMembership(tx, actor);
    return work({ tx, actor, catalogueId, ...membership });
  });
}
