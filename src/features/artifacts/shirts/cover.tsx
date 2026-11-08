"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
import { artifactFileUrl, type ArtifactCard } from "../model";
import { loadArt, type ArtImages } from "./print";
import type { mountGarment } from "./garment";
import { emptyLayout } from "./design";

let camera: ReturnType<typeof mountGarment> | null = null,
  release: ReturnType<typeof setTimeout> | undefined;
// Previously saved designs have no stored photo. Photograph visible cards with one temporary context.
async function photograph(card: ArtifactCard, images: ArtImages, active: () => boolean) {
  const { mountGarment } = await import("./garment");
  const cover = card.shirt_cover;
  if (!active() || !cover) return;
  clearTimeout(release);
  camera ??= mountGarment(document.createElement("div"));
  try {
    camera.paint(
      { collection: card.collection ?? "", layout: { ...emptyLayout, ...cover } },
      images,
    );
    camera.view(
      cover.layers.find((l) => l.zone === "chest")?.zone ?? cover.layers[0]?.zone ?? "chest",
    );
    return camera.snapshot();
  } finally {
    release = setTimeout(() => {
      camera?.dispose();
      camera = null;
    }, 500);
  }
}
export function ShirtCover({ card }: { card: ArtifactCard }) {
  const t = useT(),
    host = useRef<HTMLDivElement>(null),
    [photo, setPhoto] = useState<string>();
  useEffect(() => {
    let active = true;
    if (!host.current || !card.shirt_cover?.layers.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      const ids = new Set(card.shirt_cover!.layers.map((l) => l.fileId));
      Promise.all(
        Array.from(
          ids,
          async (id) => [id, await loadArt(artifactFileUrl(card.project_id, card.id, id))] as const,
        ),
      )
        .then((files) => photograph(card, new Map(files), () => active))
        .then((url) => {
          if (active && url) setPhoto(url);
        })
        .catch(() => {});
    });
    observer.observe(host.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [card]);
  return (
    <div ref={host} className="w-full h-full grid place-items-center">
      {photo ? (
        <Image
          src={photo}
          unoptimized
          alt={card.name}
          width={80}
          height={80}
          className="size-full object-contain"
        />
      ) : (
        <span title={t("No preview")}>
          <Icon name="shirt" size={22} />
        </span>
      )}
    </div>
  );
}
