import {
  saveExperiment,
  reloadExperiments,
  exportExperimentBrief,
} from "@/features/experiments/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { projectService, ProjectError } from "@/features/projects/server/projects";
import { guidanceService } from "@/features/guidance/server/guidance";
import { experimentService } from "@/features/experiments/server/experiments";
import { ExperimentLab } from "@/features/experiments/components/experiment-lab";
import { getT } from "@/shared/i18n/server";
export const dynamic = "force-dynamic";
export default async function LabPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ node?: string }>;
}) {
  const { projectId } = await params;
  const { node } = await searchParams;
  const person = await actor();
  const t = await getT();
  let project, items, guidance, people;
  try {
    [project, items, guidance, people] = await Promise.all([
      projectService(database()).get(person, projectId),
      experimentService(database())
        .available(person, projectId)
        .then((ready) => (ready ? experimentService(database()).list(person, projectId) : null)),
      guidanceService(database()).get(person, projectId),
      projectService(database()).people(person, projectId),
    ]);
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const questions =
    guidance?.flow.stages.flatMap((s) =>
      s.nodes
        .filter((n) => n.kind === "question")
        .map((n) => ({ id: n.id, label: t(n.label), stageId: s.id })),
    ) ?? [];
  return (
    <main id="main" className="max-w-360 mx-auto p-4 lg:p-6 min-w-0">
      <nav className="flex flex-wrap gap-4 mb-5 text-[14px]">
        <Link href={`/projects/${projectId}`}>{t("Project flow")}</Link>
        <Link href={`/projects/${projectId}?view=tasks`}>{t("To-do")}</Link>
        <Link href={`/projects/${projectId}?view=artifacts`}>{t("Artifacts")}</Link>
        <Link href="/wiki/experiments">{t("Lab guide")}</Link>
      </nav>
      <h1 className="text-[32px] font-semibold mb-3">{project.name}</h1>
      {items === null ? (
        <p role="status">
          {t("The experiment lab is being prepared. Your other project tools remain available.")}
        </p>
      ) : (
        <ExperimentLab
          save={saveExperiment}
          reload={reloadExperiments}
          exportBrief={exportExperimentBrief}
          projectId={projectId}
          initial={items}
          questions={questions}
          initialNode={node ?? ""}
          names={Object.fromEntries(people.members.map((m) => [m.user_id, m.display_name]))}
        />
      )}
    </main>
  );
}
