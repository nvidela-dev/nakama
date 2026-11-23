"use client";
import { FormStack } from "@/shared/ui/workspace-layout";
import { Panel } from "@/shared/ui/panel";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { type ArtifactDetail } from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";
import type { Dispatch, SetStateAction } from "react";
import type { ArtifactDraft } from "../model";

export function ArtifactDetailsForm({
  run,
  draft,
  setDraft,
  stages,
  artifact,
  pending,
}: {
  run: (
    operation: "metadata",
    input: Omit<ArtifactDraft, "stageId"> & { stageId: string | null },
  ) => void;
  draft: ArtifactDraft;
  setDraft: Dispatch<SetStateAction<ArtifactDraft>>;
  stages: { id: string; name: string }[];
  artifact: ArtifactDetail;
  pending: boolean;
}) {
  const t = useT();
  return (
    <Panel>
      <h2
        className={
          "mb-[0.83em] font-sans tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3 mt-0 text-[17px]"
        }
      >
        {t("Details")}
      </h2>
      <FormStack
        onSubmit={(event) => {
          event.preventDefault();
          run("metadata", { ...draft, stageId: draft.stageId || null });
        }}
      >
        <label className={"text-[13px] text-ink"}>
          {t("Artifact name")}
          <Input
            value={draft.name}
            required
            maxLength={160}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={"w-full [resize:vertical]"}
          />
        </label>
        <label className={"text-[13px] text-ink"}>
          {t("Description")}
          <Textarea
            value={draft.description}
            maxLength={4000}
            rows={3}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
          />
        </label>
        {!!stages.length && (
          <label className={"text-[13px] text-ink"}>
            {t("Phase (optional)")}
            <Select
              aria-label={t("Phase (optional)")}
              value={draft.stageId}
              onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
              className={"max-w-full focus-visible:[outline-offset:4px]"}
            >
              <option value="">{t("Whole project")}</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {t(stage.name)}
                </option>
              ))}
            </Select>
          </label>
        )}
        {artifact.kind === "software" && (
          <label className={"text-[13px] text-ink"}>
            {t("GitHub link")}
            <Input
              type="url"
              value={draft.githubUrl}
              placeholder="https://github.com/…"
              required={draft.status === "ready"}
              onChange={(e) => setDraft({ ...draft, githubUrl: e.target.value })}
              className={"w-full [resize:vertical]"}
            />
          </label>
        )}
        <label className={"text-[13px] text-ink"}>
          {t("Artifact status")}
          <Select
            aria-label={t("Artifact status")}
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as "ready" | "in_progress" })
            }
            className={"max-w-full focus-visible:[outline-offset:4px]"}
          >
            <option value="in_progress">{t("In progress")}</option>
            <option value="ready">{t("Ready to use")}</option>
          </Select>
        </label>
        <p className={"muted mb-[1em] mt-0 text-muted text-[11px]"}>
          {t("Ready requires the correct file or GitHub link. To-dos stay independent.")}
        </p>
        <Button type="submit" pending={pending} className={"mt-2 lg:compact:mt-1"}>
          {pending ? t("Saving…") : t("Save details")}
        </Button>
      </FormStack>
    </Panel>
  );
}
