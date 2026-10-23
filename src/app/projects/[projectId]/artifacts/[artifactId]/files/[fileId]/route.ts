import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { artifactService } from "@/lib/artifacts";
import { ProjectError } from "@/lib/projects";
export const dynamic="force-dynamic";
export async function GET(request: Request, {params}: {params: Promise<{projectId:string;artifactId:string;fileId:string}>}) {
  const person=await actor(), {projectId,artifactId,fileId}=await params;
  try {
    const file=await artifactService(database()).file(person,projectId,artifactId,fileId);
    const download=new URL(request.url).searchParams.has("download") || file.media_type==="text/markdown";
    const filename=encodeURIComponent(file.name).replace(/'/g,"%27");
    return new Response(new Uint8Array(file.data),{headers:{
      "Content-Type":file.media_type, "Content-Length":String(file.size),
      "Content-Disposition":`${download?"attachment":"inline"}; filename="artifact-file"; filename*=UTF-8''${filename}`,
      "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff",
      "Content-Security-Policy":"default-src 'none'; sandbox",
    }});
  } catch(error) {
    if(error instanceof ProjectError)return new Response("Not found",{status:404,headers:{"Cache-Control":"private, no-store"}});
    throw error;
  }
}
