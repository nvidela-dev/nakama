"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createArtifact } from "@/app/artifact-actions";
import { artifactKinds, artifactUrl, artifactFileUrl, type ArtifactCard } from "@/lib/artifact-model";
import { useT } from "./language";

export function ArtifactLibrary({items,projects,projectId,stages=[],stageId}:{
  items:ArtifactCard[]; projects:{id:string;name:string}[]; projectId?:string; stages?:{id:string;name:string}[]; stageId?:string | undefined;
}) {
  const t=useT(),router=useRouter(),dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null);
  const [pending,startTransition]=useTransition(),[error,setError]=useState(""),[search,setSearch]=useState(""),[kind,setKind]=useState("all"),[status,setStatus]=useState("all"),[project,setProject]=useState("all");
  const [editing,setEditing]=useState(false);
  useEffect(()=>{if(editing)dialog.current?.showModal();},[editing]);
  const visible=items.filter(a=>(kind==="all"||a.kind===kind)&&(status==="all"||a.status===status)&&(project==="all"||a.project_id===project)&&`${a.name} ${a.project_name} ${a.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  function close(){dialog.current?.close();setEditing(false);setError("");opener.current?.focus();}
  function create(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    startTransition(async()=>{
      try {
        const result=await createArtifact(String(form.get("projectId")),{name:form.get("name"),description:form.get("description"),kind:form.get("kind"),stageId:form.get("stageId")||null,status:"in_progress",githubUrl:form.get("githubUrl")||""});
        if(result.error){setError(result.error);return;}
        close();router.push(artifactUrl(String(form.get("projectId")),result.id!));
      }catch{setError("Could not save the artifact. Your draft is still here.");}
    });
  }
  return <section className="artifact-library" aria-label={t("Artifacts")}>
    <div className="artifact-library-heading"><div><h2 className={projectId?undefined:"sr-only"}>{t("Artifacts")}</h2><p className="muted">{t("Plans, designs, documents, and software produced by your projects.")}</p></div>
      <button ref={opener} disabled={!projects.length} onClick={()=>setEditing(true)}>{t("New artifact")}</button>
    </div>
    <div className="artifact-filters">
      <input aria-label={t("Find an artifact")} placeholder={t("Find an artifact")} value={search} onChange={e=>setSearch(e.target.value)} />
      {!projectId&&<select aria-label={t("Project")} value={project} onChange={e=>setProject(e.target.value)}><option value="all">{t("All projects")}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <select aria-label={t("Artifact type")} value={kind} onChange={e=>setKind(e.target.value)}><option value="all">{t("All types")}</option>{Object.entries(artifactKinds).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select>
      <select aria-label={t("Artifact status")} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{t("All statuses")}</option><option value="in_progress">{t("In progress")}</option><option value="ready">{t("Ready to use")}</option></select>
    </div>
    {!visible.length?<div className="empty-state"><h3>{t(items.length?"No matching artifacts.":"No artifacts yet.")}</h3><p>{t("Start with a work in progress, attach its output when ready.")}</p></div>
      :<div className="artifact-grid">{visible.map(a=><Link key={a.id} className="artifact-card panel" href={artifactUrl(a.project_id,a.id)}>
        <div className={`artifact-cover artifact-cover-${a.kind}`}>{a.cover_id
          ? <img loading="lazy" src={artifactFileUrl(a.project_id,a.id,a.cover_id)} alt={a.name} />
          : <span aria-hidden="true">{a.kind==="markdown"?"#":a.kind==="software"?"</>":"▧"}</span>}</div>
        <div className="artifact-card-body"><div className="artifact-card-meta"><span>{t(artifactKinds[a.kind])}</span><span className={`artifact-status ${a.status}`}>{t(a.status==="ready"?"Ready to use":"In progress")}</span></div>
          <h3>{a.name}</h3><p className="muted">{a.project_name}{a.stage_id? ` · ${t(a.stage_name??stages.find(s=>s.id===a.stage_id)?.name??a.stage_id)}`:""}</p>
          {a.description&&<p className="artifact-excerpt">{a.description}</p>}
          <small>{a.done_task_count}/{a.task_count} {t("tasks done")}{a.file_count? ` · ${a.file_count} ${t("files")}`:""}</small>
        </div>
      </Link>)}</div>}
    <dialog ref={dialog} className="artifact-dialog" aria-labelledby="new-artifact-heading" onCancel={e=>{e.preventDefault();close();}}>
      {editing&&<form className="form-stack" onSubmit={create}>
        <div className="artifact-library-heading"><h2 id="new-artifact-heading">{t("New artifact")}</h2><button type="button" className="text-button" onClick={close} aria-label={t("Close")}>×</button></div>
        {projectId?<input type="hidden" name="projectId" value={projectId}/>:<label>{t("Project")}<select aria-label={t("Project")} name="projectId" required>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        <label>{t("Artifact name")}<input name="name" required maxLength={160} autoFocus /></label>
        <label>{t("Artifact type")}<select aria-label={t("Artifact type")} name="kind" defaultValue="image">{Object.entries(artifactKinds).map(([key,label])=><option key={key} value={key}>{t(label)}</option>)}</select></label>
        <label>{t("Description")}<textarea name="description" maxLength={4000} rows={3}/></label>
        {!!stages.length&&<label>{t("Phase (optional)")}<select aria-label={t("Phase (optional)")} name="stageId" defaultValue={stageId??""}><option value="">{t("Whole project")}</option>{stages.map(s=><option key={s.id} value={s.id}>{t(s.name)}</option>)}</select></label>}
        <p className="muted">{t("Created in progress. Add images, a Markdown file, or a GitHub link on the next screen.")}</p>
        {error&&<p role="alert" className="message error">{t(error)}</p>}
        <button disabled={pending}>{pending?t("Saving…"):t("Create artifact")}</button>
      </form>}
    </dialog>
  </section>;
}
