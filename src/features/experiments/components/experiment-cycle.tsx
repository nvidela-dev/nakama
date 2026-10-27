import Link from "next/link";
import { getT } from "@/shared/i18n/server";
import type { FlowId } from "@/shared/contracts/database.generated";
import { experimentPrompts } from "../flow-prompts";
/** Navigation, not a completion meter: only run evidence and human reviews establish results. */
export async function ExperimentCycle({
  projectId,
  flowId,
  nodeId,
  preview = false,
}: {
  projectId: string;
  flowId?: FlowId | undefined;
  nodeId?: string | undefined;
  preview?: boolean;
}) {
  const t = await getT();
  const lab = preview ? "/wiki/experiments" : `/projects/${projectId}/lab`;
  const newTest = preview
    ? lab
    : `${lab}?new=1${nodeId ? `&node=${encodeURIComponent(nodeId)}` : ""}`;
  const prompts = flowId ? experimentPrompts[flowId] : undefined;
  return (
    <section
      className="border border-line rounded-[12px] bg-panel px-3 py-2 grid gap-2 my-3"
      aria-label={t("Experiment cycle")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-semibold text-[14px]">{t("Every idea starts untested")}</h2>
          <p className="text-muted text-[12px]">
            {t(prompts?.claim ?? "What do you want to learn from this idea?")}
          </p>
        </div>
        <Link
          href={newTest}
          className="inline-flex min-h-8 pointer-coarse:min-h-11 items-center rounded-[9px] bg-lime text-dark px-2.5 py-1 text-[12px] font-semibold"
        >
          {t(nodeId ? "Test this question" : "Test this idea")}
        </Link>
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-1 list-none p-0 m-0 text-[12px]">
        {["Idea", "Test plan", "Run", "Evidence", "Review", "Next decision"].map((label, i) => (
          <li key={label} className="inline-flex items-center py-0.5">
            <span className="font-mono text-muted mr-1.5">{i + 1}</span>
            {t(label)}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <p className="text-muted">
          {t(
            "Saved answers frame ideas. Completed tasks show work. Reviewed evidence supports conclusions.",
          )}
        </p>
        <Link
          className="text-lime underline min-h-7 pointer-coarse:min-h-11 inline-flex items-center"
          href={lab}
        >
          {t("Track experiments and results")}
        </Link>
      </div>
    </section>
  );
}
