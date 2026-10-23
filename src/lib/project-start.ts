import type { Database } from "./database";
import { projectService, type Actor } from "./projects";
import { guidanceService } from "./guidance";

// Capture and optional flow initialization must commit as a single project.
export function startProject(db: Database, person: Actor, input: {name:string;description:string;flow?:string}) {
  return db.transaction(async tx => {
    const scoped: Database = {
      query: (sql,values) => tx.query(sql,values),
      transaction: work => work(tx),
    };
    const id = await projectService(scoped).create(person,input);
    if (input.flow) await guidanceService(scoped).select(person,id,input.flow);
    return id;
  });
}
