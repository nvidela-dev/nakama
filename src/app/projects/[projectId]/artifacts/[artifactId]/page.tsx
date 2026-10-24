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
    <main
      id="main"
      className={
        "workspace artifact-workspace pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0 max-w-390"
      }
    >
      <div
        className={
          "page-heading mt-7.5 mx-0 mb-10.5 [&_p]:text-muted [&_p]:max-w-175 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5 lg:compact:[&_p]:max-w-none lg:compact:[&_p]:mt-2 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-0 lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:leading-[1.5]"
        }
      >
        <div className={"artifact-breadcrumb text-[12px] mb-3 wrap-anywhere"}>
          <Link href="/artifacts" className={"text-lime"}>
            {t("Artifact library")}
          </Link>
          <span> / </span>
          <Link href={`/projects/${projectId}?view=artifacts`} className={"text-lime"}>
            {artifact.project_name}
          </Link>
          {artifact.stage_id && (
            <>
              <span> / </span>
              <Link
                href={`/projects/${projectId}?stage=${encodeURIComponent(artifact.stage_id)}`}
                className={"text-lime"}
              >
                {t(
                  guidance?.flow.stages.find((s) => s.id === artifact.stage_id)?.name ??
                    artifact.stage_id,
                )}
              </Link>
            </>
          )}
        </div>
        <h1
          className={
            "mb-[0.67em] mt-0 font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Artifact workspace")}
        </h1>
      </div>
      <ArtifactEditor
        initial={artifact}
        stages={guidance?.flow.stages.map(({ id, name }) => ({ id, name })) ?? []}
      />
    </main>
  );
}
