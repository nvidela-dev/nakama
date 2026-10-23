import { taskStatusSchema } from "./domain-schemas";
import { queryRows, required } from "./query";
import { projectTaskSchema } from "./row-schemas";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "./database";
import { membership, ProjectError, type Actor } from "./projects";
import { recordActivity } from "./activity-log";
import type { TaskSnapshot } from "./task-model";
import { validateLockInProject, toLockIn } from "./lockin-format";
const title = z.string().trim().min(1).max(300);
const id=z.uuid();
const operation=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("add"),title,parentId:id.nullable()}),
  z.object({kind:z.literal("edit"),id,title}),
  z.object({kind:z.literal("status"),id,status:taskStatusSchema,scope:z.enum(["task","subtree"]).default("task"),confirmed:z.boolean().default(false)}),
  z.object({kind:z.literal("delete"),id,confirmed:z.literal(true)}),
  z.object({kind:z.literal("collapse"),ids:z.array(id).max(2000),collapsed:z.boolean()}),
]);
export type TaskOperation=z.input<typeof operation>;
export class TaskConflictError extends ProjectError {
  constructor(public snapshot:TaskSnapshot){super("The task list changed. Your draft is still here. Review the latest list before trying again.");}
}
async function snapshot(tx:Queryable,projectId:string):Promise<TaskSnapshot>{
  const revision=(await tx.query<{revision:number}>("SELECT revision FROM project_task_lists WHERE project_id=$1",[projectId])).rows[0]?.revision??0;
  const tasks=await queryRows(tx,projectTaskSchema,"SELECT id,parent_id,title,status,collapsed,created_at,updated_at FROM project_tasks WHERE project_id=$1 ORDER BY position",[projectId]);
  return {revision,tasks};
}
// A list-wide revision protects subtree operations when another member adds a child.
async function lock(tx:Queryable,actor:Actor,projectId:string,revision:number){
  await membership(tx,actor,projectId);
  await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE",[projectId]);
  if(!Number.isSafeInteger(revision)||revision<0)throw new ProjectError("Invalid task revision.");
  const current=await snapshot(tx,projectId);
  if(current.revision!==revision)throw new TaskConflictError(current);
  return current;
}
async function changed(tx:Queryable,projectId:string){
  await tx.query("INSERT INTO project_task_lists(project_id,revision) VALUES($1,1) ON CONFLICT(project_id) DO UPDATE SET revision=project_task_lists.revision+1",[projectId]);
  return snapshot(tx,projectId);
}
export function taskService(db:Database){return{
  list:(actor:Actor,projectId:string)=>db.transaction(async tx=>{await membership(tx,actor,projectId);await tx.query("SELECT id FROM projects WHERE id=$1 FOR SHARE",[projectId]);return snapshot(tx,projectId);}),
  change:(actor:Actor,projectId:string,revision:number,input:unknown)=>db.transaction(async tx=>{
    const current=await lock(tx,actor,projectId,revision);
    const parsed=operation.safeParse(input);if(!parsed.success)throw new ProjectError("Check the task title and action. Titles can have up to 300 characters.");
    const op=parsed.data;
    if(op.kind==="add"){
      if(current.tasks.length>=2000)throw new ProjectError("This project has reached the 2,000-task limit.");
      if(op.parentId&&!current.tasks.some(t=>t.id===op.parentId))throw new ProjectError("Task not found.");
      if(op.parentId){let depth=1,parent=current.tasks.find(t=>t.id===op.parentId);while(parent?.parent_id){depth++;const parentId=parent.parent_id;parent=current.tasks.find(t=>t.id===parentId);}if(depth>32)throw new ProjectError("Task nesting is limited to 32 levels.");}
      await tx.query("INSERT INTO project_tasks(id,project_id,parent_id,title,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5)",[randomUUID(),projectId,op.parentId,op.title,actor.userId]);
      if(op.parentId)await tx.query("UPDATE project_tasks SET collapsed=false,updated_at=now(),updated_by=$3 WHERE project_id=$1 AND id=$2",[projectId,op.parentId,actor.userId]);
      await recordActivity(tx,actor,projectId,"task_created");
    }else if(op.kind==="collapse"){
      if(op.ids.some(id=>!current.tasks.some(t=>t.id===id)))throw new ProjectError("Task not found.");
      await tx.query("UPDATE project_tasks SET collapsed=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=ANY($2::uuid[])",[projectId,op.ids,op.collapsed,actor.userId]);
    }else{
      const task=current.tasks.find(t=>t.id===op.id);if(!task)throw new ProjectError("Task not found.");
      const subtree=[task.id];for(let i=0;i<subtree.length;i++)subtree.push(...current.tasks.filter(t=>t.parent_id===subtree[i]).map(t=>t.id));
      if(op.kind==="edit"){
        await tx.query("UPDATE project_tasks SET title=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=$2",[projectId,op.id,op.title,actor.userId]);
        await recordActivity(tx,actor,projectId,"task_edited");
      }else if(op.kind==="delete"){
        await tx.query("DELETE FROM project_tasks WHERE project_id=$1 AND id=$2",[projectId,op.id]);
        await recordActivity(tx,actor,projectId,"task_deleted");
      }else{
        if(op.scope==="subtree"&&op.status!=="done")throw new ProjectError("Only Done can be applied to subtasks together.");
        if(op.status==="done"&&subtree.length>1&&!op.confirmed)throw new ProjectError("Confirm whether to complete this task alone or its subtasks too.");
        await tx.query("UPDATE project_tasks SET status=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=ANY($2::uuid[])",[projectId,op.scope==="subtree"?subtree:[op.id],op.status,actor.userId]);
        await recordActivity(tx,actor,projectId,"task_status_changed");
      }
    }
    return changed(tx,projectId);
  }),
  import:(actor:Actor,projectId:string,revision:number,input:unknown)=>db.transaction(async tx=>{
    const current=await lock(tx,actor,projectId,revision);
    let project;try{if(Buffer.byteLength(JSON.stringify(input),"utf8")>512_000)throw new Error();project=validateLockInProject(input);}catch{throw new ProjectError("Choose a valid Lock-In version 1 project with up to 2,000 tasks and 32 nesting levels.");}
    const fingerprint=createHash("sha256").update(JSON.stringify(project)).digest("hex");
    if((await tx.query("SELECT fingerprint FROM project_task_imports WHERE project_id=$1 AND fingerprint=$2",[projectId,fingerprint])).rows.length)throw new ProjectError("This exact Lock-In project has already been imported.");
    let count=0;const countTasks=(items:typeof project.tasks)=>{for(const t of items){count++;countTasks(t.subtasks);}};countTasks(project.tasks);
    if(!count)throw new ProjectError("The selected project has no tasks to import.");
    if(current.tasks.length+count>2000)throw new ProjectError("This project has reached the 2,000-task limit.");
    // Remap every source ID and preserve preorder so imports append deterministically.
    const rows: {id:string;parent_id:string|null;title:string;status:string;collapsed:boolean;created_at:string;updated_at:string;ordinal:number}[]=[];
    const flatten=(items:typeof project.tasks,parent:string|null)=>{for(const t of items){const id=randomUUID();rows.push({id,parent_id:parent,title:t.title,status:t.status,collapsed:t.collapsed,created_at:t.created_at,updated_at:t.updated_at,ordinal:rows.length});flatten(t.subtasks,id);}};
    flatten(project.tasks,null);
    await tx.query(`INSERT INTO project_tasks(id,project_id,parent_id,title,status,collapsed,created_by,updated_by,created_at,updated_at)
      SELECT id,$1,parent_id,title,status::task_status,collapsed,$2,$2,created_at,updated_at
      FROM jsonb_to_recordset($3::jsonb) AS imported(id uuid,parent_id uuid,title text,status text,collapsed boolean,created_at timestamptz,updated_at timestamptz,ordinal integer)
      ORDER BY ordinal`,[projectId,actor.userId,JSON.stringify(rows)]);
    await tx.query("INSERT INTO project_task_imports(project_id,fingerprint,imported_by) VALUES($1,$2,$3)",[projectId,fingerprint,actor.userId]);
    await recordActivity(tx,actor,projectId,"tasks_imported");return changed(tx,projectId);
  }),
  export:(actor:Actor,projectId:string)=>db.transaction(async tx=>{
    await membership(tx,actor,projectId);
    await tx.query("SELECT id FROM projects WHERE id=$1 FOR SHARE",[projectId]);
    const project=(await tx.query<{id:string;name:string;created_at:Date}>("SELECT id,name,created_at FROM projects WHERE id=$1",[projectId])).rows[0];
    return toLockIn(required(project),await snapshot(tx,projectId));
  }),
};}
