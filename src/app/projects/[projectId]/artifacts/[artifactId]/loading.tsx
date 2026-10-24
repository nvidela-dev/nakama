import { LoadingState } from "@/shared/ui/loading-state";
import { getT } from "@/shared/i18n/server";
export default async function Loading() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "workspace artifact-workspace pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-[none] lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_button]:min-h-8.5 lg:compact:[&_button]:py-2 lg:compact:[&_button]:px-3 lg:compact:[&_button]:text-[12px] lg:compact:[&_button]:rounded-[7px] lg:compact:[&_.button]:min-h-8.5 lg:compact:[&_.button]:py-2 lg:compact:[&_.button]:px-3 lg:compact:[&_.button]:text-[12px] lg:compact:[&_.button]:rounded-[7px] min-[2000px]:compact:[padding-inline:40px] lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-[none] min-[1280px]:[&:has(>_.has-discussion)]:[padding-inline:24px] [&_.project-heading]:mt-0 compact:[&_.journey-content_>_.button.secondary]:text-[11px] compact:[&_.journey-content_>_.button.secondary]:min-h-7.5 compact:[&_.journey-content_>_.button.secondary]:py-1.5 compact:[&_.journey-content_>_.button.secondary]:px-2.5 pointer-coarse:compact:[&_.journey-content_>_.button.secondary]:min-h-11 lg:compact:[&_.answer-panel_h2]:my-1.5 lg:compact:[&_.answer-panel_h2]:mx-0 lg:compact:[&_.answer-panel_h2]:text-[14px] lg:compact:[&_.answer-panel_h2]:leading-[1.3] compact:[&_.stage-heading-row_.miniview-icon]:w-8 compact:[&_.stage-heading-row_.miniview-icon]:h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-w-8 compact:[&_.stage-heading-row_.miniview-icon]:p-0 compact:[&_.stage-heading-row_.miniview-icon]:rounded-[6px] pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:h-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-h-11 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:m-0 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:text-[13px] compact:[&_.journey-stage-heading_.stage-heading-row_h2]:leading-[1.3] max-w-390"
      }
    >
      <LoadingState label={t("Loading…")} variant="stack" lines={3} />
    </main>
  );
}
