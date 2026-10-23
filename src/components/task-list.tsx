"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { changeTask, exportTasks, importTasks, type TaskResult } from "@/app/task-actions";
import type { TaskOperation } from "@/lib/tasks";
import { descendants, taskTree, taskStatusLabels, type LockInProject, type TaskNode, type TaskSnapshot, type TaskStatus } from "@/lib/task-model";
import { parseLockInFile } from "@/lib/lockin-format";
import { useT } from "./language";
type Editor={title:string;revision:number} & ({kind:"add";parentId?:string;task?:never}|{kind:"edit"|"delete"|"done";task:TaskNode;parentId?:never});
export function TaskList({projectId,initial}:{projectId:string;initial:TaskSnapshot}){
  const t=useT();const [list,setList]=useState(initial),[pending,startTransition]=useTransition();
  const [editor,setEditor]=useState<Editor|null>(null),[error,setError]=useState(""),[conflict,setConflict]=useState(false),[notice,setNotice]=useState("");
  const [search,setSearch]=useState(""),[filter,setFilter]=useState("all");
  const [imports,setImports]=useState<LockInProject[]>([]),[selected,setSelected]=useState(0),[importRevision,setImportRevision]=useState(initial.revision);
  const dialog=useRef<HTMLDialogElement>(null),importDialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),file=useRef<HTMLInputElement>(null);
  useEffect(()=>{setList(current=>initial.revision>current.revision?initial:current);},[initial]);
  useEffect(()=>{if(editor&&!dialog.current?.open)dialog.current?.showModal();},[editor]);
  useEffect(()=>{if(imports.length&&!importDialog.current?.open)importDialog.current?.showModal();},[imports]);
  const tree=useMemo(()=>taskTree(list.tasks),[list.tasks]);
  const completed=list.tasks.filter(task=>task.status==="done").length;
  function open(value:Editor){opener.current=document.activeElement as HTMLElement;setError("");setConflict(false);setEditor(value);}
  function close(){setEditor(null);setImports([]);setError("");setConflict(false);requestAnimationFrame(()=>opener.current?.isConnected&&opener.current.focus());}
  function apply(result:TaskResult,closeAfter:boolean){
    if(result.snapshot)setList(result.snapshot);
    if(result.error){setError(result.error);setConflict(!!result.conflict);return;}
    setError("");setConflict(false);setNotice("Task list saved.");if(closeAfter)close();
  }
  function run(operation:TaskOperation,revision=list.revision,closeAfter=false){setNotice("");startTransition(async()=>{try{apply(await changeTask(projectId,revision,operation),closeAfter);}catch{setError("Could not save tasks. Your draft is still here.");}});}
  function download(){startTransition(async()=>{try{const {data,error}=await exportTasks(projectId);if(error)setError(error);else if(data)setNotice("Export ready.");if(data){const blob=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="lock-in-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setError("Could not export tasks.");}});}
  async function readFile(event:React.ChangeEvent<HTMLInputElement>){const input=event.target;const chosen=input.files?.[0];if(!chosen)return;setError("");try{if(chosen.size>512_000)throw new Error();const state=parseLockInFile(await chosen.text());setImports(state.projects);setSelected(Math.max(0,state.projects.findIndex(p=>p.id===state.active_project)));setImportRevision(list.revision);}catch{setError("Choose a valid Lock-In version 1 JSON file up to 512 KB. Task titles must be at most 300 characters.");}finally{input.value="";}}
  function mark(node:TaskNode,status:TaskStatus){if(status==="done"&&node.children.length)open({kind:"done",task:node,title:node.title,revision:list.revision});else run({kind:"status",id:node.id,status});}
  const filtering=!!search.trim()||filter!=="all";
  const matches=(node:TaskNode)=>(!search.trim()||`${node.number} ${node.title}`.toLowerCase().includes(search.trim().toLowerCase()))&&(filter==="all"||node.status===filter);
  const containsMatch=(node:TaskNode):boolean=>matches(node)||node.children.some(containsMatch);
  const visible:TaskNode[]=[];
  const walk=(nodes:TaskNode[])=>{for(const node of nodes){if(filtering&&!containsMatch(node))continue;visible.push(node);if(filtering||!node.collapsed)walk(node.children);}};walk(tree);
  const errorBox=error&&<div className="task-feedback"><p className="message error" role="alert">{t(error)}</p>{conflict&&editor?.task&&<p>{t("Latest task title:")} {list.tasks.find(task=>task.id===editor.task?.id)?.title??t("Task no longer exists.")}</p>}{conflict&&(editor||imports.length>0)&&<button type="button" className="button secondary" disabled={pending} onClick={()=>{if(editor){
        const find=(nodes:TaskNode[]):TaskNode|undefined=>{for(const node of nodes){if(node.id===editor.task?.id)return node;const child=find(node.children);if(child)return child;}return undefined;};
        const fresh=editor.task?find(tree):undefined;
        if(editor.task&&!fresh){setError("Task not found.");setConflict(false);return;}
        if(editor.kind==="add") setEditor({...editor,revision:list.revision});
        else if(fresh) setEditor({...editor,task:fresh,revision:list.revision,title:editor.kind==="edit"?editor.title:fresh.title});
      }setImportRevision(list.revision);setError("");setConflict(false);}}>{t("Use latest list and keep my draft")}</button>}</div>;
  const selectedImport=imports[selected];
  function importCount(tasks:LockInProject["tasks"]):number{return tasks.reduce((sum,task)=>sum+1+importCount(task.subtasks),0);}
  return <section className="panel task-list" aria-label={t("Project to-do list")}>
    <div className="task-list-heading"><div><h2>{t("To-do")}</h2><small>{completed}/{list.tasks.length} {t("tasks done")}</small></div><button type="button" disabled={pending} onClick={()=>open({kind:"add",title:"",revision:list.revision})}>{t("Add task")}</button></div>
    <div className="task-toolbar">
      <label>{t("Find a task")}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("Title or task number")} /></label>
      <label>{t("Task status")}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t("All statuses")}</option>{Object.entries(taskStatusLabels).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
    </div>
    <div className="task-tools">
      <button type="button" className="button secondary" disabled={pending||!list.tasks.length} onClick={()=>run({kind:"collapse",ids:list.tasks.map(t=>t.id),collapsed:false})}>{t("Expand all")}</button>
      <button type="button" className="button secondary" disabled={pending||!list.tasks.length} onClick={()=>run({kind:"collapse",ids:list.tasks.map(t=>t.id),collapsed:true})}>{t("Collapse all")}</button>
      <button type="button" className="button secondary" disabled={pending} onClick={event=>{opener.current=event.currentTarget;file.current?.click();}}>{t("Import Lock-In")}</button>
      <button type="button" className="button secondary" disabled={pending} onClick={download}>{t("Export Lock-In")}</button>
      <input ref={file} className="sr-only" type="file" accept=".json,application/json" aria-label={t("Lock-In JSON file")} onChange={readFile} />
    </div>
    {!editor&&!imports.length&&errorBox}
    {notice&&<p className="message" role="status">{t(notice)}</p>}
    {!list.tasks.length?<p className="muted">{t("No tasks yet. Add a task or import a Lock-In project.")}</p>:!visible.length?<p className="muted">{t("No matching tasks.")}</p>:<ol className="task-tree">{visible.map(node=><li key={node.id} className={`task-row task-${node.status}`} style={{marginLeft:Math.min(node.depth,4)*12}}>
      <div className="task-main">
        {node.children.length>0?<button type="button" className="task-expand" disabled={pending} aria-label={t(node.collapsed?"Expand subtasks":"Collapse subtasks")} aria-expanded={node.children.length?filtering||!node.collapsed:undefined} onClick={()=>run({kind:"collapse",ids:[node.id],collapsed:!node.collapsed})}>{filtering||!node.collapsed?"▾":"▸"}</button>:<span className="task-leaf" aria-hidden="true">·</span>}
        <span className="task-number">{node.number}</span>
        <button type="button" className="task-title" disabled={pending} onClick={()=>open({kind:"edit",task:node,title:node.title,revision:list.revision})}>{node.title}</button>
      </div>
      <div className="task-row-controls">
        <select aria-label={`${t("Task status")} ${node.number}`} disabled={pending} value={node.status} onChange={e=>mark(node,e.target.value as TaskStatus)}>{Object.entries(taskStatusLabels).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select>
        <button type="button" className="button secondary task-icon" title={t("Add subtask")} aria-label={`${t("Add subtask")} ${node.number}`} disabled={pending} onClick={()=>open({kind:"add",parentId:node.id,title:"",revision:list.revision})}>+</button>
        <button type="button" className="button secondary task-icon" title={t("Delete task")} aria-label={`${t("Delete task")} ${node.number}`} disabled={pending} onClick={()=>open({kind:"delete",task:node,title:node.title,revision:list.revision})}>×</button>
      </div>
    </li>)}</ol>}
    {editor&&<dialog ref={dialog} className="task-dialog" aria-labelledby="task-editor-heading" onCancel={event=>{event.preventDefault();if(!pending)close();}}>
      <form className="form-stack" onSubmit={event=>{event.preventDefault();if(editor.kind==="add")run({kind:"add",title:editor.title,parentId:editor.parentId??null},editor.revision,true);else if(editor.kind==="edit")run({kind:"edit",id:editor.task.id,title:editor.title},editor.revision,true);else if(editor.kind==="delete")run({kind:"delete",id:editor.task.id,confirmed:true},editor.revision,true);}}>
        <h2 id="task-editor-heading">{t(editor.kind==="add"?(editor.parentId?"Add subtask":"Add task"):editor.kind==="edit"?"Edit task":editor.kind==="delete"?"Delete task":"Complete task")}</h2>
        {(editor.kind==="add"||editor.kind==="edit")?<label>{t("Task title")}<input autoFocus required maxLength={300} disabled={pending} value={editor.title} onChange={event=>setEditor({...editor,title:event.target.value})}/></label>:<>
          <p className="preserve-lines">{editor.task.number} · {editor.title}</p>
          <p>{t(editor.kind==="delete"?"Delete this task and all its subtasks? This cannot be undone.":"Complete only this task, or include all its subtasks?")}</p>
          <small>{descendants(editor.task).length} {t("subtasks")}</small>
        </>}
        {errorBox}
        <div className="task-dialog-actions">
          {editor.kind==="done"?<><button type="button" disabled={pending||conflict} onClick={()=>run({kind:"status",id:editor.task.id,status:"done",scope:"task",confirmed:true},editor.revision,true)}>{t("Only this task")}</button><button type="button" disabled={pending||conflict} onClick={()=>run({kind:"status",id:editor.task.id,status:"done",scope:"subtree",confirmed:true},editor.revision,true)}>{t("Task and subtasks")}</button></>:<button disabled={pending||conflict}>{t(pending?"Saving…":editor.kind==="delete"?"Confirm deletion":"Save task")}</button>}
          <button type="button" className="button secondary" disabled={pending} onClick={close}>{t("Cancel")}</button>
        </div>
      </form>
    </dialog>}
    {selectedImport&&<dialog ref={importDialog} className="task-dialog" aria-labelledby="task-import-heading" onCancel={event=>{event.preventDefault();if(!pending)close();}}>
      <h2 id="task-import-heading">{t("Import Lock-In")}</h2>
      <label>{t("Source project")}<select value={selected} disabled={pending} onChange={e=>setSelected(Number(e.target.value))}>{imports.map((p,i)=><option key={p.id} value={i}>{p.name}</option>)}</select></label>
      <p>{importCount(selectedImport.tasks)} {t("tasks to add")}</p>
      <p className="muted">{t("This adds tasks to the current project. Existing tasks and project details stay as they are. Source IDs are remapped; this is not a sync.")}</p>
      <ol className="task-import-preview">{function preview(tasks:LockInProject["tasks"],prefix="",depth=0):React.ReactNode{return tasks.map((task,i)=>{const number=prefix?`${prefix}.${i+1}`:`${i+1}`;return <li key={task.id} style={{marginLeft:Math.min(depth,4)*12}}><span>{number} · {task.title} · {t(taskStatusLabels[task.status])}</span>{task.subtasks.length>0&&<ol>{preview(task.subtasks,number,depth+1)}</ol>}</li>})}(selectedImport.tasks)}</ol>
      {errorBox}
      <div className="task-dialog-actions"><button type="button" disabled={pending||conflict||!importCount(selectedImport.tasks)} onClick={()=>startTransition(async()=>{try{apply(await importTasks(projectId,importRevision,selectedImport),true);}catch{setError("Could not save tasks. Your draft is still here.");}})}>{t("Add imported tasks")}</button><button type="button" className="button secondary" disabled={pending} onClick={close}>{t("Cancel")}</button></div>
    </dialog>}
  </section>;
}
