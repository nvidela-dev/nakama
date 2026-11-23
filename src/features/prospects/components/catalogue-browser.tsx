"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";
import type { ActionState } from "@/shared/contracts/action-state";
import type { BrowseResult } from "../filters";
import { catalogueHref, type BusinessCard } from "../filters";
import { salesStages, statusLabel, type SalesStage } from "../model";
import { SalesSummary } from "./sales-summary";
import { BoardEntry } from "./prospect-forms";
import { updateProspect } from "../actions";

type Option = [string, string];
type Props = { listing: BrowseResult; query: string; page: number; owner: boolean };
export function CatalogueBrowser({ listing, query, page, owner }: Props) {
  const t = useT(),
    router = useRouter(),
    params = new URLSearchParams(query),
    board = params.get("view") === "board",
    focus = params.get("focus") === "1";
  const [dragged, setDragged] = useState<BusinessCard | null>(null),
    [hover, setHover] = useState<SalesStage | null>(null);
  const [feedback, setFeedback] = useState<ActionState>({}),
    [pending, start] = useTransition();
  const exit = useRef<HTMLAnchorElement>(null);
  const exitLink = catalogueHref(params, { focus: null, page });
  useEffect(() => {
    if (!focus) return;
    exit.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.replace(exitLink, { scroll: false });
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [focus, exitLink, router]);
  const count = Object.values(listing.counts).reduce((a, b) => a + b, 0);
  const legacyLane = (listing.counts.in_progress ?? 0) > 0;
  const boardStages = legacyLane ? [...salesStages, "in_progress" as const] : salesStages;
  const simple = (names: string[]): Option[] => names.map((v) => [v, v]);
  function pick(key: string, label: string, options: Option[]) {
    return (
      <label key={key} className="grid content-start gap-1 text-xs text-muted">
        {t(label)}
        <Select name={key} defaultValue={params.get(key) ?? ""} className="w-full min-w-0 text-ink">
          <option value="">{t("All")}</option>
          {options.map(([v, name]) => (
            <option value={v} key={v}>
              {name}
            </option>
          ))}
        </Select>
      </label>
    );
  }
  function move(card: BusinessCard, status: SalesStage) {
    if (pending || card.status === status) return;
    start(async () => {
      try {
        setFeedback(
          await updateProspect({ type: "stage", id: card.id, revision: card.revision, status }),
        );
      } catch {
        setFeedback({ error: "Unable to save. Please try again." });
      }
    });
  }
  const businessHref = (id: string) => catalogueHref(params, { business: id, page });
  function businessLink(card: BusinessCard, large = false) {
    return (
      <Link
        href={businessHref(card.id)}
        prefetch={false}
        className={
          large
            ? "grid gap-2 font-semibold wrap-anywhere hover:underline"
            : "flex items-center gap-3 font-semibold wrap-anywhere hover:underline"
        }
      >
        {card.image && (
          <Image
            unoptimized
            draggable={false}
            src={`/prospects/${card.id}/images/${card.image}`}
            alt=""
            width={large ? 320 : 100}
            height={large ? 160 : 68}
            className={
              large
                ? "w-full h-28 bg-bg object-contain rounded"
                : "size-14 shrink-0 rounded border border-line object-cover sm:w-20"
            }
          />
        )}
        <span>{card.name}</span>
      </Link>
    );
  }
  function tile(card: BusinessCard) {
    return (
      <li
        key={card.id}
        draggable={!pending}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", card.id);
          setDragged(card);
        }}
        onDragEnd={() => {
          setDragged(null);
          setHover(null);
        }}
        className="rounded-lg border border-line bg-panel p-3 grid gap-1.5"
      >
        {businessLink(card, true)}
        <span className="text-xs text-muted">
          {[
            card.city,
            card.industry,
            t(card.called ? "Called" : "Not called"),
            card.open_todos ? t("{count} open to-dos", { count: card.open_todos }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <SalesSummary summary={card} t={t} compact />
      </li>
    );
  }
  const nextPage = board
    ? Object.values(listing.counts).some((n) => n > page * 16)
    : page * 40 < count;
  const filterItems = Array.from(params.entries()).filter(
    ([k]) => !["view", "focus", "match"].includes(k),
  );
  return (
    <section
      aria-label={t("Browse businesses")}
      className={
        focus ? "fixed inset-0 z-[90] overflow-auto bg-bg p-4 md:p-8" : "min-w-0 grid gap-4"
      }
    >
      <div className="flex items-center flex-wrap justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {count === 1 ? t("1 business") : t("{count} businesses", { count })}
        </h2>
        <nav
          aria-label={t("Catalogue view")}
          className="flex min-h-9 items-center gap-1 rounded-lg border border-line bg-panel p-1 text-sm"
        >
          {(["list", "board"] as const).map((v) => (
            <Link
              key={v}
              aria-current={(board ? v === "board" : v === "list") ? "page" : undefined}
              href={catalogueHref(params, { view: v === "board" ? "board" : null })}
              className="rounded px-3 py-1.5 aria-[current=page]:bg-[var(--theme-surface)] aria-[current=page]:font-bold"
            >
              {t(v === "board" ? "My board" : "Backlog")}
            </Link>
          ))}
          <Link
            ref={exit}
            className="border-l border-line px-2"
            href={focus ? exitLink : catalogueHref(params, { focus: "1", page })}
          >
            {t(focus ? "Exit fullscreen" : "Fullscreen")}
          </Link>
        </nav>
      </div>
      <form
        key={query}
        method="get"
        action="/prospects"
        className="my-3 rounded-xl border border-line bg-panel p-3 grid gap-3"
      >
        {board && <Input type="hidden" name="view" value="board" />}
        {focus && <Input type="hidden" name="focus" value="1" />}
        <div className="flex gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={params.get("q") ?? ""}
            maxLength={300}
            placeholder={t("Search businesses, contacts and research")}
            aria-label={t("Find a business")}
          />
          <Button type="submit">{t("Search")}</Button>
        </div>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          {pick("region", "Region", simple(listing.facets.regions))}
          {pick("industry", "Industry", simple(listing.facets.industries))}
          {pick(
            "stage",
            "Sales stage",
            [...salesStages, "in_progress" as const].map((v) => [v, t(statusLabel[v])]),
          )}
          {!board &&
            pick("assignee", "Assigned to", [
              ["unassigned", t("Unassigned")],
              ...listing.facets.owners.map((m): Option => [m.id, m.name]),
            ])}
        </div>
        <details
          open={
            ["city", "called", "images", "identity", "classification", "service"].some((k) =>
              params.has(k),
            ) || undefined
          }
        >
          <summary className="w-fit cursor-pointer text-sm font-medium">
            {t("More filters")}
          </summary>
          <div className="mt-2 grid gap-2 grid-cols-2 md:grid-cols-4">
            {pick("city", "City", simple(listing.facets.cities))}
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
          {listing.facets.services.length > 0 && (
            <fieldset className="mt-3">
              <legend className="font-medium">{t("Services")}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2 py-2">
                {listing.facets.services.map((s) => (
                  <label key={s} className="flex gap-1 items-center">
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
              <label className="text-sm">
                {t("Match services")}{" "}
                <Select name="match" defaultValue={params.get("match") ?? "any"}>
                  <option value="any">{t("Any selected service")}</option>
                  <option value="all">{t("Every selected service")}</option>
                </Select>
              </label>
            </fieldset>
          )}
        </details>
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="submit" variant="secondary">
            {t("Apply filters")}
          </Button>
          {filterItems.length > 0 && (
            <Link
              className="underline"
              href={catalogueHref(new URLSearchParams(), {
                view: board ? "board" : null,
                focus: focus ? "1" : null,
              })}
            >
              {t("Clear filters")}
            </Link>
          )}
        </div>
      </form>
      <Feedback state={feedback} />
      {board ? (
        <div className="overflow-x-auto pb-3" tabIndex={0} role="region" aria-label={t("My board")}>
          <div className="grid grid-flow-col auto-cols-[minmax(13.5rem,1fr)] gap-3">
            {boardStages.map((stage) => {
              const cards = listing.cards.filter((c) => c.status === stage),
                total = listing.counts[stage] ?? 0;
              return (
                <section
                  aria-label={t(statusLabel[stage])}
                  key={stage}
                  onDragOver={(e) => {
                    if (dragged && stage !== "in_progress") {
                      e.preventDefault();
                      setHover(stage);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragged && stage !== "in_progress") move(dragged, stage);
                    setHover(null);
                    setDragged(null);
                  }}
                  className={`min-w-0 min-h-36 rounded-xl border p-2.5 bg-[var(--theme-surface)] ${hover === stage ? "border-lime" : "border-line"}`}
                >
                  <h3 className="mb-3 flex justify-between gap-2 font-semibold">
                    <span>{t(statusLabel[stage])}</span>
                    <span className="text-muted tabular-nums">{total}</span>
                  </h3>
                  {stage === "in_progress" && (
                    <p className="mb-2 text-xs text-muted">
                      {t("Move these businesses to a specific stage when you review them.")}
                    </p>
                  )}
                  <ul className="grid gap-2">{cards.map(tile)}</ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="min-w-0 rounded-xl border border-line bg-panel overflow-x-auto"
          role="region"
          aria-label={t("Backlog")}
          tabIndex={0}
        >
          <table className="w-full text-sm text-left">
            <caption className="sr-only">{t("Business backlog")}</caption>
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="p-3">{t("Business")}</th>
                <th className="p-3 hidden md:table-cell">{t("City")}</th>
                <th className="p-3 hidden lg:table-cell">{t("Industry")}</th>
                <th className="p-3 hidden sm:table-cell">{t("Assigned to")}</th>
                <th className="p-3">{t("Sales stage")}</th>
                <th className="p-3">{t("Sales activity")}</th>
                <th className="p-3">
                  <span className="sr-only sm:not-sr-only">{t("My board")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {listing.cards.map((card) => (
                <tr key={card.id}>
                  <th scope="row" className="p-2 sm:p-3">
                    {businessLink(card)}
                    <span className="block text-xs font-normal text-muted md:hidden">
                      {card.city}
                    </span>
                  </th>
                  <td className="p-3 hidden md:table-cell">{card.city || "—"}</td>
                  <td className="p-3 hidden lg:table-cell">{card.industry || "—"}</td>
                  <td className="p-3 hidden sm:table-cell">
                    {card.assignee_name ?? t("Unassigned")}
                  </td>
                  <td className="p-2">{t(statusLabel[card.status])}</td>
                  <td className="p-2">
                    <SalesSummary summary={card} t={t} compact />
                  </td>
                  <td className="p-2">
                    {(card.mine || (owner && card.unassigned)) && !card.on_board && (
                      <BoardEntry id={card.id} revision={card.revision} onBoard={false} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || nextPage) && (
        <nav aria-label={t("Catalogue pages")} className="flex items-center gap-4">
          {page > 1 && (
            <Link href={catalogueHref(params, { page: page - 1 })}>{t("Previous")}</Link>
          )}
          <span>{t("Page {page}", { page })}</span>
          {nextPage && <Link href={catalogueHref(params, { page: page + 1 })}>{t("Next")}</Link>}
        </nav>
      )}
      {count === 0 && (
        <p className="p-3">
          {t(
            board && !filterItems.length
              ? "Add a business from the backlog to start your board."
              : "No matching businesses.",
          )}
        </p>
      )}
    </section>
  );
}
