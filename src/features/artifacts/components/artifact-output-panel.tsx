"use client";
import { ButtonLink } from "@/shared/ui/button";
import { artifactStatusLabels } from "../model";
import { Eyebrow } from "@/shared/ui/workspace-layout";
import { InlineConfirm } from "@/shared/ui/form-patterns";

import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Input } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { artifactKinds, artifactFileUrl, type ArtifactDetail } from "@/features/artifacts/model";
import dynamic from "next/dynamic";
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

export function ArtifactOutputPanel({
  artifact,
  images,
  pending,
  upload,
  uploadFiles,
  removeFile,
  setRemoveFile,
  setImage,
  onRemove,
}: {
  artifact: ArtifactDetail;
  images: ArtifactDetail["files"];
  pending: boolean;
  upload: React.RefObject<HTMLInputElement | null>;
  uploadFiles: (files: File[]) => void;
  removeFile: string | undefined;
  setRemoveFile: (id: string | undefined) => void;
  setImage: (index: number) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT();
  return (
    <Panel className={"artifact-output min-w-0"} aria-label={t("Artifact output")}>
      <div
        className={
          "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start max-[700px]:[&_>_button]:w-full"
        }
      >
        <div>
          <Eyebrow className="mb-3">{t(artifactKinds[artifact.kind])}</Eyebrow>
          <h2
            className={
              "font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 wrap-anywhere m-0"
            }
          >
            {artifact.name}
          </h2>
        </div>
        <span
          className={[
            `artifact-status ${artifact.status}`,
            "inline-block shrink-0 py-1 px-2 border border-line rounded-[20px] text-[11px] text-muted [&.ready]:bg-[var(--theme-surface,#304630)] [&.ready]:text-lime [&.ready]:[border-color:var(--theme-border,#5c7544)]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {t(artifactStatusLabels[artifact.status])}
        </span>
      </div>
      {artifact.kind === "software" ? (
        <div
          className={
            "software-output text-center py-11.25 px-5 bg-[var(--theme-overlay,#101c1b80)] [border:1px_dashed_var(--color-line)] rounded-[8px]"
          }
        >
          <span className={"software-symbol block text-lime text-[48px]"} aria-hidden="true">
            <Icon name="code" size={32} />
          </span>
          {artifact.github_url ? (
            <>
              <h3
                className={
                  "mb-[1em] mt-0 font-sans tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2"
                }
              >
                {t("GitHub repository / release")}
              </h3>
              <a
                className={
                  "button text-inherit no-underline focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:var(--theme-accent-hover,#e9ffc1)] hover:[transform:translateY(-1px)]"
                }
                href={artifact.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Open on GitHub")} <Icon name="arrowUpRight" />
              </a>
              <p
                className={
                  "preserve-lines mb-[1em] mt-0 whitespace-pre-wrap text-[13px] text-muted wrap-anywhere"
                }
              >
                {artifact.github_url}
              </p>
            </>
          ) : (
            <p className={"mb-[1em] mt-0 text-[13px] text-muted wrap-anywhere"}>
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
                <figure key={file.id} className={"min-w-0 m-0"}>
                  <Button
                    type="button"
                    className={"artifact-image-button w-full flex flex-col gap-0 overflow-hidden"}
                    aria-label={`${t("Expand image")}: ${file.name}`}
                    onClick={() => {
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
                  <figcaption className={"flex flex-wrap items-center gap-3 py-2 text-[11px]"}>
                    <span className={"[flex:1_1_100%] wrap-anywhere text-muted"}>{file.name}</span>
                    <a
                      href={
                        artifactFileUrl(artifact.project_id, artifact.id, file.id) + "?download=1"
                      }
                      download
                      className={
                        "text-inherit no-underline focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-lime"
                      }
                    >
                      {t("Download")}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      className={"min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)]"}
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
                  "artifact-file-heading flex items-center justify-between gap-3 flex-wrap mb-5.5 text-[12px] wrap-anywhere"
                }
              >
                <span>{artifact.files[0]?.name}</span>
                <ButtonLink
                  variant="secondary"

                  href={
                    artifactFileUrl(artifact.project_id, artifact.id, artifact.files[0].id) +
                    "?download=1"
                  }
                  download
                >
                  {t("Download Markdown")}
                </ButtonLink>
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
                "artifact-empty-output text-center py-11.25 px-5 bg-[var(--theme-overlay,#101c1b80)] [border:1px_dashed_var(--color-line)] rounded-[8px]"
              }
            >
              <span aria-hidden="true" className={"block text-lime text-[48px]"}>
                <Icon name={artifact.kind === "image" ? "image" : "markdown"} />
              </span>
              <p className={"mb-[1em] mt-0 text-[13px] text-muted wrap-anywhere"}>
                {t("No output attached yet. Keep working and upload a draft when you have one.")}
              </p>
            </div>
          )}
          <div className={"artifact-upload mt-6 grid gap-2 p-4 border border-line rounded-[8px]"}>
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
              onChange={(event) => uploadFiles(Array.from(event.target.files ?? []))}
              className={"max-w-full"}
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
            <div className={"artifact-remove-confirm border border-pink p-3 mt-3 text-[12px]"}>
              <p className={"mb-[1em] mt-0"}>
                {t(
                  "Remove this file? Set the artifact to In progress before removing its final output.",
                )}
              </p>
              <InlineConfirm
                confirmLabel={t("Confirm removal")}
                cancelLabel={t("Cancel")}
                onConfirm={() => onRemove(removeFile)}
                onCancel={() => setRemoveFile(undefined)}
                pending={pending}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
