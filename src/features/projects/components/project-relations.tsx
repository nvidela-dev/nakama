"use client";
import { Icon } from "@/shared/ui/icon";
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
          className={
            "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)]"
          }
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
    <details
      open
      className={
        "panel project-relations bg-panel border border-line max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] grid gap-2.5 min-w-0 p-3 rounded-[8px] [&_>_div_>_h3]:mt-0 [&_>_div_>_h3]:mx-0 [&_>_div_>_h3]:mb-0.75 [&_>_div_>_h3]:text-[11px] [&_>_div_>_h3]:leading-[1.4] [&_>_div_>_p]:m-0 [&_>_div_>_p]:text-[11px] [&_>_div_>_p]:leading-[1.4] [&_>_.new-project-trigger]:m-0 [&_>_.new-project-trigger]:min-h-7 [&_>_.new-project-trigger]:py-1.25 [&_>_.new-project-trigger]:px-2 [&_>_.new-project-trigger]:text-[11px] [&_>_.new-project-trigger]:leading-[1.4] [&_>_.new-project-trigger_>_span]:text-[16px] [&_.project-link-list_.text-button]:m-0 [&_.project-link-list_.text-button]:min-h-7 [&_.project-link-list_.text-button]:p-1 [&_.project-link-list_.text-button]:text-[10px] pointer-coarse:[&_>_.new-project-trigger]:min-h-11 pointer-coarse:[&_.project-link-list_.text-button]:min-h-11"
      }
    >
      <summary className="cursor-pointer select-none [[open]>&]:mb-3">
        <h2
          className={
            "font-mono tracking-[-0.045em] font-medium inline-flex items-center m-0 text-[14px] leading-[1.3]"
          }
        >
          {t("Linked projects")}{" "}
          <span className="count text-[10px] border border-line rounded-full px-1.5 py-0.5 ml-1.25">
            {links.sources.length + links.children.length}
          </span>
        </h2>
      </summary>
      {(
        [
          ["source", "Spawned from", links.sources],
          ["child", "Spawned projects", links.children],
        ] as const
      ).map(([direction, title, items]) => (
        <div key={direction}>
          <h3
            className={
              "mb-[1em] font-mono tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mx-0 lg:compact:mb-2 mt-7 lg:compact:mt-4.5"
            }
          >
            {t(title)}
          </h3>
          {items.length ? (
            <ul
              className={
                "project-link-list list-none p-0 max-h-55 overflow-y-auto [&_li_>_div]:flex-none m-0 text-[11px] leading-[1.4]"
              }
            >
              {items.map((other) => (
                <li
                  key={other.id}
                  className={"flex items-center justify-between gap-2 py-1.25 px-0"}
                >
                  <Link
                    href={`/projects/${other.id}`}
                    className={
                      "pointer-coarse:min-h-11 pointer-coarse:flex pointer-coarse:items-center wrap-anywhere"
                    }
                  >
                    {other.name} <Icon name="arrowUpRight" />
                  </Link>
                  <RemoveLink projectId={projectId} other={other} direction={direction} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={"muted mb-[1em] mt-0 text-[12px] text-muted"}>
              {t("No linked projects to show.")}
            </p>
          )}
        </div>
      ))}
      <NewProjectButton initialSourceIds={[projectId]} label="Spawn project" />
      <details>
        <summary
          className={
            "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 cursor-pointer text-[11px] leading-[1.5] pointer-coarse:min-h-11 pointer-coarse:[align-content:center]"
          }
        >
          {t("Link an existing project")}
        </summary>
        <form
          action={action}
          className={
            "form-stack flex flex-col [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] [&_input]:w-full [&_input]:border [&_input]:border-[var(--theme-border,#4b6056)] [&_input]:bg-bg [&_input]:text-ink [&_input]:rounded-[8px] [&_input]:p-3 [&_input]:text-[14px] [&_input]:[resize:vertical] lg:compact:[&_input]:py-2 lg:compact:[&_input]:px-2.5 lg:compact:[&_input]:text-[13px] gap-1.5 mt-2"
          }
        >
          <label className={"text-ink text-[11px]"}>
            {t("Relationship")}
            <Select
              name="direction"
              aria-label={t("Relationship")}
              className={
                "min-h-7 compact:py-1.25 compact:px-2 compact:text-[11px] pointer-coarse:min-h-11 bg-bg text-ink border border-[var(--theme-border,#4b6056)] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:[outline-offset:4px]"
              }
            >
              <option value="child">{t("Spawned project")}</option>
              <option value="source">{t("Source project")}</option>
            </Select>
          </label>
          <label className={"text-ink text-[11px]"}>
            {t("Project")}
            <Select
              name="otherId"
              aria-label={t("Project")}
              required
              defaultValue=""
              className={
                "min-h-7 compact:py-1.25 compact:px-2 compact:text-[11px] pointer-coarse:min-h-11 bg-bg text-ink border border-[var(--theme-border,#4b6056)] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:[outline-offset:4px]"
              }
            >
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
          <Button
            type="submit"
            disabled={pending || projects.length < 2}
            className={
              "min-h-7 py-1.25 px-2 text-[11px] pointer-coarse:min-h-11 mt-2 lg:compact:mt-1"
            }
          >
            {pending ? t("Saving…") : t("Link project")}
          </Button>
          <Feedback state={state} />
        </form>
      </details>
      <small className={"muted text-muted text-[10px] leading-[1.45]"}>
        {t("Links do not share access. Only projects you belong to appear here.")}
      </small>
    </details>
  );
}
