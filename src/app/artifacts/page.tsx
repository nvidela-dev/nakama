import { PageHeading, Workspace } from "@/shared/ui/workspace-layout";
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
    <Workspace id="main" variant="artifacts">
      <PageHeading>
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
      </PageHeading>
      <ArtifactLibrary
        items={items}
        projects={projects.map(({ id, name, flow_id }) => ({ id, name, flow_id }))}
      />
    </Workspace>
  );
}
