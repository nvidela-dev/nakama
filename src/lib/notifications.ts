import { countSchema, unreadCommentSchema } from "./row-schemas";
import { queryRows, required } from "./query";
import { z } from "zod";
import type { Database } from "./database";
import { ProjectError, type Actor } from "./projects";

export type UnreadComment = z.infer<typeof unreadCommentSchema>;
export function notificationService(db: Database) {
  return {
    async unread(person: Actor, before?: string) {
      if (!person.userId) throw new ProjectError("Sign in first.");
      let cursor: [string, string] | null = null;
      if (before) {
        try { cursor = z.tuple([z.iso.datetime({ offset: true }), z.uuid()]).parse(JSON.parse(before)); }
        catch { throw new ProjectError("Invalid notification page."); }
      }
      // Membership joins protect both the count and previews, including after removal.
      const predicate = `FROM project_comments c
        JOIN project_memberships m ON m.project_id=c.project_id AND m.user_id=$1
        WHERE c.author_id<>$1 AND c.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM comment_reads r WHERE r.comment_id=c.id AND r.user_id=$1)`;
      const count = required((await queryRows(db,countSchema,`SELECT count(*)::int AS count ${predicate}`, [person.userId]))[0]).count;
      const rows = (await queryRows(db,unreadCommentSchema,`SELECT c.id,c.project_id,
        (SELECT name FROM projects WHERE id=c.project_id) AS project_name,
        c.author_name,left(c.content,240) AS content,c.stage_id,c.node_id,c.created_at,
        to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time
        ${predicate} AND ($2::timestamptz IS NULL OR (c.created_at,c.id)<($2::timestamptz,$3::uuid))
        ORDER BY c.created_at DESC,c.id DESC LIMIT 26`, [person.userId,cursor?.[0] ?? null,cursor?.[1] ?? null]));
      const items = rows.slice(0,25), last = items.at(-1);
      return { count, items, next: rows.length > 25 && last ? JSON.stringify([last.cursor_time,last.id]) : undefined };
    },
    async read(person: Actor, input: unknown) {
      if (!person.userId) throw new ProjectError("Sign in first.");
      const ids = z.array(z.uuid()).min(1).max(25).parse(input);
      // The membership check and insert share one statement; forged/removed targets do nothing.
      await db.query(`INSERT INTO comment_reads(comment_id,user_id)
        SELECT c.id,$1 FROM project_comments c
        JOIN project_memberships m ON m.project_id=c.project_id AND m.user_id=$1
        WHERE c.id=ANY($2::uuid[]) AND c.deleted_at IS NULL AND c.author_id<>$1
        ON CONFLICT DO NOTHING`, [person.userId,ids]);
    },
  };
}
