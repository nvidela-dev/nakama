"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changeProjectLink } from "@/app/actions";
import type { LinkedProject, ProjectLinks } from "@/lib/project-links";
import { NewProjectButton } from "./new-project";
import { Feedback } from "./forms";
import { useT } from "./language";
function RemoveLink({projectId,other,direction}:{projectId:string;other:LinkedProject;direction:"source"|"child"}) {
  const t=useT(),[state,action,pending]=useActionState(changeProjectLink.bind(null,projectId),{});
  return <div><form action={action}><input type="hidden" name="otherId" value={other.id}/><input type="hidden" name="direction" value={direction}/><input type="hidden" name="operation" value="remove"/><button className="text-button" disabled={pending} aria-label={t("Unlink {name}",{name:other.name})}>{t("Unlink")}</button></form><Feedback state={state}/></div>;
}
export function ProjectRelations({projectId,links,projects}:{projectId:string;links:ProjectLinks;projects:LinkedProject[]}) {
  const t=useT(),[state,action,pending]=useActionState(changeProjectLink.bind(null,projectId),{});
  return <aside className="panel project-relations"><h2>{t("Linked projects")}</h2>
    {([['source',"Spawned from",links.sources],['child',"Spawned projects",links.children]] as const).map(([direction,title,items])=><div key={direction}><h3>{t(title)}</h3>{items.length?<ul className="project-link-list">{items.map(other=><li key={other.id}><Link href={`/projects/${other.id}`}>{other.name} ↗</Link><RemoveLink projectId={projectId} other={other} direction={direction}/></li>)}</ul>:<p className="muted">{t("No linked projects to show.")}</p>}</div>)}
    <NewProjectButton projects={projects} initialSourceIds={[projectId]} label="Spawn project"/>
    <details><summary>{t("Link an existing project")}</summary><form action={action} className="form-stack">
      <label>{t("Relationship")}<select name="direction" aria-label={t("Relationship")}><option value="child">{t("Spawned project")}</option><option value="source">{t("Source project")}</option></select></label>
      <label>{t("Project")}<select name="otherId" aria-label={t("Project")} required defaultValue=""><option value="" disabled>{t("Choose a project")}</option>{projects.filter(p=>p.id!==projectId).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <button disabled={pending||projects.length<2}>{pending?t("Saving…"):t("Link project")}</button><Feedback state={state}/>
    </form></details><small className="muted">{t("Links do not share access. Only projects you belong to appear here.")}</small>
  </aside>;
}
