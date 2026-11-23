"use client";
import { ArtifactOutputPanel } from "./artifact-output-panel";
import { artifactUploadByteLimit } from "@/features/artifacts/model";
import { ConflictBanner } from "@/shared/ui/form-patterns";
import { StatusMessage } from "@/shared/ui/panel";
import { ConfirmByName } from "@/shared/ui/form-patterns";
import { ArtifactLightbox } from "./artifact-lightbox";
import { ArtifactTaskListForm } from "./artifact-task-list-form";
import { ArtifactDetailsForm } from "./artifact-details-form";
import { useUnsavedDraftGuard } from "@/shared/lib/use-unsaved-draft-guard";
import { FormStack } from "@/shared/ui/workspace-layout";

import { Button } from "@/shared/ui/button";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeArtifact,
  uploadArtifactFile,
  type ArtifactResult,
  type ArtifactSaved,
} from "@/features/artifacts/actions";
import {
  artifactFileUrl,
  type ArtifactDetail,
  type ArtifactTask,
} from "@/features/artifacts/model";
import dynamic from "next/dynamic";
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";
function MarkdownLoading() {
  const t = useT();
  return <LoadingState label={t("Loading…")} lines={3} />;
}
const ShirtStudio = dynamic(() => import("../shirts/studio").then((m) => m.ShirtStudio), {
  loading: MarkdownLoading,
});
const draftOf = (a: ArtifactDetail) => ({
  name: a.name,
  description: a.description,
  stageId: a.stage_id ?? "",
  status: a.status,
  githubUrl: a.github_url ?? "",
});
export function ArtifactEditor({
  initial,
  stages,
}: {
  initial: ArtifactDetail;
  stages: { id: string; name: string }[];
}) {
  const t = useT(),
    router = useRouter();
  const [artifact, setArtifact] = useState(initial),
    [shirtDraft, setShirtDraft] = useState(initial.shirt),
    [draft, setDraft] = useState(draftOf(initial)),
    [tasks, setTasks] = useState<ArtifactTask[]>(initial.tasks);
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [current, setCurrent] = useState<ArtifactDetail>();
  const [image, setImage] = useState<number | null>(null),
    [removeFile, setRemoveFile] = useState<string>(),
    [confirmation, setConfirmation] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const shirtDirty = useMemo(
    () =>
      shirtDraft !== artifact.shirt &&
      JSON.stringify(shirtDraft) !== JSON.stringify(artifact.shirt),
    [shirtDraft, artifact.shirt],
  );
  const dirty =
    shirtDirty ||
    draft.name !== artifact.name ||
    draft.description !== artifact.description ||
    draft.status !== artifact.status ||
    draft.githubUrl !== (artifact.github_url ?? "") ||
    draft.stageId !== (artifact.stage_id ?? "") ||
    tasks.length !== artifact.tasks.length ||
    tasks.some((task, i) => {
      const saved = artifact.tasks[i];
      return (
        !saved || task.id !== saved.id || task.title !== saved.title || task.status !== saved.status
      );
    });
  useUnsavedDraftGuard(dirty, t("Leave this unsaved draft?"));
  function closeImage() {
    setImage(null);
  }
  function apply(
    result: ArtifactResult,
    metadata = false,
    taskSave = false,
  ): result is ArtifactSaved {
    if (result.error) {
      setError(result.error);
      setCurrent(result.current);
      return false;
    }
    if (result.artifact) {
      setArtifact(result.artifact);
      if (metadata) setDraft(draftOf(result.artifact));
      if (taskSave) setTasks(result.artifact.tasks);
    }
    setError("");
    setCurrent(undefined);
    setNotice("Artifact saved.");
    return !!result.artifact;
  }
  function run(
    operation: "shirt" | "metadata" | "tasks" | "remove-file" | "delete",
    input: unknown,
  ) {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await changeArtifact(
          artifact.project_id,
          artifact.id,
          artifact.revision,
          operation,
          input,
        );
        if (result.deleted) {
          router.push(`/projects/${artifact.project_id}?view=artifacts`);
          return;
        }
        if (apply(result, operation === "metadata", operation === "tasks")) {
          if (operation === "shirt") setShirtDraft(result.artifact.shirt);
          setRemoveFile(undefined);
        }
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      }
    });
  }
  function uploadFiles(files: File[], placed?: (ids: string[]) => void) {
    if (!files.length) return;
    setNotice("");
    startTransition(async () => {
      let revision = artifact.revision;
      const known = new Set(artifact.files.map((f) => f.id)),
        added: string[] = [];
      try {
        for (const file of files) {
          if (file.size > artifactUploadByteLimit) {
            setError("Choose a file up to 2 MB.");
            return;
          }
          const data = new FormData();
          data.set("file", file);
          const result = await uploadArtifactFile(artifact.project_id, artifact.id, revision, data);
          if (!apply(result)) return;
          for (const f of result.artifact.files)
            if (!known.has(f.id)) {
              known.add(f.id);
              added.push(f.id);
            }
          revision = result.artifact.revision;
        }
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      } finally {
        if (added.length) placed?.(added);
        if (upload.current) upload.current.value = "";
      }
    });
  }
  function patchTask(id: string, patch: Partial<ArtifactTask>) {
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }
  const images = artifact.files.filter((file) => file.media_type.startsWith("image/"));

  return (
    <div
      className={
        "artifact-detail grid grid-cols-[minmax(0,_1fr)_340px] gap-6 items-start max-[1000px]:grid-cols-[minmax(0,_1fr)]"
      }
    >
      {shirtDraft && artifact.shirt ? (
        <ShirtStudio
          artifact={artifact}
          design={shirtDraft}
          onChange={setShirtDraft}
          pending={pending}
          dirty={shirtDirty}
          onSave={(poster) => run("shirt", { ...shirtDraft, poster })}
          onUpload={uploadFiles}
          onRemove={(file) => run("remove-file", file)}
        />
      ) : (
        <ArtifactOutputPanel
          artifact={artifact}
          images={images}
          pending={pending}
          upload={upload}
          uploadFiles={uploadFiles}
          removeFile={removeFile}
          setRemoveFile={setRemoveFile}
          setImage={setImage}
          onRemove={(id) => run("remove-file", id)}
        />
      )}
      <aside
        className={
          "artifact-details-column min-w-0 grid gap-4.5 max-[1000px]:grid-cols-[repeat(auto-fit,_minmax(min(100%,_280px),_1fr))]"
        }
      >
        <ArtifactDetailsForm
          run={run}
          draft={draft}
          setDraft={setDraft}
          stages={stages}
          artifact={artifact}
          pending={pending}
        />
        <ArtifactTaskListForm
          artifact={artifact}
          run={run}
          tasks={tasks}
          patchTask={patchTask}
          setTasks={setTasks}
          pending={pending}
        />
        <div
          className={"artifact-feedback min-w-0 max-[1000px]:[grid-column:1/-1]"}
          aria-live="polite"
        >
          {dirty && (
            <p className={"muted mb-[1em] mt-0 text-muted text-[11px]"}>{t("Unsaved changes")}</p>
          )}
          {notice && <StatusMessage>{t(notice)}</StatusMessage>}
          {error && <StatusMessage tone="error">{t(error)}</StatusMessage>}
          {current && (
            <ConflictBanner>
              <p className={"mb-[1em] mt-0 text-muted"}>
                {t("Latest version:")} {current.name}
              </p>
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setArtifact(current);
                  setCurrent(undefined);
                  setError("");
                }}
              >
                {t("Use latest version and keep my drafts")}
              </Button>
            </ConflictBanner>
          )}
        </div>
        <details
          className={
            "artifact-danger border-t border-t-line pt-3.5 text-[12px] max-[1000px]:[grid-column:1/-1]"
          }
        >
          <summary
            className={
              "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 cursor-pointer text-pink"
            }
          >
            {t("Delete artifact")}
          </summary>
          <FormStack
            className="pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("delete", confirmation);
            }}
          >
            <p className={"mb-[1em] mt-0"}>
              {t(
                "Permanently delete this artifact, its files, and its to-do list. Enter its exact name to confirm.",
              )}
            </p>
            <ConfirmByName
              expected={artifact.name}
              value={confirmation}
              onChange={setConfirmation}
              label={t("Confirm artifact name")}
              submitLabel={t("Permanently delete artifact")}
              pending={pending}
            />
          </FormStack>
        </details>
      </aside>
      <ArtifactLightbox
        image={image}
        closeImage={closeImage}
        images={images}
        setImage={setImage}
        fileUrl={(id) => artifactFileUrl(artifact.project_id, artifact.id, id)}
      />
    </div>
  );
}
