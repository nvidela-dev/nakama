import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { artifactService } from "@/lib/artifacts";
import { projectService } from "@/lib/projects";
import { ArtifactLibrary } from "@/components/artifact-library";
import { getT } from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function ArtifactsPage() {
  const person=await actor(), t=await getT();
  const [items,projects]=await Promise.all([artifactService(database()).list(person),projectService(database()).list(person)]);
  return <main id="main" className="workspace artifact-workspace"><div className="page-heading"><h1>{t("Artifact library")}</h1><p>{t("Browse the outputs of projects you belong to.")}</p></div>
    <ArtifactLibrary items={items} projects={projects.map(({id,name})=>({id,name}))}/>
  </main>;
}
