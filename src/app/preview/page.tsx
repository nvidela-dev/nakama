import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { Journey } from "@/features/guidance/components/journey";
import { flows } from "@/features/guidance/model/flows";
import type { Guidance } from "@/features/guidance/model/types";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; node?: string }>;
}) {
  const t = await getT();
  const query = await searchParams;
  const guidance: Guidance = {
    flow: flows.creative,
    projectState: "active",
    contentRevision: 0,
    reviews: [],
    answers: [
      {
        node_id: "spark-name",
        stage_id: "spark",
        revision: 1,
        content: "Audio production project",
        status: "answered",
        choice: null,
        needs_review: false,
        updated_by: "example",
        updated_at: new Date("2026-10-21T12:00:00Z"),
      },
      {
        node_id: "spark-description",
        stage_id: "spark",
        revision: 1,
        content: "An audio documentary with interviews and original recordings.",
        status: "answered",
        choice: null,
        needs_review: false,
        updated_by: "example",
        updated_at: new Date("2026-10-21T12:00:00Z"),
      },
    ],
  };
  return (
    <main
      id="main"
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-[none] lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_button]:min-h-8.5 lg:compact:[&_button]:py-2 lg:compact:[&_button]:px-3 lg:compact:[&_button]:text-[12px] lg:compact:[&_button]:rounded-[7px] lg:compact:[&_.button]:min-h-8.5 lg:compact:[&_.button]:py-2 lg:compact:[&_.button]:px-3 lg:compact:[&_.button]:text-[12px] lg:compact:[&_.button]:rounded-[7px] min-[2000px]:compact:[padding-inline:40px] min-[1280px]:[&:has(>_.has-discussion)]:max-w-[none] min-[1280px]:[&:has(>_.has-discussion)]:[padding-inline:24px] [&_.project-heading]:mt-0 compact:[&_.journey-content_>_.button.secondary]:text-[11px] compact:[&_.journey-content_>_.button.secondary]:min-h-7.5 compact:[&_.journey-content_>_.button.secondary]:py-1.5 compact:[&_.journey-content_>_.button.secondary]:px-2.5 pointer-coarse:compact:[&_.journey-content_>_.button.secondary]:min-h-11 lg:compact:[&_.answer-panel_h2]:my-1.5 lg:compact:[&_.answer-panel_h2]:mx-0 lg:compact:[&_.answer-panel_h2]:text-[14px] lg:compact:[&_.answer-panel_h2]:leading-[1.3] compact:[&_.stage-heading-row_.miniview-icon]:w-8 compact:[&_.stage-heading-row_.miniview-icon]:h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-w-8 compact:[&_.stage-heading-row_.miniview-icon]:p-0 compact:[&_.stage-heading-row_.miniview-icon]:rounded-[6px] pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:h-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-h-11 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:m-0 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:text-[13px] compact:[&_.journey-stage-heading_.stage-heading-row_h2]:leading-[1.3]"
      }
    >
      <Link href="/" className={"back-link text-[13px] text-muted"}>
        {t("← Home")}{" "}
      </Link>
      <div
        className={
          "page-heading mt-7.5 mx-0 mb-10.5 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5"
        }
      >
        <span
          className={
            "eyebrow text-[10px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] lg:compact:mb-1.5"
          }
        >
          {t("READ-ONLY EXAMPLE · NOTHING HERE IS YOUR PROJECT DATA")}{" "}
        </span>
        <h1
          className={
            "mb-[0.67em] mt-0 font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-[none] lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Audio production project")}
        </h1>
        <p
          className={
            "mb-[1em] mt-0 text-muted max-w-175 lg:compact:max-w-[none] lg:compact:mt-2 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {t(
            "Try opening a stage, then a question. This sample shows the path; sign in and create your own project to save answers.",
          )}{" "}
        </p>
      </div>
      <div
        className={"preview-journey max-w-185 my-0 mx-auto lg:compact:max-w-[none] lg:compact:m-0"}
      >
        <Journey
          projectId="example"
          guidance={guidance}
          stageId={query.stage}
          nodeId={query.node}
          preview
        />
      </div>
    </main>
  );
}
