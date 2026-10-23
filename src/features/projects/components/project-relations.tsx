"use client";
import { Input, Select } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import Link from "next/link";
import { useActionState } from "react";
import { changeProjectLink } from "@/features/projects/actions";
import type { LinkedProject, ProjectLinks } from "@/features/projects/model";
import { NewProjectButton } from "@/features/projects/components/new-project";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";
function RemoveLink({
  projectId,
  other,
  direction,
}: {
  projectId: string;
  other: LinkedProject;
  direction: "source" | "child";
}) {
  const t = useT(),
    [state, action, pending] = useActionState(changeProjectLink.bind(null, projectId), {});
  return (
    <div>
      <form action={action}>
        <Input type="hidden" name="otherId" value={other.id} />
        <Input type="hidden" name="direction" value={direction} />
        <Input type="hidden" name="operation" value="remove" />
        <Button
          type="submit"
          className="text-button"
          disabled={pending}
          aria-label={t("Unlink {name}", { name: other.name })}
        >
          {t("Unlink")}
        </Button>
      </form>
      <Feedback state={state} />
    </div>
  );
}
export function ProjectRelations({
  projectId,
  links,
  projects,
}: {
  projectId: string;
  links: ProjectLinks;
  projects: LinkedProject[];
}) {
  const t = useT(),
    [state, action, pending] = useActionState(changeProjectLink.bind(null, projectId), {});
  return (
    <aside className="panel project-relations">
      <h2>{t("Linked projects")}</h2>
      {(
        [
          ["source", "Spawned from", links.sources],
          ["child", "Spawned projects", links.children],
        ] as const
      ).map(([direction, title, items]) => (
        <div key={direction}>
          <h3>{t(title)}</h3>
          {items.length ? (
            <ul className="project-link-list">
              {items.map((other) => (
                <li key={other.id}>
                  <Link href={`/projects/${other.id}`}>{other.name} ↗</Link>
                  <RemoveLink projectId={projectId} other={other} direction={direction} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("No linked projects to show.")}</p>
          )}
        </div>
      ))}
      <NewProjectButton projects={projects} initialSourceIds={[projectId]} label="Spawn project" />
      <details>
        <summary>{t("Link an existing project")}</summary>
        <form action={action} className="form-stack">
          <label>
            {t("Relationship")}
            <Select name="direction" aria-label={t("Relationship")}>
              <option value="child">{t("Spawned project")}</option>
              <option value="source">{t("Source project")}</option>
            </Select>
          </label>
          <label>
            {t("Project")}
            <Select name="otherId" aria-label={t("Project")} required defaultValue="">
              <option value="" disabled>
                {t("Choose a project")}
              </option>
              {projects
                .filter((p) => p.id !== projectId)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </label>
          <Button type="submit" disabled={pending || projects.length < 2}>
            {pending ? t("Saving…") : t("Link project")}
          </Button>
          <Feedback state={state} />
        </form>
      </details>
      <small className="muted">
        {t("Links do not share access. Only projects you belong to appear here.")}
      </small>
    </aside>
  );
}
