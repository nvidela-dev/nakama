"use client";
import { StatusMessage } from "@/shared/ui/panel";
import { FormStack } from "@/shared/ui/workspace-layout";

import { Icon } from "@/shared/ui/icon";
import { Input, Select, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useState, useTransition } from "react";
import { Dialog } from "@/shared/ui/dialog";
import type { createArtifact } from "@/features/artifacts/actions";
import { artifactKinds, artifactUrl, type ArtifactCard } from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";

export function CreateArtifactDialog({
  items,
  projects,
  projectId,
  stages,
  stageId,
  close,
  save,
  onCreated,
}: {
  items: ArtifactCard[];
  projects: { id: string; name: string; flow_id?: string | null }[];
  projectId: string | undefined;
  stages: { id: string; name: string }[];
  stageId: string | undefined;
  close: () => void;
  save: typeof createArtifact;
  onCreated: (href: string) => void;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState("");
  const [createProject, setCreateProject] = useState(projectId ?? projects[0]?.id);
  const shirtShop = projects.find((p) => p.id === createProject)?.flow_id === "shirt-eshop";
  const [createKind, setCreateKind] = useState(projectId && shirtShop ? "shirt" : "image");
  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await save(String(form.get("projectId")), {
          name: form.get("name"),
          description: form.get("description"),
          kind: form.get("kind"),
          ...(form.get("collection") ? { collection: form.get("collection") } : {}),
          stageId: form.get("stageId") || null,
          status: "in_progress",
          githubUrl: form.get("githubUrl") || "",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        close();
        onCreated(artifactUrl(String(form.get("projectId")), result.id!));
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      }
    });
  }
  return (
    <Dialog
      open
      onClose={close}
      dismissible={!pending}
      className={
        "artifact-dialog w-[min(560px,_calc(100vw_-_32px))] max-h-[90dvh] overflow-y-auto bg-panel text-ink border border-line rounded-[12px] p-6 backdrop:[background:var(--theme-overlay,#06100de8)]"
      }
      labelledBy="new-artifact-heading"
    >
      <FormStack onSubmit={create}>
        <div
          className={
            "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start"
          }
        >
          <h2
            id="new-artifact-heading"
            className={
              "font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
            }
          >
            {t("New artifact")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className={
              "min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-2 lg:compact:mt-1 max-[700px]:w-full"
            }
            onClick={close}
            aria-label={t("Close")}
          >
            <Icon name="close" />
          </Button>
        </div>
        {projectId ? (
          <input
            type="hidden"
            name="projectId"
            value={projectId}
            className={"w-full [resize:vertical]"}
          />
        ) : (
          <label className={"text-[13px] text-ink"}>
            {t("Project")}
            <Select
              aria-label={t("Project")}
              name="projectId"
              value={createProject}
              onChange={(e) => {
                setCreateProject(e.target.value);
                setCreateKind(
                  projects.find((p) => p.id === e.target.value)?.flow_id === "shirt-eshop"
                    ? "shirt"
                    : "image",
                );
              }}
              required
              className={"max-w-full focus-visible:[outline-offset:4px]"}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className={"text-[13px] text-ink"}>
          {t("Artifact name")}
          <Input
            name="name"
            required
            maxLength={160}
            autoFocus
            className={"w-full [resize:vertical]"}
          />
        </label>
        <label className={"text-[13px] text-ink"}>
          {t("Artifact type")}
          <Select
            aria-label={t("Artifact type")}
            name="kind"
            value={createKind}
            onChange={(e) => setCreateKind(e.target.value)}
            className={"max-w-full focus-visible:[outline-offset:4px]"}
          >
            {shirtShop && <option value="shirt">{t("Shirt design")}</option>}
            {Object.entries(artifactKinds).map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </Select>
        </label>
        {createKind === "shirt" && (
          <label>
            {t("Collection")}
            <Input
              name="collection"
              maxLength={80}
              required
              defaultValue={
                items.find((a) => a.project_id === createProject && a.collection)?.collection ??
                t("Collection 01")
              }
              list="shop-collections"
            />
            <datalist id="shop-collections">
              {Array.from(
                new Set(
                  items
                    .filter((a) => a.project_id === createProject)
                    .map((a) => a.collection)
                    .filter(Boolean),
                ),
              ).map((c) => (
                <option key={c} value={c!} />
              ))}
            </datalist>
          </label>
        )}
        <label className={"text-[13px] text-ink"}>
          {t("Description")}
          <Textarea
            name="description"
            maxLength={4000}
            rows={3}
            className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
          />
        </label>
        {!!stages.length && (
          <label className={"text-[13px] text-ink"}>
            {t("Phase (optional)")}
            <Select
              aria-label={t("Phase (optional)")}
              name="stageId"
              defaultValue={stageId ?? ""}
              className={"max-w-full focus-visible:[outline-offset:4px]"}
            >
              <option value="">{t("Whole project")}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.name)}
                </option>
              ))}
            </Select>
          </label>
        )}
        <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
          {t(
            "Created in progress. Add images, a Markdown file, or a GitHub link on the next screen.",
          )}
        </p>
        {error && <StatusMessage tone="error">{t(error)}</StatusMessage>}
        <Button type="submit" pending={pending} className={"mt-2 lg:compact:mt-1"}>
          {pending ? t("Saving…") : t("Create artifact")}
        </Button>
      </FormStack>
    </Dialog>
  );
}
