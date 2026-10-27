"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";
import { reloadExperiments, saveExperiment, exportExperimentBrief } from "../actions";
import type { Experiment } from "../model";
import type { ExperimentPrompts } from "../flow-prompts";
function LabLoading() {
  const t = useT();
  return <LoadingState label={t("Loading…")} lines={3} />;
}
const ExperimentLab = dynamic(
  () => import("./experiment-lab").then((module) => module.ExperimentLab),
  { loading: LabLoading },
);
export function ProjectTests({
  projectId,
  questions,
  prompts,
  names,
}: {
  projectId: string;
  questions: { id: string; label: string; stageId: string }[];
  prompts?: ExperimentPrompts | undefined;
  names: Record<string, string | null>;
}) {
  const t = useT();
  const active = useSearchParams().get("view") === "tests";
  const [items, setItems] = useState<Experiment[] | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || items !== null) return;
    let ignore = false;
    void reloadExperiments(projectId)
      .then((result) => {
        if (ignore) return;
        if (result.items) setItems(result.items);
        else setError(result.error);
      })
      .catch(() => {
        if (!ignore) setError("Could not reload experiments. Check your access and try again.");
      });
    return () => {
      ignore = true;
    };
  }, [active, items, projectId, retry]);
  if (items !== null)
    return (
      <ExperimentLab
        projectId={projectId}
        initial={items}
        questions={questions}
        prompts={prompts}
        names={names}
        save={saveExperiment}
        reload={reloadExperiments}
        exportBrief={exportExperimentBrief}
      />
    );
  if (error)
    return (
      <div className="grid gap-3">
        <p role="alert">{t(error)}</p>
        <Button
          onClick={() => {
            setError("");
            setRetry((value) => value + 1);
          }}
        >
          {t("Try again")}
        </Button>
      </div>
    );
  return active ? <LabLoading /> : null;
}
