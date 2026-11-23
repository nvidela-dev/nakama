import { scopedDatabase } from "@/server/database/database";
import type { Database } from "@/server/database/database";
import { projectService } from "@/features/projects/server/projects";
import { type Actor } from "@/shared/contracts/actor";
import { projectLinksService, sourceProjectIds } from "@/features/projects/server/project-links";
import { guidanceService } from "@/features/guidance/server/guidance";

// Capture and optional flow initialization must commit as a single project.
export function startProject(
  db: Database,
  person: Actor,
  input: { name: string; description: string; flow?: string; sourceIds?: unknown },
) {
  return db.transaction(async (tx) => {
    const scoped = scopedDatabase(tx);
    const id = await projectService(scoped).create(person, input);
    if (input.flow) await guidanceService(scoped).select(person, id, input.flow);
    for (const sourceId of sourceProjectIds(input.sourceIds))
      await projectLinksService(scoped).change(person, sourceId, id);
    return id;
  });
}
