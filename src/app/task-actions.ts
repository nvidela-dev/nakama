"use server";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError } from "@/lib/projects";
import { taskService, TaskConflictError, type TaskOperation } from "@/lib/tasks";
import type { LockInState, TaskSnapshot } from "@/lib/task-model";
export type TaskResult={snapshot?:TaskSnapshot;error?:string;conflict?:boolean};
function failure(error:unknown):TaskResult{
  if(error instanceof TaskConflictError)return {error:error.message,snapshot:error.snapshot,conflict:true};
  return {error:error instanceof ProjectError?error.message:"Could not save tasks. Your draft is still here."};
}
export async function changeTask(projectId:string,revision:number,operation:TaskOperation):Promise<TaskResult>{
  const person=await actor();let snapshot;
  try{snapshot=await taskService(database()).change(person,projectId,revision,operation);}catch(error){return failure(error);}
  revalidatePath(`/projects/${projectId}`);return {snapshot};
}
export async function importTasks(projectId:string,revision:number,input:unknown):Promise<TaskResult>{
  const person=await actor();let snapshot;
  try{snapshot=await taskService(database()).import(person,projectId,revision,input);}catch(error){return failure(error);}
  revalidatePath(`/projects/${projectId}`);return {snapshot};
}
export async function exportTasks(projectId:string):Promise<{data?:LockInState;error?:string}>{
  const person=await actor();try{return {data:await taskService(database()).export(person,projectId)};}catch(error){return failure(error);}
}
