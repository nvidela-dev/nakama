"use client";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
import Link from "next/link";
import type { FlowStage } from "@/features/guidance/model/flows";
import type { Answer } from "../model/types";
import { levels, symbols } from "../model/node-presentation";

export function StageNodeTree({
  activeStage,
  answerById,
  href,
}: {
  activeStage: FlowStage;
  answerById: ReadonlyMap<string, Answer>;
  href: (stage?: string, node?: string) => string;
}) {
  const t = useT();
  return (
    <div className={"node-tree flex flex-col my-4 mx-0 lg:compact:my-3"}>
      {levels(activeStage).map((row, i) => (
        <div key={i} className="tree-level min-w-0">
          {i > 0 && (
            <div
              className="tree-connector flex h-12 items-center justify-center text-lime"
              aria-hidden="true"
            >
              <Icon name="arrowDown" size={48} strokeWidth={3} />
            </div>
          )}
          <div className="tree-row grid grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] gap-3 max-[700px]:grid-cols-[minmax(0,_1fr)]">
            {row.map((node) => {
              const answer = answerById.get(node.id);
              return (
                <Link
                  key={node.id}
                  href={href(activeStage.id, node.id)}
                  className={[
                    `question-node ${answer?.status ?? "unanswered"}`,
                    "grid gap-[6px_12px] border border-line rounded-[8px] py-4 px-4 bg-[var(--theme-surface,#1c3028)] wrap-anywhere grid-cols-[minmax(0,_1fr)_auto] content-center items-center min-h-22 [&.answered]:[border-color:var(--theme-border,#738d50)] [&.blocked]:[border-color:var(--theme-border,#b59769)] hover:[background:var(--theme-surface,#284332)] max-[700px]:p-3.5",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={
                      "node-state [text-transform:capitalize] text-lime col-start-2 row-start-1 text-[11px] text-right"
                    }
                  >
                    <Icon
                      name={symbols[answer?.status ?? "unanswered"] ?? "unanswered"}
                      size={12}
                    />{" "}
                    {t(answer?.status ?? "unanswered")}
                    {answer?.needs_review ? t(" · revisit") : ""}
                  </span>
                  <strong className={"text-[13px] leading-[1.4] col-start-1 row-start-1"}>
                    {t(node.label)}
                  </strong>
                  <small
                    className={
                      "node-type text-muted col-start-2 row-start-2 text-[11px] text-right"
                    }
                  >
                    {t(node.kind)}
                  </small>
                  {node.after.length > 0 && (
                    <small
                      className={
                        "node-after max-[700px]:hidden text-muted text-[11px] border-t-line col-start-1 row-start-2 border-0 p-0 leading-[1.4]"
                      }
                    >
                      {t("After:")}{" "}
                      {node.after
                        .map((id) => t(activeStage.nodes.find((n) => n.id === id)?.label ?? ""))
                        .join(" + ")}
                    </small>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
