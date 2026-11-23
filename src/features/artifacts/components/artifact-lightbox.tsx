"use client";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { useT } from "@/shared/i18n/provider";
import type { Dispatch, SetStateAction } from "react";
import type { ArtifactFile } from "../model";

export function ArtifactLightbox({
  image,
  closeImage,
  images,
  setImage,
  fileUrl,
}: {
  image: number | null;
  closeImage: () => void;
  images: ArtifactFile[];
  setImage: Dispatch<SetStateAction<number | null>>;
  fileUrl: (fileId: string) => string;
}) {
  const t = useT();
  const viewing = image === null ? undefined : images[image];
  return (
    <Dialog
      size="fullscreen"
      open={image !== null}
      onClose={closeImage}
      className={
        "artifact-lightbox backdrop:[background:var(--theme-overlay,#06100de8)] fixed inset-0 m-0 p-5 w-[100vw] h-[100dvh] max-w-none max-h-[none] border-0 bg-[var(--theme-overlay,#07110ff7)] text-ink [&[open]]:flex [&[open]]:flex-col [&[open]]:gap-4 [&_>_img]:block [&_>_img]:min-h-0 [&_>_img]:min-w-0 [&_>_img]:[object-fit:contain] [&_>_img]:flex-1 [&_>_img]:w-full max-[700px]:p-3"
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
            <span className={"mr-auto wrap-anywhere max-[700px]:[flex-basis:100%]"}>
              {viewing.name} · {image! + 1}/{images.length}
            </span>
            <a
              href={fileUrl(viewing.id) + "?download=1"}
              download
              className={
                "text-inherit no-underline focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-lime"
              }
            >
              {t("Download")}
            </a>
            <Button
              type="button"
              autoFocus
              className={"button secondary"}
              onClick={closeImage}
              variant="secondary"
            >
              {t("Close")}
            </Button>
          </div>
          <img decoding="async" src={fileUrl(viewing.id)} alt={viewing.name} />
          {images.length > 1 && (
            <div className={"lightbox-navigation flex justify-center gap-3"}>
              <Button
                type="button"
                className={"button secondary"}
                onClick={() => setImage((index) => (index! + images.length - 1) % images.length)}
                variant="secondary"
              >
                {t("Previous image")}
              </Button>
              <Button
                type="button"
                className={"button secondary"}
                onClick={() => setImage((index) => (index! + 1) % images.length)}
                variant="secondary"
              >
                {t("Next image")}
              </Button>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
