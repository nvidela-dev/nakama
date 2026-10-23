import { z } from "zod";
import type { Database } from "./database";
import { membership, ProjectError, type Actor } from "./projects";
export type LinkedProject = { id: string; name: string };
export type ProjectLinks = { sources: LinkedProject[]; children: LinkedProject[] };
export function sourceProjectIds(input: unknown): string[] {
  const parsed = z.array(z.uuid()).max(25).safeParse(input ?? []);
  if (!parsed.success) throw new ProjectError("Choose up to 25 source projects.");
  return [...new Set(parsed.data)];
}
export function projectLinksService(db: Database) {
  return {
    async list(person: Actor, projectId: string): Promise<ProjectLinks> {
      return db.transaction(async tx => {
        await membership(tx, person, projectId);
        const { rows } = await tx.query<LinkedProject & { direction: "source" | "child" }>(`
          SELECT p.id,p.name,CASE WHEN l.child_id=$1 THEN 'source' ELSE 'child' END AS direction
          FROM project_links l JOIN projects p ON p.id=CASE WHEN l.child_id=$1 THEN l.source_id ELSE l.child_id END
          JOIN project_memberships m ON m.project_id=p.id AND m.user_id=$2
          WHERE l.source_id=$1 OR l.child_id=$1 ORDER BY lower(p.name),p.id`, [projectId, person.userId]);
        return {sources: rows.filter(p=>p.direction==="source").map(({id,name})=>({id,name})), children: rows.filter(p=>p.direction==="child").map(({id,name})=>({id,name}))};
      });
    },
    async change(person: Actor, sourceId: string, childId: string, remove = false) {
      await db.transaction(async tx => {
        // Serialize graph edits so concurrent opposite edges cannot both pass the cycle check.
        await tx.query("SELECT pg_advisory_xact_lock(734922)");
        for (const id of [...new Set([sourceId,childId])].sort()) await membership(tx,person,id);
        if (sourceId === childId) throw new ProjectError("A project cannot spawn itself.");
        if (remove) {
          await tx.query("DELETE FROM project_links WHERE source_id=$1 AND child_id=$2", [sourceId,childId]);
          return;
        }
        const cycle = await tx.query(`WITH RECURSIVE descendants(id) AS (
          SELECT child_id FROM project_links WHERE source_id=$1
          UNION SELECT l.child_id FROM project_links l JOIN descendants d ON l.source_id=d.id
        ) SELECT 1 FROM descendants WHERE id=$2 LIMIT 1`, [childId,sourceId]);
        if (cycle.rows.length) throw new ProjectError("This link would create a circular project lineage.");
        await tx.query("INSERT INTO project_links(source_id,child_id,created_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [sourceId,childId,person.userId]);
      });
    },
  };
}
