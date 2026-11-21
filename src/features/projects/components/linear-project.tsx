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
  return (
    <div className="flex items-start flex-wrap gap-3 text-sm">
      {url && (
        <a className="underline" href={url} rel="noopener noreferrer" target="_blank">
          {t("Open Linear project")}
        </a>
      )}
      {owner && (
        <details>
          <summary className="cursor-pointer">
            {t(url ? "Edit Linear link" : "Link Linear project")}
          </summary>
          <form action={save} className="grid gap-2 my-2">
            <label>
              {t("Linear project URL")}
              <Input
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
