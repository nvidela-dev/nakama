import { required } from "../src/lib/query";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";
import sharp from "sharp";
import {artifactService,ArtifactConflictError} from "../src/lib/artifacts";
import {projectService} from "../src/lib/projects";
import {guidanceService} from "../src/lib/guidance";
import type {Database} from "../src/lib/database";
const sql=new PGlite(),db:Database={query:(q,v)=>sql.query(q,v),transaction:work=>sql.transaction(tx=>work(tx))};
const artifacts=artifactService(db),projects=projectService(db),guidance=guidanceService(db);
const owner={userId:"artifact-owner",displayName:"Owner",verifiedEmails:["owner@example.com"]},member={userId:"artifact-member",displayName:"Member",verifiedEmails:["member@example.com"]},outsider={userId:"outsider",verifiedEmails:[]};
before(async()=>{for(const file of (await readdir("migrations")).filter(f=>f.endsWith(".sql")).sort())await sql.exec(await readFile("migrations/"+file,"utf8"));});
after(async()=>{await sql.close();});
async function fixture(){
 const projectId=await projects.create(owner,{name:"Artifact fixture",description:"Synthetic artifact tests"});
 await guidance.select(owner,projectId,"creative");
 const invite=await projects.invite(owner,projectId,member.verifiedEmails[0]);await projects.accept(member,invite.token);
 return projectId;
}
test("artifacts and private file bytes honor membership, project identity, removal and global library access",async()=>{
 const projectId=await fixture(),other=await projects.create(outsider,{name:"Unrelated artifact project",description:"Not visible to owner"});
 const id=await artifacts.create(member,projectId,{name:"Research notes",kind:"markdown",stageId:"imagine"});
 await artifacts.create(outsider,other,{name:"Secret",kind:"software"});
 let detail=await artifacts.upload(member,projectId,id,1,{name:"notes.md",data:Buffer.from("# Private notes")});
 assert.ok((await artifacts.list(owner)).some(a=>a.id===id));
 assert.ok(!(await artifacts.list(owner)).some(a=>a.project_id===other));
 assert.equal((await artifacts.list(outsider,other)).length,1);
 await assert.rejects(artifacts.get(owner,other,id));
 await assert.rejects(artifacts.list(outsider,projectId));
 await assert.rejects(artifacts.file(owner,other,id,required(detail.files[0]).id));
 await assert.rejects(artifacts.file(outsider,projectId,id,required(detail.files[0]).id));
 const file=await artifacts.file(owner,projectId,id,required(detail.files[0]).id);
 assert.equal(Buffer.from(file.data).toString(),"# Private notes");
 await projects.remove(owner,projectId,member.userId);
 assert.ok(!(await artifacts.list(member)).some(a=>a.id===id));
 await assert.rejects(artifacts.get(member,projectId,id));
 await assert.rejects(artifacts.file(member,projectId,id,required(detail.files[0]).id));
 await assert.rejects(artifacts.save(member,projectId,id,detail.revision,{name:"No",status:"ready"}));
});
test("in-progress artifacts may be placeholders; readiness requires typed outputs and valid stage/GitHub links",async()=>{
 const projectId=await fixture();
 for(const kind of ["image","markdown","software"] as const){
   await assert.rejects(artifacts.create(owner,projectId,{name:"Empty ready",kind,status:"ready"}));
   const id=await artifacts.create(owner,projectId,{name:"In progress",kind});
   assert.equal((await artifacts.get(owner,projectId,id)).status,"in_progress");
   await assert.rejects(artifacts.save(owner,projectId,id,1,{name:"Ready",status:"ready"}));
 }
 await assert.rejects(artifacts.create(owner,projectId,{name:"Wrong stage",kind:"image",stageId:"validation"}));
 await assert.rejects(artifacts.create(owner,projectId,{name:"Bad link",kind:"software",githubUrl:"https://github.com.evil.example/owner/repo"}));
 await assert.rejects(artifacts.create(owner,projectId,{name:"Bad link",kind:"software",githubUrl:"javascript:alert(1)"}));
 const id=await artifacts.create(owner,projectId,{name:"Version 1",kind:"software",githubUrl:"https://github.com/example/repo/releases/tag/v1",status:"ready"});
 assert.equal((await artifacts.get(owner,projectId,id)).status,"ready");
 await assert.rejects(artifacts.upload(owner,projectId,id,1,{name:"cover.png",data:Buffer.from("invalid")}));
});
test("image payloads are sniffed, bounded, previewed without library bytes, and require progress before removing the last ready output",async()=>{
 const projectId=await fixture(),id=await artifacts.create(owner,projectId,{name:"Design",kind:"image"});
 await assert.rejects(artifacts.upload(owner,projectId,id,1,{name:"fake.png",data:Buffer.from("<svg><script>bad()</script></svg>")}));
 await assert.rejects(artifacts.upload(owner,projectId,id,1,{name:"large.png",data:new Uint8Array(2*1024*1024+1)}));
 const png=await sharp({create:{width:16,height:16,channels:3,background:"#dcf6a3"}}).png().toBuffer();
 let detail=await artifacts.upload(owner,projectId,id,1,{name:"misleading.txt",data:png});
 assert.equal(required(detail.files[0]).media_type,"image/png");
 assert.equal(required(detail.files[0]).name,"misleading.png");
 assert.equal((await artifacts.list(owner,projectId)).find(a=>a.id===id)?.file_count,1);
 assert.ok(!JSON.stringify(await artifacts.list(owner,projectId)).includes('"data"'));
 detail=await artifacts.save(owner,projectId,id,detail.revision,{name:"Design",status:"ready"});
 await assert.rejects(artifacts.removeFile(owner,projectId,id,detail.revision,required(detail.files[0]).id));
 detail=await artifacts.save(owner,projectId,id,detail.revision,{name:"Design",status:"in_progress"});
 detail=await artifacts.removeFile(owner,projectId,id,detail.revision,required(detail.files[0]).id);
 assert.equal(detail.files.length,0);
});
test("Markdown replacement is atomic, UTF-8 validated, revisions prevent lost edits, and artifact tasks remain independent",async()=>{
 const projectId=await fixture(),id=await artifacts.create(owner,projectId,{name:"Plan",kind:"markdown"});
 await assert.rejects(artifacts.upload(owner,projectId,id,1,{name:"plan.md",data:new Uint8Array([255,254,0])}));
 await assert.rejects(artifacts.upload(owner,projectId,id,1,{name:"plan.txt",data:Buffer.from("# A plan")}));
 let first=await artifacts.upload(owner,projectId,id,1,{name:"plan.md",data:Buffer.from("# Version one")});
 const oldId=required(first.files[0]).id;
 await assert.rejects(artifacts.upload(member,projectId,id,1,{name:"other.md",data:Buffer.from("# Stale")}),ArtifactConflictError);
 const next=await artifacts.upload(member,projectId,id,first.revision,{name:"plan.md",data:Buffer.from("# Version two\n\n<script>unsafe()</script>")});
 assert.equal(next.files.length,1);assert.match(next.markdown!,/Version two/);
 await assert.rejects(artifacts.file(owner,projectId,id,oldId));
 const task={id:randomUUID(),title:"Write the introduction",status:"done"};
 const saved=await artifacts.tasks(owner,projectId,id,next.revision,[task]);
 assert.equal(required(saved.tasks[0]).status,"done");assert.equal(saved.status,"in_progress");
 assert.equal((await artifacts.get(owner,projectId,id)).tasks.length,1);
 await assert.rejects(artifacts.tasks(member,projectId,id,next.revision,[]),ArtifactConflictError);
 await assert.rejects(artifacts.tasks(owner,projectId,id,saved.revision,[task,task]));
 const ready=await artifacts.save(owner,projectId,id,saved.revision,{name:"Plan",status:"ready",stageId:"imagine"});
 assert.equal(ready.stage_id,"imagine");
});
test("whole-artifact and project deletion remove their files; failures leave data intact and activity has no private bodies",async()=>{
 const projectId=await fixture(),id=await artifacts.create(owner,projectId,{name:"Delete me",kind:"markdown"});
 const detail=await artifacts.upload(owner,projectId,id,1,{name:"notes.md",data:Buffer.from("Sensitive content fixture")});
 await assert.rejects(artifacts.remove(owner,projectId,id,detail.revision,"Wrong name"));
 assert.equal((await artifacts.get(owner,projectId,id)).files.length,1);
 const activity=(await db.query<{subject_name:string|null}>("SELECT subject_name FROM project_activity WHERE project_id=$1",[projectId])).rows;
 assert.ok(!JSON.stringify(activity).includes("Sensitive content fixture"));
 await artifacts.remove(owner,projectId,id,detail.revision,"Delete me");
 await assert.rejects(artifacts.get(owner,projectId,id));
 const another=await artifacts.create(owner,projectId,{name:"Cascade",kind:"markdown",stageId:"imagine"});
 await artifacts.upload(owner,projectId,another,1,{name:"notes.md",data:Buffer.from("Cascade fixture")});
 await projects.deleteProject(owner,projectId,"Artifact fixture");
 assert.equal(required((await db.query<{count:number}>("SELECT count(*)::int AS count FROM artifact_files WHERE project_id=$1",[projectId])).rows[0]).count,0);
});
test("a failed activity write rolls back Markdown replacement and preserves the original file and revision",async()=>{
 const projectId=await fixture(),id=await artifacts.create(owner,projectId,{name:"Atomic plan",kind:"markdown"});
 const initial=await artifacts.upload(owner,projectId,id,1,{name:"original.md",data:Buffer.from("# Keep this original")});
 const broken:Database={query:db.query,transaction:work=>db.transaction(tx=>work({query:async(q,v)=>{
   if(q.includes("INSERT INTO project_activity"))throw new Error("Synthetic event failure");
   return tx.query(q,v);
 }}))};
 await assert.rejects(artifactService(broken).upload(owner,projectId,id,initial.revision,{name:"replacement.md",data:Buffer.from("# Must roll back")}));
 const preserved=await artifacts.get(owner,projectId,id);
 assert.equal(preserved.revision,initial.revision);
 assert.equal(required(preserved.files[0]).id,required(initial.files[0]).id);
 assert.equal(preserved.markdown,"# Keep this original");
});
