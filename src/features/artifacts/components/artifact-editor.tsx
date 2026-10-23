"use client";
import { Panel } from "@/shared/ui/panel";

import { Input, Select, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeArtifact,
  uploadArtifactFile,
  type ArtifactResult,
  type ArtifactSaved,
} from "@/features/artifacts/actions";
import {
  artifactKinds,
  artifactFileUrl,
  type ArtifactDetail,
  type ArtifactTask,
} from "@/features/artifacts/model";
import dynamic from "next/dynamic";
import { Dialog } from "@/shared/ui/dialog";
const MarkdownReader = dynamic(() =>
  import("@/shared/ui/markdown-reader").then((module) => module.MarkdownReader),
);
import { useT } from "@/shared/i18n/provider";

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
    [draft, setDraft] = useState(draftOf(initial)),
    [tasks, setTasks] = useState<ArtifactTask[]>(initial.tasks);
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [current, setCurrent] = useState<ArtifactDetail>();
  const [image, setImage] = useState<number | null>(null),
    [removeFile, setRemoveFile] = useState<string>(),
    [confirmation, setConfirmation] = useState("");
  const imageOpener = useRef<HTMLElement | null>(null),
    upload = useRef<HTMLInputElement>(null);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(draftOf(artifact)) ||
    JSON.stringify(tasks) !== JSON.stringify(artifact.tasks);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest("a");
      if (
        a &&
        a.target !== "_blank" &&
        !a.hasAttribute("download") &&
        !a.getAttribute("href")?.startsWith("#") &&
        !window.confirm(t("Leave this unsaved draft?"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, t]);
  function closeImage() {
    setImage(null);
    imageOpener.current?.focus();
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
  function run(operation: "metadata" | "tasks" | "remove-file" | "delete", input: unknown) {
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
        if (apply(result, operation === "metadata", operation === "tasks"))
          setRemoveFile(undefined);
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      }
    });
  }
  function uploadFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setNotice("");
    startTransition(async () => {
      let revision = artifact.revision;
      try {
        for (const file of files) {
          if (file.size > 2 * 1024 * 1024) {
            setError("Choose a file up to 2 MB.");
            return;
          }
          const data = new FormData();
          data.set("file", file);
          const result = await uploadArtifactFile(artifact.project_id, artifact.id, revision, data);
          if (!apply(result)) return;
          revision = result.artifact.revision;
        }
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      } finally {
        if (upload.current) upload.current.value = "";
      }
    });
  }
  function patchTask(id: string, patch: Partial<ArtifactTask>) {
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }
  const images = artifact.files.filter((file) => file.media_type.startsWith("image/"));
  const viewing = image !== null ? images[image] : undefined;
  return (
    <div className="artifact-detail">
      <Panel className="artifact-output" aria-label={t("Artifact output")}>
        <div className="artifact-library-heading">
          <div>
            <span className="eyebrow">{t(artifactKinds[artifact.kind])}</span>
            <h2>{artifact.name}</h2>
          </div>
          <span className={`artifact-status ${artifact.status}`}>
            {t(artifact.status === "ready" ? "Ready to use" : "In progress")}
          </span>
        </div>
        {artifact.kind === "software" ? (
          <div className="software-output">
            <span className="software-symbol" aria-hidden="true">
              &lt;/&gt;
            </span>
            {artifact.github_url ? (
              <>
                <h3>{t("GitHub repository / release")}</h3>
                <a
                  className="button"
                  href={artifact.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Open on GitHub")} ↗
                </a>
                <p className="preserve-lines">{artifact.github_url}</p>
              </>
            ) : (
              <p>{t("Add a GitHub link in Details to connect this software artifact.")}</p>
            )}
          </div>
        ) : (
          <>
            {artifact.kind === "image" && (
              <div className="artifact-images">
                {images.map((file, index) => (
                  <figure key={file.id}>
                    <Button
                      type="submit"
                      className="artifact-image-button"
                      aria-label={`${t("Expand image")}: ${file.name}`}
                      onClick={(event) => {
                        imageOpener.current = event.currentTarget;
                        setImage(index);
                      }}
                    >
                      <img
                        decoding="async"
                        src={artifactFileUrl(artifact.project_id, artifact.id, file.id)}
                        alt={file.name}
                      />
                      <span>{t("Expand image")} ↗</span>
                    </Button>
                    <figcaption>
                      <span>{file.name}</span>
                      <a
                        href={
                          artifactFileUrl(artifact.project_id, artifact.id, file.id) + "?download=1"
                        }
                        download
                      >
                        {t("Download")}
                      </a>
                      <Button
                        type="submit"
                        className="text-button"
                        disabled={pending}
                        onClick={() => setRemoveFile(file.id)}
                      >
                        {t("Remove")}
                      </Button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            {artifact.kind === "markdown" && artifact.markdown && artifact.files[0] && (
              <>
                <div className="artifact-file-heading">
                  <span>{artifact.files[0]?.name}</span>
                  <a
                    className="button secondary"
                    href={
                      artifactFileUrl(artifact.project_id, artifact.id, artifact.files[0].id) +
                      "?download=1"
                    }
                    download
                  >
                    {t("Download Markdown")}
                  </a>
                </div>
                <MarkdownReader
                  content={artifact.markdown}
                  label={t("Markdown reader")}
                  externalImageLabel={t("External image")}
                  completedLabel={t("Completed item")}
                  incompleteLabel={t("Incomplete item")}
                />
              </>
            )}
            {!artifact.files.length && (
              <div className="artifact-empty-output">
                <span aria-hidden="true">{artifact.kind === "image" ? "▧" : "#"}</span>
                <p>
                  {t("No output attached yet. Keep working and upload a draft when you have one.")}
                </p>
              </div>
            )}
            <div className="artifact-upload">
              <label htmlFor="artifact-upload">
                {t(artifact.kind === "image" ? "Upload images" : "Upload / replace Markdown")}
              </label>
              <Input
                ref={upload}
                id="artifact-upload"
                type="file"
                disabled={pending}
                multiple={artifact.kind === "image"}
                accept={
                  artifact.kind === "image"
                    ? "image/png,image/jpeg,image/webp,image/gif"
                    : ".md,.markdown,text/markdown"
                }
                onChange={uploadFiles}
              />
              <small>
                {t(
                  artifact.kind === "image"
                    ? "Up to six PNG, JPEG, WebP, or GIF images, 2 MB each."
                    : "UTF-8 .md or .markdown, up to 500 KB. A new upload replaces the previous document.",
                )}
              </small>
            </div>
            {removeFile && (
              <div className="artifact-remove-confirm">
                <p>
                  {t(
                    "Remove this file? Set the artifact to In progress before removing its final output.",
                  )}
                </p>
                <Button
                  type="submit"
                  disabled={pending}
                  onClick={() => run("remove-file", removeFile)}
                >
                  {t("Confirm removal")}
                </Button>
                <Button
                  type="submit"
                  className="button secondary"
                  disabled={pending}
                  onClick={() => setRemoveFile(undefined)}
                >
                  {t("Cancel")}
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
      <aside className="artifact-details-column">
        <Panel className="">
          <h2>{t("Details")}</h2>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              run("metadata", { ...draft, stageId: draft.stageId || null });
            }}
          >
            <label>
              {t("Artifact name")}
              <Input
                value={draft.name}
                required
                maxLength={160}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              {t("Description")}
              <Textarea
                value={draft.description}
                maxLength={4000}
                rows={3}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            {!!stages.length && (
              <label>
                {t("Phase (optional)")}
                <Select
                  aria-label={t("Phase (optional)")}
                  value={draft.stageId}
                  onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
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
              <label>
                {t("GitHub link")}
                <Input
                  type="url"
                  value={draft.githubUrl}
                  placeholder="https://github.com/…"
                  required={draft.status === "ready"}
                  onChange={(e) => setDraft({ ...draft, githubUrl: e.target.value })}
                />
              </label>
            )}
            <label>
              {t("Artifact status")}
              <Select
                aria-label={t("Artifact status")}
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as "ready" | "in_progress" })
                }
              >
                <option value="in_progress">{t("In progress")}</option>
                <option value="ready">{t("Ready to use")}</option>
              </Select>
            </label>
            <p className="muted">
              {t("Ready requires the correct file or GitHub link. To-dos stay independent.")}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? t("Saving…") : t("Save details")}
            </Button>
          </form>
        </Panel>
        <Panel className="artifact-tasks" aria-label={t("Artifact to-do list")}>
          <div className="artifact-library-heading">
            <h2>{t("To-do")}</h2>
            <small>
              {artifact.tasks.filter((task) => task.status === "done").length}/
              {artifact.tasks.length}
            </small>
          </div>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              run("tasks", tasks);
            }}
          >
            {tasks.map((task, index) => (
              <div key={task.id} className="artifact-task">
                <Input
                  required
                  maxLength={300}
                  aria-label={`${t("Task title")} ${index + 1}`}
                  value={task.title}
                  onChange={(e) => patchTask(task.id, { title: e.target.value })}
                />
                <div>
                  <Select
                    aria-label={`${t("Task status")} ${index + 1}`}
                    value={task.status}
                    onChange={(e) =>
                      patchTask(task.id, { status: e.target.value as ArtifactTask["status"] })
                    }
                  >
                    <option value="ready">{t("Ready")}</option>
                    <option value="in_progress">{t("In progress")}</option>
                    <option value="done">{t("Done")}</option>
                  </Select>
                  <Button
                    type="button"
                    className="text-button"
                    aria-label={`${t("Remove task")} ${index + 1}`}
                    onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              </div>
            ))}
            {!tasks.length && <p className="muted">{t("No tasks yet.")}</p>}
            <Button
              type="button"
              className="button secondary"
              disabled={tasks.length >= 100 || pending}
              onClick={() =>
                setTasks((items) => [
                  ...items,
                  { id: crypto.randomUUID(), title: "", status: "ready" },
                ])
              }
            >
              {t("Add task")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("Save tasks")}
            </Button>
          </form>
        </Panel>
        <div className="artifact-feedback" aria-live="polite">
          {dirty && <p className="muted">{t("Unsaved changes")}</p>}
          {notice && <p className="message success">{t(notice)}</p>}
          {error && (
            <p className="message error" role="alert">
              {t(error)}
            </p>
          )}
          {current && (
            <div className="panel">
              <p>
                {t("Latest version:")} {current.name}
              </p>
              <Button
                type="submit"
                disabled={pending}
                onClick={() => {
                  setArtifact(current);
                  setCurrent(undefined);
                  setError("");
                }}
              >
                {t("Use latest version and keep my drafts")}
              </Button>
            </div>
          )}
        </div>
        <details className="artifact-danger">
          <summary>{t("Delete artifact")}</summary>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              run("delete", confirmation);
            }}
          >
            <p>
              {t(
                "Permanently delete this artifact, its files, and its to-do list. Enter its exact name to confirm.",
              )}
            </p>
            <label>
              {t("Confirm artifact name")}
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={pending || confirmation !== artifact.name}>
              {t("Permanently delete artifact")}
            </Button>
          </form>
        </details>
      </aside>
      <Dialog
        open={image !== null}
        onClose={closeImage}
        className="artifact-lightbox"
        label={t("Expanded image")}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && images.length > 1) {
            e.preventDefault();
            setImage((index) => (index! + 1) % images.length);
          }
          if (e.key === "ArrowLeft" && images.length > 1) {
            e.preventDefault();
            setImage((index) => (index! + images.length - 1) % images.length);
          }
        }}
      >
        {viewing && (
          <>
            <div className="lightbox-toolbar">
              <span>
                {viewing.name} · {image! + 1}/{images.length}
              </span>
              <a
                href={artifactFileUrl(artifact.project_id, artifact.id, viewing.id) + "?download=1"}
                download
              >
                {t("Download")}
              </a>
              <Button type="submit" autoFocus className="button secondary" onClick={closeImage}>
                {t("Close")}
              </Button>
            </div>
            <img
              decoding="async"
              src={artifactFileUrl(artifact.project_id, artifact.id, viewing.id)}
              alt={viewing.name}
            />
            {images.length > 1 && (
              <div className="lightbox-navigation">
                <Button
                  type="submit"
                  className="button secondary"
                  onClick={() => setImage((index) => (index! + images.length - 1) % images.length)}
                >
                  {t("Previous image")}
                </Button>
                <Button
                  type="submit"
                  className="button secondary"
                  onClick={() => setImage((index) => (index! + 1) % images.length)}
                >
                  {t("Next image")}
                </Button>
              </div>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}
