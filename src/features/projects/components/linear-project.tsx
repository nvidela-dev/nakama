"use client";
import { useActionState } from "react";
import { saveProjectLinearLink } from "../actions";
import { Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
export function LinearProject({
  projectId,
  url,
  revision,
  owner,
}: {
  projectId: string;
  url: string | null;
  revision: number;
  owner: boolean;
}) {
  const t = useT();
  const [state, save, pending] = useActionState(
    saveProjectLinearLink.bind(null, projectId, revision),
    {},
  );
  if (!url && !owner) return null;
  return (
    <div className="project-linear-panel panel grid min-w-0 gap-2 rounded-[8px] border border-line bg-panel p-3 text-sm lg:compact:rounded-[10px] lg:compact:p-2.5">
      {url && (
        <a className="underline" href={url} rel="noopener noreferrer" target="_blank">
          {t("Open Linear project")}
        </a>
      )}
      {owner && (
        <details className="min-w-0">
          <summary className="cursor-pointer wrap-anywhere pointer-coarse:min-h-11">
            {t(url ? "Edit Linear link" : "Link Linear project")}
          </summary>
          <form action={save} className="my-2 grid min-w-0 gap-2">
            <label>
              {t("Linear project URL")}
              <Input
                className="w-full min-w-0"
                name="url"
                type="url"
                maxLength={2000}
                defaultValue={url ?? ""}
                placeholder="https://linear.app/…"
              />
            </label>
            <Button type="submit" variant="secondary" pending={pending}>
              {t("Save Linear link")}
            </Button>
            <Feedback state={state} />
          </form>
        </details>
      )}
    </div>
  );
}
