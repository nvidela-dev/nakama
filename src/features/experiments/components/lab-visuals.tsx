"use client";
import { useT } from "@/shared/i18n/provider";
import { Icon, type IconName } from "@/shared/ui/icon";
import type { Experiment } from "../model";

/** Recorded milestones, not a confidence score or a compulsory sequence. */
export function LabPath({ experiment }: { experiment?: Experiment }) {
  const t = useT();
  const steps: [string, IconName, number][] = [
    ["Plan", "idea", experiment?.plans.length ?? 0],
    ["Run", "arrowRight", experiment?.runs.length ?? 0],
    ["Evidence", "markdown", experiment?.evidence.length ?? 0],
    ["Review", "answered", experiment?.reviews.length ?? 0],
  ];
  return (
    <ol aria-label={t("Recorded milestones")} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {steps.map(([label, icon, count], index) => (
        <li
          key={label}
          className={`flex items-center gap-3 rounded-lg border p-3 ${count ? "border-lime bg-lime/10" : "border-line bg-panel"}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line">
            <Icon name={icon} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-muted">0{index + 1}</span>
            <strong className="block text-[14px]">{t(label)}</strong>
          </div>
          <span className="text-[22px] tabular-nums">{count || "—"}</span>
        </li>
      ))}
    </ol>
  );
}

export function LabResults({ experiment }: { experiment: Experiment }) {
  const t = useT();
  // Keep separate units and plan versions separate. Free-text values are never parsed partially.
  const groups = new Map<
    string,
    { unit: string; version: number; values: { id: string; value: number; run: number }[] }
  >();
  for (const evidence of experiment.evidence) {
    if (evidence.kind !== "measurement" || !evidence.measurement?.trim()) continue;
    const value = Number(evidence.measurement);
    if (!Number.isFinite(value)) continue;
    const run = experiment.runs.findIndex((r) => r.id === evidence.run_id);
    if (run < 0) continue;
    const version =
      experiment.plans.find((p) => p.id === experiment.runs[run]?.plan_id)?.version ?? 0;
    const unit = evidence.unit?.trim() || t("Unit not recorded");
    const key = JSON.stringify([version, unit]);
    const group = groups.get(key) ?? { unit, version, values: [] };
    group.values.push({ id: evidence.id, value, run: run + 1 });
    groups.set(key, group);
  }
  const statuses = ["running", "completed", "cancelled"] as const;
  return (
    <section
      aria-label={t("Results at a glance")}
      className="grid gap-3 xl:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)]"
    >
      <div className="rounded-lg border border-line p-3 grid content-start gap-3">
        <h4 className="text-[14px] font-bold">{t("Run activity")}</h4>
        {statuses.map((status) => {
          const count = experiment.runs.filter((run) => run.status === status).length;
          return (
            <div key={status} className="grid gap-1 text-[12px]">
              <span className="flex justify-between gap-2">
                {t(status)}
                <strong>{count}</strong>
              </span>
              <div className="h-2 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-lime motion-safe:transition-[width] motion-safe:duration-500"
                  style={{
                    width: `${experiment.runs.length ? (count / experiment.runs.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
        <span className="text-[11px] text-muted">{t("Execution is not validation.")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {!groups.size && (
          <div className="rounded-lg border border-dashed border-line p-4 grid content-center justify-items-center gap-2 text-center min-h-44">
            <Icon name="overview" size={30} />
            <strong className="text-[14px]">{t("Your measurements appear here")}</strong>
            <span className="text-[12px] text-muted max-w-72">
              {t("Add a measurement with a numeric value and unit to a run.")}
            </span>
          </div>
        )}
        {[...groups.entries()].map(([key, group]) => {
          const low = Math.min(0, ...group.values.map((v) => v.value));
          const high = Math.max(0, ...group.values.map((v) => v.value));
          const max = high === low ? high + 1 : high;
          const range = max - low;
          return (
            <figure key={key} className="min-w-0 rounded-lg border border-line p-3">
              <figcaption className="flex flex-wrap justify-between gap-2 text-[12px]">
                <strong>{group.unit}</strong>
                <span>
                  {t("Plan version")} {group.version}
                </span>
              </figcaption>
              <div
                role="img"
                aria-label={`${t("Recorded measurements")} · ${group.unit}`}
                className="my-3 grid gap-2"
              >
                <div className="flex justify-between pl-12 text-[11px] text-muted">
                  <span>{low}</span>
                  <span>{max}</span>
                </div>
                {group.values.map((point) => (
                  <div
                    key={point.id}
                    className="flex items-center gap-2 text-[11px]"
                    title={`${t("Run")} ${point.run}: ${point.value} ${group.unit}`}
                  >
                    <span className="w-10 shrink-0">R{point.run}</span>
                    <div className="relative h-6 flex-1 min-w-0 border-x border-line bg-lime/5">
                      <span
                        className="absolute inset-y-0 border-l border-line"
                        style={{ left: `${((0 - low) / range) * 100}%` }}
                      />
                      <span
                        className="absolute top-2 size-2 -translate-x-1/2 rounded-full bg-lime"
                        style={{ left: `${((point.value - low) / range) * 100}%` }}
                      />
                    </div>
                    <strong className="w-14 text-right truncate">{point.value}</strong>
                  </div>
                ))}
              </div>
              <details className="text-[12px]">
                <summary className="cursor-pointer">{t("Measurement values")}</summary>
                <ul className="grid gap-1 mt-2">
                  {group.values.map((v) => (
                    <li key={v.id}>
                      {t("Run")} {v.run}:{" "}
                      <strong>
                        {v.value} {group.unit}
                      </strong>
                    </li>
                  ))}
                </ul>
              </details>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
