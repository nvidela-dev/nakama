import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { artifactService } from "@/lib/artifacts";
import { guidanceService } from "@/lib/guidance";
import { ProjectError } from "@/lib/projects";
import { getT } from "@/lib/i18n/server";
import { ArtifactEditor } from "@/components/artifact-editor";
export const dynamic="force-dynamic";
export default async function ArtifactPage({params}:{params:Promise<{projectId:string;artifactId:string}>}) {
  const person=await actor(),{projectId,artifactId}=await params,t=await getT();
  try {
    const [artifact,guidance]=await Promise.all([artifactService(database()).get(person,projectId,artifactId),guidanceService(database()).get(person,projectId)]);
    return <main id="main" className="workspace artifact-workspace">
      <div className="page-heading"><div className="artifact-breadcrumb"><Link href="/artifacts">{t("Artifact library")}</Link><span> / </span><Link href={`/projects/${projectId}?view=artifacts`}>{artifact.project_name}</Link>{artifact.stage_id&&<><span> / </span><Link href={`/projects/${projectId}?stage=${encodeURIComponent(artifact.stage_id)}`}>{t(guidance?.flow.stages.find(s=>s.id===artifact.stage_id)?.name??artifact.stage_id)}</Link></>}</div><h1>{t("Artifact workspace")}</h1></div>
      <ArtifactEditor initial={artifact} stages={guidance?.flow.stages.map(({id,name})=>({id,name}))??[]}/>
    </main>;
  } catch(error) {if(error instanceof ProjectError)notFound();throw error;}
}
