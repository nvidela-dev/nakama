import { ExperimentCycle } from "@/features/experiments/components/experiment-cycle";
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
        "workspace w-full max-w-300 lg:max-w-360 lg:compact:max-w-360 min-[1280px]:[&:has(>_.has-discussion)]:max-w-360 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
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
            "eyebrow text-[11px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] lg:compact:mb-1.5"
          }
        >
          {t("READ-ONLY EXAMPLE · NOTHING HERE IS YOUR PROJECT DATA")}{" "}
        </span>
        <h1
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Audio production project")}
        </h1>
        <p
          className={
            "mb-[1em] mt-0 text-muted max-w-175 lg:compact:max-w-none lg:compact:mt-2 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {t(
            "Try opening a stage, then a question. This sample shows the path; sign in and create your own project to save answers.",
          )}{" "}
        </p>
      </div>
      <ExperimentCycle projectId="example" flowId="creative" preview />
      <div
        className={"preview-journey max-w-185 my-0 mx-auto lg:compact:max-w-none lg:compact:m-0"}
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
