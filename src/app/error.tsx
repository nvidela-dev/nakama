"use client";
import { Workspace } from "@/shared/ui/workspace-layout";

import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { useT } from "@/shared/i18n/provider";
import { errorReference } from "@/shared/lib/error-reference";

// `retry` refetches the failed route; `reset` would only re-render the boundary without new data.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT();
  const reference = errorReference(error);
  return (
    <Workspace id="main" variant="narrow">
      <Panel className="">
        <h1
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium"
          }
        >
          {t("Unable to load")}
        </h1>
        <p className={"mb-[1em] mt-0"}>
          {t("We couldn't load this part of your workspace. Please try again in a moment.")}{" "}
        </p>
        {reference && (
          <p className={"mb-[1em] mt-0"}>
            {t("Reference")}: {reference}
          </p>
        )}
        <Button type="button" onClick={() => retry()} className={""}>
          {t("Try again")}
        </Button>
      </Panel>
    </Workspace>
  );
}
