import { z } from "zod";
import type { Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import { ProjectError } from "@/shared/contracts/errors";
import type { JobCommand, JobLead } from "../schemas";

export async function recordEvent(
  tx: Queryable,
  owner: string,
  current: Pick<JobLead, "stage" | "revision">,
  c: Extract<JobCommand, { type: "event" }>,
) {
  const round = c.kind === "interview" || c.kind === "screening" ? c : null;
  const contact = c.kind === "outreach" ? c : null;
  const inserted = await queryRows(
    tx,
    z.object({ id: z.string() }),
    `INSERT INTO nakama_jobs.events(id,owner_id,lead_id,kind,occurred_on,detail,practice,round_type,round_outcome,rating,contact_method,direction,response,contact_at,follow_up)
             SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamp AT TIME ZONE 'America/Montevideo',$15
             WHERE $14::timestamp IS NULL OR $14::timestamp <= now() AT TIME ZONE 'America/Montevideo'
             ON CONFLICT DO NOTHING RETURNING id`,
    [
      c.token,
      owner,
      c.id,
      c.kind,
      c.occurred_on,
      c.detail,
      c.practice,
      round?.round_type ?? null,
      round?.round_outcome ?? null,
      round?.rating ?? null,
      contact?.contact_method ?? null,
      contact?.direction ?? null,
      contact?.response ?? null,
      contact?.contact_at ?? null,
      contact?.follow_up ?? null,
    ],
  );
  if (!inserted.length) {
    const existing = await queryRows(
      tx,
      z.object({ id: z.string() }),
      "SELECT id FROM nakama_jobs.events WHERE id=$1 AND owner_id=$2 AND lead_id=$3",
      [c.token, owner, c.id],
    );
    if (!existing.length) throw new ProjectError("Check the contact time.");
    return c.id;
  }
  if (contact && (contact.direction === "inbound" || contact.response === "reply")) {
    if (
      contact.decision &&
      (contact.revision !== current.revision ||
        !["waiting", "ghosted"].includes(current.stage ?? ""))
    )
      throw new ProjectError("This role changed in another tab. Reload before saving.");
    const nextStage = contact.decision ?? "waiting";
    const [closedWait] = await queryRows(
      tx,
      z.object({ ended_at: z.string() }),
      `UPDATE nakama_jobs.stage_history
              SET ended_at=greatest(started_at,$3::timestamp AT TIME ZONE 'America/Montevideo')
              WHERE owner_id=$1 AND lead_id=$2 AND stage='waiting' AND ended_at IS NULL
                AND date_trunc('minute',started_at) <= $3::timestamp AT TIME ZONE 'America/Montevideo' RETURNING ended_at::text`,
      [owner, c.id, contact.contact_at],
    );
    if (contact.decision && !closedWait)
      throw new ProjectError("The decision must be dated within the current waiting period.");
    if (closedWait) {
      await tx.query(
        `INSERT INTO nakama_jobs.stage_history(owner_id,lead_id,stage,started_at)
                VALUES($1,$2,$4,$3::timestamptz)`,
        [owner, c.id, closedWait.ended_at, nextStage],
      );
      await tx.query(
        "UPDATE nakama_jobs.tracking SET stage=$3,revision=revision+1 WHERE owner_id=$1 AND lead_id=$2",
        [owner, c.id, nextStage],
      );
    }
  }
  return c.id;
}
