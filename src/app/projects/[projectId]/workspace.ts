import {
  readProject,
  readPeople,
  readProjectChoices,
  withProjectRead,
  type Actor,
} from "@/features/projects/server/projects";
import { readLinks } from "@/features/projects/server/project-links";
import { readGuidance, readHistory } from "@/features/guidance/server/guidance";
import {
  readActivity,
  readComments,
  type CommentTarget,
} from "@/features/collaboration/server/collaboration";
import { readTasks } from "@/features/tasks/server/tasks";
import { readProjectArtifacts, readArtifactChoices } from "@/features/artifacts/server/artifacts";
import type { Database } from "@/server/database/database";

export function loadWorkspace(
  db: Database,
  actor: Actor,
  projectId: string,
  options: {
    target: CommentTarget;
    node?: string;
    view?: string;
    focusedWork: boolean;
    activityView: boolean;
    commentsBefore?: string;
    activityBefore?: string;
    comment?: string;
  },
) {
  return withProjectRead(db, actor, projectId, async (scope) => {
    const project = await readProject(scope);
    const guidance = await readGuidance(scope);
    const people = await readPeople(scope);
    const history = options.node ? await readHistory(scope, options.node) : [];
    const comments = options.focusedWork
      ? { items: [], next: undefined }
      : await readComments(scope, options.target, options.commentsBefore, options.comment);
    const activity = options.activityView
      ? await readActivity(scope, options.activityBefore)
      : { items: [], next: undefined };
    const tasks = options.view === "tasks" ? await readTasks(scope) : null;
    const artifactChoices = tasks ? await readArtifactChoices(scope) : [];
    const artifacts = options.view === "artifacts" ? await readProjectArtifacts(scope) : null;
    const links = options.focusedWork ? { sources: [], children: [] } : await readLinks(scope);
    const accessibleProjects = options.focusedWork ? [] : await readProjectChoices(scope);
    return {
      project,
      guidance,
      people,
      history,
      comments,
      activity,
      tasks,
      artifactChoices,
      artifacts,
      links,
      accessibleProjects,
    };
  });
}
