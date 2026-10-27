import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { projectService, ProjectError } from "@/features/projects/server/projects";
import { collaborationService, commentTarget } from "@/features/collaboration/server/collaboration";
import { Discussion } from "@/features/collaboration/components/discussion";
import { database } from "@/server/database/db";
import { getT } from "@/shared/i18n/server";
export const dynamic = "force-dynamic";
/** Retain access to earlier task comments through their notification links. */
export default async function TaskDiscussion({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ comment?: string; commentsBefore?: string }>;
}) {
  const { projectId } = await params,
    query = await searchParams,
    person = await actor(),
    t = await getT();
  const target = commentTarget("tasks", undefined);
  let project, comments;
  try {
    [project, comments] = await Promise.all([
      projectService(database()).get(person, projectId),
      collaborationService(database()).comments(
        person,
        projectId,
        target,
        query.commentsBefore,
        query.comment,
      ),
    ]);
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  return (
    <main id="main" className="w-full p-4 min-w-0">
      <Link
        href={`/projects/${projectId}?view=tasks`}
        className="inline-flex items-center min-h-11 text-sm"
      >
        {t("To-do")}
      </Link>
      <h1 className="text-xl font-semibold">{project.name}</h1>
      <Discussion
        projectId={projectId}
        target={target}
        label={t("To-do discussion")}
        comments={comments}
        userId={person.userId}
        owner={project.role === "owner"}
        olderHref={
          comments.next
            ? `/projects/${projectId}/discussion?commentsBefore=${encodeURIComponent(comments.next)}`
            : undefined
        }
        latestHref={
          query.comment || query.commentsBefore ? `/projects/${projectId}/discussion` : undefined
        }
      />
    </main>
  );
}
