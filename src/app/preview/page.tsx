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
    <main id="main" className="workspace">
      <Link href="/" className="back-link">
        {t("← Home")}{" "}
      </Link>
      <div className="page-heading">
        <span className="eyebrow">
          {t("READ-ONLY EXAMPLE · NOTHING HERE IS YOUR PROJECT DATA")}{" "}
        </span>
        <h1>{t("Audio production project")}</h1>
        <p>
          {t(
            "Try opening a stage, then a question. This sample shows the path; sign in and create your own project to save answers.",
          )}{" "}
        </p>
      </div>
      <div className="preview-journey">
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
