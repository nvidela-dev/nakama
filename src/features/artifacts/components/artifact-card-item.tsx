"use client";
import { artifactStatusLabels } from "@/features/artifacts/model";
import dynamic from "next/dynamic";
import { Icon } from "@/shared/ui/icon";
import Link from "next/link";
import {
  artifactKinds,
  artifactUrl,
  artifactFileUrl,
  type ArtifactCard,
} from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";
const ShirtCover = dynamic(() => import("../shirts/cover").then((m) => m.ShirtCover));

export function ArtifactCardItem({
  card,
  showProject,
}: {
  card: ArtifactCard;
  showProject: boolean;
}) {
  const t = useT();
  return (
    <Link
      href={artifactUrl(card.project_id, card.id)}
      className="artifact-card flex items-center gap-3 min-w-0 p-2 border border-line rounded-md bg-panel hover:border-lime focus-visible:outline-2 focus-visible:outline-lime"
    >
      <div className="artifact-cover grid size-16 shrink-0 place-items-center overflow-hidden rounded bg-bg text-muted">
        {card.shirt_poster ? (
          <img
            loading="lazy"
            decoding="async"
            src={card.shirt_poster}
            alt={card.name}
            className="size-full object-contain"
          />
        ) : card.shirt_cover ? (
          <ShirtCover key={card.id + ":" + card.revision} card={card} />
        ) : card.cover_id ? (
          <img
            loading="lazy"
            decoding="async"
            src={artifactFileUrl(card.project_id, card.id, card.cover_id)}
            alt={card.name}
            className="size-full object-contain"
          />
        ) : (
          <span title={t("No preview")}>
            <Icon
              name={
                card.kind === "markdown" ? "markdown" : card.kind === "software" ? "code" : "image"
              }
              size={21}
            />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="font-semibold text-sm leading-tight line-clamp-2 wrap-anywhere"
          title={card.name}
        >
          {card.name}
        </h3>
        <div className="text-xs text-muted truncate">
          {showProject && card.project_name + " · "}
          {t(card.collection ? "Shirt design" : artifactKinds[card.kind])}
        </div>
        <small className="artifact-status block truncate text-xs text-muted">
          {t(artifactStatusLabels[card.status])}
          {card.task_count > 0 &&
            ` · ${card.done_task_count}/${card.task_count} ${t("tasks done")}`}
          {card.file_count > 0 && ` · ${card.file_count} ${t("files")}`}
        </small>
      </div>
    </Link>
  );
}
