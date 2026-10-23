import { z } from "zod";
import type { Database } from "@/server/database/database";
import type { Actor } from "@/shared/contracts/actor";
import { queryRows } from "@/server/database/query";
import { membership, ProjectError } from "@/features/projects/server/projects";
import type { ReferenceResults } from "../references";
const row = z.object({
  kind: z.enum(["project", "artifact"]),
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  project_name: z.string(),
});
/** Bounded metadata only; every query checks both source and destination membership. */
export function referenceService(db: Database) {
  return {
    async search(
      person: Actor,
      sourceProjectId: string,
      search: unknown,
    ): Promise<ReferenceResults> {
      const parsed = z.string().trim().max(100).safeParse(search);
      if (!parsed.success) throw new ProjectError("Invalid reference search.");
      return db.transaction(async (tx) => {
        await membership(tx, person, sourceProjectId);
        const rows = await queryRows(
          tx,
          row,
          `SELECT kind,id,project_id,name,project_name FROM (
     SELECT 'project'::text AS kind,p.id,p.id AS project_id,p.name,p.name AS project_name
     FROM projects p JOIN project_memberships m ON m.project_id=p.id AND m.user_id=$1
     WHERE strpos(lower(p.name),lower($2))>0
     UNION ALL
     SELECT 'artifact'::text AS kind,a.id,a.project_id,a.name,p.name AS project_name
     FROM project_artifacts a JOIN projects p ON p.id=a.project_id
     JOIN project_memberships m ON m.project_id=a.project_id AND m.user_id=$1
     WHERE strpos(lower(a.name),lower($2))>0 OR strpos(lower(p.name),lower($2))>0
   ) refs ORDER BY lower(name),kind,id LIMIT 41`,
          [person.userId, parsed.data],
        );
        return {
          items: rows.slice(0, 40).map((r) => ({
            kind: r.kind,
            id: r.id,
            projectId: r.project_id,
            name: r.name,
            projectName: r.project_name,
          })),
          hasMore: rows.length > 40,
        };
      });
    },
  };
}
