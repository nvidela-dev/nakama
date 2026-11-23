"use client";
import { useEffect, useId, useRef, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/controls";
import { Icon } from "@/shared/ui/icon";
import { WorkspaceToolbar, workspaceFilterLabel } from "@/shared/navigation/workspace-toolbar";
import { useT } from "@/shared/i18n/provider";
import { catalogueHref, type BrowseResult } from "../filters";
import { statusLabel, type SalesStage } from "../model";

type Option = [string, string];
type Props = {
  actions?: ReactNode;
  availableStages: SalesStage[];
  count: number;
  exit?: Ref<HTMLAnchorElement>;
  facets: BrowseResult["facets"];
  page: number;
  query: string;
};

const iconLink =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-[var(--theme-surface)] hover:text-ink pointer-coarse:size-11";

export function CatalogueToolbar({
  actions,
  availableStages,
  count,
  exit,
  facets,
  page,
  query,
}: Props) {
  const t = useT();
  const params = new URLSearchParams(query);
  const board = params.get("view") === "board";
  const focus = params.get("focus") === "1";
  const panelId = useId();
  const filterToggle = useRef<HTMLElement>(null);
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismissOutside(event: PointerEvent) {
      const filters = disclosure.current;
      if (filters?.open && event.target instanceof Node && !filters.contains(event.target))
        filters.open = false;
    }
    window.addEventListener("pointerdown", dismissOutside);
    return () => window.removeEventListener("pointerdown", dismissOutside);
  }, []);
  const activeFilters = new Set(
    [...params.keys()].filter(
      (key) =>
        !["q", "view", "focus", "match", "region", "industry", "stage", "assignee"].includes(key),
    ),
  ).size;
  const clearHref = catalogueHref(new URLSearchParams(), {
    view: board ? "board" : null,
    focus: focus ? "1" : null,
  });
  const showClear = [...params.keys()].some((key) => !["view", "focus", "match"].includes(key));
  const fullscreenLabel = t(focus ? "Exit fullscreen" : "Fullscreen");

  const simple = (values: string[]): Option[] => values.map((value) => [value, value]);
  function pick(key: string, label: string, options: Option[], primary = false) {
    return (
      <label key={key} className={`${workspaceFilterLabel} ${primary ? "w-36 max-w-full" : ""}`}>
        {t(label)}
        <Select name={key} defaultValue={params.get(key) ?? ""} className="w-full min-w-0 text-ink">
          <option value="">{t("All")}</option>
          {options.map(([value, name]) => (
            <option value={value} key={value}>
              {name}
            </option>
          ))}
        </Select>
      </label>
    );
  }

  return (
    <div className="grid min-w-0 gap-2">
      <h2 className="text-sm font-medium text-muted">
        {count === 1 ? t("1 business") : t("{count} businesses", { count })}
      </h2>
      <WorkspaceToolbar
        key={query}
        label={t("Catalogue actions")}
        action="/prospects"
        applyLabel={t("Apply filters")}
        clear={showClear ? { href: clearHref, label: t("Clear filters") } : undefined}
        views={
          <nav aria-label={t("Catalogue view")} className="flex items-end gap-2">
            {(["list", "board"] as const).map((view) => {
              const label = t(view === "board" ? "My board" : "Backlog");
              const selected = board === (view === "board");
              return (
                <Link
                  key={view}
                  aria-current={selected ? "page" : undefined}
                  href={catalogueHref(params, { view: view === "board" ? "board" : null })}
                  className={`inline-flex min-h-9 items-center gap-1.5 border-b-2 px-2 py-1 text-sm whitespace-nowrap pointer-coarse:min-h-11 ${selected ? "border-lime font-semibold" : "border-transparent text-muted hover:text-ink"}`}
                >
                  <Icon name={view === "board" ? "board" : "listTree"} />
                  {label}
                </Link>
              );
            })}
          </nav>
        }
        actions={
          <>
            <Link
              ref={exit}
              aria-label={fullscreenLabel}
              title={fullscreenLabel}
              className={iconLink}
              href={catalogueHref(params, { focus: focus ? null : "1", page })}
            >
              <Icon name={focus ? "minimize" : "maximize"} />
            </Link>
            {actions && <div className="border-l border-line pl-1">{actions}</div>}
          </>
        }
      >
        {board && <input type="hidden" name="view" value="board" />}
        {focus && <input type="hidden" name="focus" value="1" />}
        <label className={`${workspaceFilterLabel} flex-[1_1_12rem]`}>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="search" size={13} />
            {t("Find a business")}
          </span>
          <Input
            type="search"
            name="q"
            defaultValue={params.get("q") ?? ""}
            maxLength={300}
            placeholder={t("Search businesses, contacts and research")}
          />
        </label>
        {pick("region", "Region", simple(facets.regions), true)}
        {pick("industry", "Industry", simple(facets.industries), true)}
        {pick(
          "stage",
          "Sales stage",
          [...availableStages, "in_progress" as const].map((v) => [v, t(statusLabel[v])]),
          true,
        )}
        {!board &&
          pick(
            "assignee",
            "Assigned to",
            [["unassigned", t("Unassigned")], ...facets.owners.map((m): Option => [m.id, m.name])],
            true,
          )}
        <details
          ref={disclosure}
          className="group shrink-0"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !event.currentTarget.open) return;
            event.preventDefault();
            event.currentTarget.open = false;
            filterToggle.current?.focus();
          }}
        >
          <summary
            ref={filterToggle}
            aria-controls={panelId}
            aria-description={
              activeFilters
                ? t("Active filter groups: {count}", { count: activeFilters })
                : undefined
            }
            className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-line px-2 text-sm marker:content-none hover:bg-[var(--theme-surface)] group-open:bg-[var(--theme-surface)] pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden"
          >
            <Icon name="filters" />
            {t("More filters")}
            {activeFilters > 0 && (
              <span className="rounded bg-[var(--theme-surface)] px-1.5 text-xs tabular-nums">
                {activeFilters}
              </span>
            )}
          </summary>
          <div
            id={panelId}
            className="absolute inset-x-0 top-full z-20 mt-2 grid max-h-[min(60dvh,28rem)] gap-3 overflow-auto rounded-xl border border-line bg-panel p-3 shadow-xl"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {pick("city", "City", simple(facets.cities))}
              {pick("called", "Calls", [
                ["yes", t("Called")],
                ["no", t("Not called")],
              ])}
              {pick("images", "Evidence images", [
                ["yes", t("With images")],
                ["no", t("Without images")],
              ])}
              {pick("identity", "Source identity", [
                ["recorded", t("Recorded")],
                ["tentative", t("Tentative")],
                ["unknown", t("Unknown")],
              ])}
              {pick("classification", "Service classification", [
                ["tagged", t("Classified")],
                ["untagged", t("Unclassified")],
              ])}
            </div>
            {facets.services.length > 0 && (
              <fieldset className="min-w-0">
                <legend className="font-medium">{t("Services")}</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2 py-2">
                  {facets.services.map((s) => (
                    <label key={s} className="flex min-w-0 items-center gap-1 wrap-anywhere">
                      <Input
                        type="checkbox"
                        name="service"
                        value={s}
                        defaultChecked={params.getAll("service").includes(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <label className={workspaceFilterLabel}>
                  {t("Match services")}{" "}
                  <Select
                    className="max-w-full justify-self-start"
                    name="match"
                    defaultValue={params.get("match") ?? "any"}
                  >
                    <option value="any">{t("Any selected service")}</option>
                    <option value="all">{t("Every selected service")}</option>
                  </Select>
                </label>
              </fieldset>
            )}
            <Button type="submit" variant="secondary" className="justify-self-start">
              {t("Apply filters")}
            </Button>
          </div>
        </details>
      </WorkspaceToolbar>
    </div>
  );
}
