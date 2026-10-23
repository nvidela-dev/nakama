"use client";
import { useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "./language";
export function ProjectWork({children,tasks,artifacts}:{children:React.ReactNode;tasks?:React.ReactNode;artifacts?:React.ReactNode}){
  const t=useT(),router=useRouter(),path=usePathname(),query=useSearchParams(),id=useId();
  const active=query.get("view")==="artifacts"&&artifacts?"artifacts":query.get("view")==="tasks"?"tasks":"steps";
  const views=artifacts?["steps","tasks","artifacts"] as const:["steps","tasks"] as const;
  function select(view:"tasks"|"steps"|"artifacts"){const params=new URLSearchParams(query);if(view!=="steps")params.set("view",view);else params.delete("view");router.replace(`${path}${params.size?`?${params}`:""}`,{scroll:false});}
  if(!tasks)return <>{children}</>;
  return <>
    <div className="project-work-tabs" role="tablist" aria-label={t("Project workspace")}>
      {views.map(view=><button key={view} type="button" role="tab" id={`${id}-${view}-tab`} aria-selected={active===view} aria-controls={`${id}-${view}`} tabIndex={active===view?0:-1} onClick={()=>select(view)} onKeyDown={event=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?views[0]:event.key==="End"?views[views.length-1]:views[(views.indexOf(active as "steps"|"tasks")+ (event.key==="ArrowRight"?1:views.length-1))%views.length];select(next);document.getElementById(`${id}-${next}-tab`)?.focus();}}}>{t(view==="steps"?"Project steps":view==="tasks"?"To-do":"Artifacts")}</button>)}
    </div>
    <div className="project-work-panel" role="tabpanel" id={`${id}-steps`} aria-labelledby={`${id}-steps-tab`} hidden={active!=="steps"}>{children}</div>
    <div className="project-work-panel" role="tabpanel" id={`${id}-tasks`} aria-labelledby={`${id}-tasks-tab`} hidden={active!=="tasks"}>{tasks}</div>
    {artifacts&&<div className="project-work-panel" role="tabpanel" id={`${id}-artifacts`} aria-labelledby={`${id}-artifacts-tab`} hidden={active!=="artifacts"}>{artifacts}</div>}
  </>;
}
