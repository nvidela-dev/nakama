"use client";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
import Link from "next/link";
import type { FlowStage } from "@/features/guidance/model/flows";
import type { FlowNode } from "../model/flows";

export function JourneyBreadcrumb({
  base,
  activeNode,
  href,
  activeStage,
}: {
  base: string;
  activeNode: FlowNode | undefined;
  href: (stage?: string, node?: string) => string;
  activeStage: FlowStage;
}) {
  const t = useT();
  return (
    <nav
      className={
        'journey-breadcrumb items-center max-[700px]:gap-3.5 max-[700px]:text-[12px] flex flex-wrap text-muted gap-2.5 my-6.5 lg:compact:my-3.5 [&_[aria-current="page"]]:inline-flex [&_[aria-current="page"]]:items-center [&_[aria-current="page"]]:gap-1.5 [&_[aria-current="page"]]:py-1.5 [&_[aria-current="page"]]:px-2 [&_[aria-current="page"]]:min-h-8 [&_[aria-current="page"]]:rounded-[6px] [&_[aria-current="page"]]:leading-[1.4] [&_[aria-current="page"]]:wrap-anywhere [&_[aria-current="page"]]:text-ink [&_[aria-current="page"]]:bg-[var(--theme-surface,#22372f)] [&_[aria-current="page"]]:border [&_[aria-current="page"]]:border-line [&_[aria-current="page"]]:font-semibold [&_svg]:shrink-0 mt-0 mx-0 mb-1.5 text-[11px] lg:compact:mb-2'
      }
      aria-label={t("Project path")}
    >
      <ol className={"flex items-center flex-wrap gap-1 list-none m-0 p-0"}>
        <li className={"min-w-0"}>
          <Link
            href={base}
            className={
              "no-underline underline-offset-4 inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 hover:bg-[var(--theme-surface,#22372f)] hover:text-lime"
            }
          >
            <Icon name="overview" />
            {t("All stages")}
          </Link>
        </li>
        <li
          className={"breadcrumb-separator min-w-0 text-muted opacity-60 px-0.5 text-[18px]"}
          aria-hidden="true"
        >
          <Icon name="chevronRight" />
        </li>
        <li className={"min-w-0"}>
          {activeNode ? (
            <Link
              href={href(activeStage.id)}
              className={
                "no-underline underline-offset-4 inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 hover:bg-[var(--theme-surface,#22372f)] hover:text-lime"
              }
            >
              {t(activeStage.name)}
            </Link>
          ) : (
            <span aria-current="page">{t(activeStage.name)}</span>
          )}
        </li>
        {activeNode && (
          <>
            <li
              className={"breadcrumb-separator min-w-0 text-muted opacity-60 px-0.5 text-[18px]"}
              aria-hidden="true"
            >
              <Icon name="chevronRight" />
            </li>
            <li className={"min-w-0"}>
              <span aria-current="page">{t(activeNode.label)}</span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
