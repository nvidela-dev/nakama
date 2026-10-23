import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { artifactService } from "@/features/artifacts/server/artifacts";
import { guidanceService } from "@/features/guidance/server/guidance";
import { ProjectError } from "@/features/projects/server/projects";
import { getT } from "@/shared/i18n/server";
import { ArtifactEditor } from "@/features/artifacts/components/artifact-editor";
export const dynamic = "force-dynamic";
export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ projectId: string; artifactId: string }>;
}) {
  const person = await actor(),
    { projectId, artifactId } = await params,
    t = await getT();
  const [artifact, guidance] = await (async () => {
    try {
      return await Promise.all([
        artifactService(database()).get(person, projectId, artifactId),
        guidanceService(database()).get(person, projectId),
      ]);
    } catch (error) {
      if (error instanceof ProjectError) notFound();
      throw error;
    }
  })();
  return (
    <main id="main" className="workspace artifact-workspace">
      <div className="page-heading">
        <div className="artifact-breadcrumb">
          <Link href="/artifacts">{t("Artifact library")}</Link>
          <span> / </span>
          <Link href={`/projects/${projectId}?view=artifacts`}>{artifact.project_name}</Link>
          {artifact.stage_id && (
            <>
              <span> / </span>
              <Link href={`/projects/${projectId}?stage=${encodeURIComponent(artifact.stage_id)}`}>
                {t(
                  guidance?.flow.stages.find((s) => s.id === artifact.stage_id)?.name ??
                    artifact.stage_id,
                )}
              </Link>
            </>
          )}
        </div>
        <h1>{t("Artifact workspace")}</h1>
      </div>
      <ArtifactEditor
        initial={artifact}
        stages={guidance?.flow.stages.map(({ id, name }) => ({ id, name })) ?? []}
      />
    </main>
  );
}
