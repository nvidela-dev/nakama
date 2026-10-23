import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { artifactService } from "@/features/artifacts/server/artifacts";
import { projectService } from "@/features/projects/server/projects";
import { ArtifactLibrary } from "@/features/artifacts/components/artifact-library";
import { getT } from "@/shared/i18n/server";
export const dynamic = "force-dynamic";
export default async function ArtifactsPage() {
  const person = await actor(),
    t = await getT();
  const [items, projects] = await Promise.all([
    artifactService(database()).list(person),
    projectService(database()).list(person),
  ]);
  return (
    <main id="main" className="workspace artifact-workspace">
      <div className="page-heading">
        <h1>{t("Artifact library")}</h1>
        <p>{t("Browse the outputs of projects you belong to.")}</p>
      </div>
      <ArtifactLibrary items={items} projects={projects.map(({ id, name }) => ({ id, name }))} />
    </main>
  );
}
