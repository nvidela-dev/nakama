"use client";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { useT } from "@/shared/i18n/provider";
import { errorReference } from "@/shared/lib/error-reference";

// `retry` refetches the failed route; `reset` would only re-render the boundary without new data.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT();
  const reference = errorReference(error);
  return (
    <main
      id="main"
      className={
        "workspace narrow pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0 max-w-162.5"
      }
    >
      <Panel className="">
        <h1
          className={
            "mb-[0.67em] mt-0 font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium"
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
    </main>
  );
}
