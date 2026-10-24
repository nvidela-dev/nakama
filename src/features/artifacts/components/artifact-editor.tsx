"use client";
import { Icon } from "@/shared/ui/icon";
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
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";
function MarkdownLoading() {
  const t = useT();
  return <LoadingState label={t("Loading…")} lines={3} />;
}
const MarkdownReader = dynamic(
  () => import("@/shared/ui/markdown-reader").then((module) => module.MarkdownReader),
  { loading: MarkdownLoading },
);

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
    <div
      className={
        "artifact-detail grid grid-cols-[minmax(0,_1fr)_340px] gap-6 items-start max-[1000px]:grid-cols-[minmax(0,_1fr)]"
      }
    >
      <Panel className={"artifact-output min-w-[0]"} aria-label={t("Artifact output")}>
        <div
          className={
            "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start max-[700px]:[&_>_button]:w-full"
          }
        >
          <div>
            <span
              className={
                "eyebrow text-[10px] tracking-[2px] text-lime font-bold block [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] mb-2"
              }
            >
              {t(artifactKinds[artifact.kind])}
            </span>
            <h2
              className={
                "font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 wrap-anywhere m-0"
              }
            >
              {artifact.name}
            </h2>
          </div>
          <span
            className={[
              `artifact-status ${artifact.status}`,
              "inline-block shrink-0 py-1 px-2 border border-line rounded-[20px] text-[11px] text-muted [&.ready]:bg-[#304630] [&.ready]:text-lime [&.ready]:[border-color:#5c7544]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {t(artifact.status === "ready" ? "Ready to use" : "In progress")}
          </span>
        </div>
        {artifact.kind === "software" ? (
          <div
            className={
              "software-output text-center py-11.25 px-5 bg-[#101c1b80] [border:1px_dashed_var(--color-line)] rounded-[8px]"
            }
          >
            <span className={"software-symbol block text-lime text-[48px]"} aria-hidden="true">
              <Icon name="code" size={32} />
            </span>
            {artifact.github_url ? (
              <>
                <h3
                  className={
                    "mb-[1em] mt-0 font-mono tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2"
                  }
                >
                  {t("GitHub repository / release")}
                </h3>
                <a
                  className={
                    "button [color:inherit] no-underline focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:#e9ffc1] hover:[transform:translateY(-1px)]"
                  }
                  href={artifact.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Open on GitHub")} <Icon name="arrowUpRight" />
                </a>
                <p
                  className={
                    "preserve-lines mb-[1em] mt-[0] whitespace-pre-wrap text-[13px] text-muted wrap-anywhere"
                  }
                >
                  {artifact.github_url}
                </p>
              </>
            ) : (
              <p className={"mb-[1em] mt-[0] text-[13px] text-muted wrap-anywhere"}>
                {t("Add a GitHub link in Details to connect this software artifact.")}
              </p>
            )}
          </div>
        ) : (
          <>
            {artifact.kind === "image" && (
              <div
                className={
                  "artifact-images grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_240px),_1fr))] gap-4 max-[700px]:grid-cols-[1fr]"
                }
              >
                {images.map((file, index) => (
                  <figure key={file.id} className={"min-w-[0] m-0"}>
                    <Button
                      type="submit"
                      className={
                        "artifact-image-button w-full flex flex-col p-0 gap-0 border border-line overflow-hidden bg-bg text-ink hover:bg-bg hover:border-lime"
                      }
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
                        className={"block w-full h-65 [object-fit:contain]"}
                      />
                      <span className={"p-2 text-[11px]"}>
                        {t("Expand image")} <Icon name="arrowUpRight" />
                      </span>
                    </Button>
                    <figcaption
                      className={
                        "flex flex-wrap items-center gap-3 [padding-block:8px] text-[11px]"
                      }
                    >
                      <span className={"[flex:1_1_100%] wrap-anywhere text-muted"}>
                        {file.name}
                      </span>
                      <a
                        href={
                          artifactFileUrl(artifact.project_id, artifact.id, file.id) + "?download=1"
                        }
                        download
                        className={
                          "[color:inherit] no-underline focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] text-lime"
                        }
                      >
                        {t("Download")}
                      </a>
                      <Button
                        type="submit"
                        className={
                          "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:#ffffff0a]"
                        }
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
                <div
                  className={
                    "artifact-file-heading flex items-center justify-between gap-[12px] flex-wrap mb-[22px] text-[12px] wrap-anywhere"
                  }
                >
                  <span>{artifact.files[0]?.name}</span>
                  <a
                    className={
                      "button secondary [color:inherit] no-underline focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                    }
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
              <div
                className={
                  "artifact-empty-output text-center py-11.25 px-5 bg-[#101c1b80] [border:1px_dashed_var(--color-line)] rounded-[8px]"
                }
              >
                <span aria-hidden="true" className={"block text-lime text-[48px]"}>
                  <Icon name={artifact.kind === "image" ? "image" : "markdown"} />
                </span>
                <p className={"mb-[1em] mt-[0] text-[13px] text-muted wrap-anywhere"}>
                  {t("No output attached yet. Keep working and upload a draft when you have one.")}
                </p>
              </div>
            )}
            <div
              className={
                "artifact-upload mt-[24px] grid gap-[8px] p-4 border border-line rounded-[8px]"
              }
            >
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
                className={"max-w-[100%] text-[12px]"}
              />
              <small className={"text-[11px] text-muted"}>
                {t(
                  artifact.kind === "image"
                    ? "Up to six PNG, JPEG, WebP, or GIF images, 2 MB each."
                    : "UTF-8 .md or .markdown, up to 500 KB. A new upload replaces the previous document.",
                )}
              </small>
            </div>
            {removeFile && (
              <div
                className={"artifact-remove-confirm border border-pink p-3 mt-[12px] text-[12px]"}
              >
                <p className={"mb-[1em] mt-[0]"}>
                  {t(
                    "Remove this file? Set the artifact to In progress before removing its final output.",
                  )}
                </p>
                <Button
                  type="submit"
                  disabled={pending}
                  onClick={() => run("remove-file", removeFile)}
                  className={"m-1"}
                >
                  {t("Confirm removal")}
                </Button>
                <Button
                  type="submit"
                  className={
                    "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] m-1"
                  }
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
      <aside
        className={
          "artifact-details-column min-w-0 grid gap-4.5 max-[1000px]:grid-cols-[repeat(auto-fit,_minmax(min(100%,_280px),_1fr))]"
        }
      >
        <Panel className="">
          <h2
            className={
              "mb-[0.83em] font-mono tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3 mt-0 text-[17px]"
            }
          >
            {t("Details")}
          </h2>
          <form
            className={
              "form-stack flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted lg:compact:gap-1.75"
            }
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
                className={
                  "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
            </label>
            <label className={"text-[13px] text-ink"}>
              {t("Description")}
              <Textarea
                value={draft.description}
                maxLength={4000}
                rows={3}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className={
                  "min-h-30 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
            </label>
            {!!stages.length && (
              <label className={"text-[13px] text-ink"}>
                {t("Phase (optional)")}
                <Select
                  aria-label={t("Phase (optional)")}
                  value={draft.stageId}
                  onChange={(e) => setDraft({ ...draft, stageId: e.target.value })}
                  className={
                    "bg-[#101c1b] text-ink border border-[#4b6056] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 [&:focus-visible]:[outline:3px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:4px]"
                  }
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
                  className={
                    "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
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
                className={
                  "bg-[#101c1b] text-ink border border-[#4b6056] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 [&:focus-visible]:[outline:3px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:4px]"
                }
              >
                <option value="in_progress">{t("In progress")}</option>
                <option value="ready">{t("Ready to use")}</option>
              </Select>
            </label>
            <p className={"muted mb-[1em] mt-[0] text-muted text-[11px]"}>
              {t("Ready requires the correct file or GitHub link. To-dos stay independent.")}
            </p>
            <Button type="submit" disabled={pending} className={"mt-2 lg:compact:mt-1"}>
              {pending ? t("Saving…") : t("Save details")}
            </Button>
          </form>
        </Panel>
        <Panel className={"artifact-tasks"} aria-label={t("Artifact to-do list")}>
          <div
            className={
              "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start max-[700px]:[&_>_button]:w-full"
            }
          >
            <h2
              className={
                "font-mono tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 text-[17px] m-0"
              }
            >
              {t("To-do")}
            </h2>
            <small>
              {artifact.tasks.filter((task) => task.status === "done").length}/
              {artifact.tasks.length}
            </small>
          </div>
          <form
            className={
              "form-stack flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px]"
            }
            onSubmit={(e) => {
              e.preventDefault();
              run("tasks", tasks);
            }}
          >
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={"artifact-task grid gap-[7px] pb-[12px] border-b border-b-line"}
              >
                <Input
                  required
                  maxLength={300}
                  aria-label={`${t("Task title")} ${index + 1}`}
                  value={task.title}
                  onChange={(e) => patchTask(task.id, { title: e.target.value })}
                  className={
                    "min-w-0 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
                <div className={"flex items-center gap-[10px]"}>
                  <Select
                    aria-label={`${t("Task status")} ${index + 1}`}
                    value={task.status}
                    onChange={(e) =>
                      patchTask(task.id, { status: e.target.value as ArtifactTask["status"] })
                    }
                    className={
                      "bg-[#101c1b] text-ink border border-[#4b6056] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 min-w-0 [flex:1] [&:focus-visible]:[outline:3px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:4px]"
                    }
                  >
                    <option value="ready">{t("Ready")}</option>
                    <option value="in_progress">{t("In progress")}</option>
                    <option value="done">{t("Done")}</option>
                  </Select>
                  <Button
                    type="button"
                    className={
                      "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:#ffffff0a] mt-2 lg:compact:mt-1"
                    }
                    aria-label={`${t("Remove task")} ${index + 1}`}
                    onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              </div>
            ))}
            {!tasks.length && (
              <p className={"muted mb-[1em] mt-[0] text-muted text-[11px]"}>{t("No tasks yet.")}</p>
            )}
            <Button
              type="button"
              className={
                "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] mt-2 lg:compact:mt-1"
              }
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
            <Button type="submit" disabled={pending} className={"mt-2 lg:compact:mt-1"}>
              {t("Save tasks")}
            </Button>
          </form>
        </Panel>
        <div
          className={"artifact-feedback min-w-0 max-[1000px]:[grid-column:1/-1]"}
          aria-live="polite"
        >
          {dirty && (
            <p className={"muted mb-[1em] mt-[0] text-muted text-[11px]"}>{t("Unsaved changes")}</p>
          )}
          {notice && (
            <p
              className={
                "message success text-[13px]! bg-[#30422d] rounded-[8px] p-3 text-ink! m-0 [&.error]:bg-[#4e3030] [&.error]:[color:#ffe4dd]!"
              }
            >
              {t(notice)}
            </p>
          )}
          {error && (
            <p
              className={
                "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[#4e3030] [color:#ffe4dd]!"
              }
              role="alert"
            >
              {t(error)}
            </p>
          )}
          {current && (
            <div
              className={
                "panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5"
              }
            >
              <p className={"mb-[1em] mt-[0] text-muted"}>
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
        <details
          className={
            "artifact-danger border-t border-t-line pt-3.5 text-[12px] max-[1000px]:[grid-column:1/-1]"
          }
        >
          <summary
            className={
              "focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] cursor-pointer text-pink"
            }
          >
            {t("Delete artifact")}
          </summary>
          <form
            className={
              "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5 pt-3"
            }
            onSubmit={(e) => {
              e.preventDefault();
              run("delete", confirmation);
            }}
          >
            <p className={"mb-[1em] mt-[0]"}>
              {t(
                "Permanently delete this artifact, its files, and its to-do list. Enter its exact name to confirm.",
              )}
            </p>
            <label className={"text-[13px] text-ink"}>
              {t("Confirm artifact name")}
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                className={
                  "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                }
              />
            </label>
            <Button
              type="submit"
              disabled={pending || confirmation !== artifact.name}
              className={"mt-2 lg:compact:mt-1"}
            >
              {t("Permanently delete artifact")}
            </Button>
          </form>
        </details>
      </aside>
      <Dialog
        open={image !== null}
        onClose={closeImage}
        className={
          "artifact-lightbox backdrop:[background:#06100de8] fixed [inset:0] m-0 p-5 w-[100vw] h-[100dvh] max-w-[none] max-h-[none] border-0 bg-[#07110ff7] text-ink [&[open]]:flex [&[open]]:flex-col [&[open]]:gap-4 [&_>_img]:block [&_>_img]:min-h-0 [&_>_img]:min-w-0 [&_>_img]:[object-fit:contain] [&_>_img]:[flex:1] [&_>_img]:w-full max-[700px]:p-3"
        }
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
            <div
              className={
                "lightbox-toolbar flex items-center justify-end gap-4 text-[12px] max-[700px]:gap-2 max-[700px]:flex-wrap"
              }
            >
              <span className={"mr-[auto] wrap-anywhere max-[700px]:[flex-basis:100%]"}>
                {viewing.name} · {image! + 1}/{images.length}
              </span>
              <a
                href={artifactFileUrl(artifact.project_id, artifact.id, viewing.id) + "?download=1"}
                download
                className={
                  "[color:inherit] no-underline focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] text-lime"
                }
              >
                {t("Download")}
              </a>
              <Button
                type="submit"
                autoFocus
                className={
                  "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                }
                onClick={closeImage}
              >
                {t("Close")}
              </Button>
            </div>
            <img
              decoding="async"
              src={artifactFileUrl(artifact.project_id, artifact.id, viewing.id)}
              alt={viewing.name}
            />
            {images.length > 1 && (
              <div className={"lightbox-navigation flex justify-center gap-[12px]"}>
                <Button
                  type="submit"
                  className={
                    "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                  }
                  onClick={() => setImage((index) => (index! + images.length - 1) % images.length)}
                >
                  {t("Previous image")}
                </Button>
                <Button
                  type="submit"
                  className={
                    "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                  }
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
