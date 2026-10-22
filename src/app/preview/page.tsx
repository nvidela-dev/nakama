import Link from "next/link";
import { Journey } from "@/components/journey";
import { flows } from "@/lib/flows";
import type { Guidance } from "@/lib/guidance";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; node?: string }>;
}) {
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
        content: "A tiny pirate radio play",
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
        content:
          "A short adventure with silly sea monsters and homemade sound effects.",
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
        ← Back to the harbor
      </Link>
      <div className="page-heading">
        <span className="eyebrow">
          READ-ONLY EXAMPLE · NOTHING HERE IS YOUR PROJECT DATA
        </span>
        <h1>A tiny pirate radio play</h1>
        <p>
          Try opening a stage, then a question. This sample shows the path; sign
          in and create your own project to save answers.
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
