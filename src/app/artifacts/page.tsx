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
    <main
      id="main"
      className={
        "workspace artifact-workspace pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0 max-w-390"
      }
    >
      <div
        className={
          "page-heading mt-7.5 mx-0 mb-10.5 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5"
        }
      >
        <h1
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Artifact library")}
        </h1>
        <p
          className={
            "mb-[1em] mt-0 text-muted max-w-175 lg:compact:max-w-none lg:compact:mt-2 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {t("Browse the outputs of projects you belong to.")}
        </p>
      </div>
      <ArtifactLibrary items={items} projects={projects.map(({ id, name }) => ({ id, name }))} />
    </main>
  );
}
