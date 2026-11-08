"use client";
import dynamic from "next/dynamic";
import { Icon } from "@/shared/ui/icon";
import { Input, Select, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@/shared/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createArtifact } from "@/features/artifacts/actions";
import {
  artifactKinds,
  artifactUrl,
  artifactFileUrl,
  type ArtifactCard,
} from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";

const ShirtCover = dynamic(() => import("../shirts/cover").then((m) => m.ShirtCover));

export function ArtifactLibrary({
  items,
  projects,
  projectId,
  stages = [],
  stageId,
}: {
  items: ArtifactCard[];
  projects: { id: string; name: string; flow_id?: string | null }[];
  projectId?: string;
  stages?: { id: string; name: string }[];
  stageId?: string | undefined;
}) {
  const t = useT(),
    router = useRouter(),
    opener = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition(),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [status, setStatus] = useState("all"),
    [project, setProject] = useState("all");
  const [editing, setEditing] = useState(false);
  const [createProject, setCreateProject] = useState(projectId ?? projects[0]?.id);
  const shirtShop = projects.find((p) => p.id === createProject)?.flow_id === "shirt-eshop";
  const [createKind, setCreateKind] = useState(projectId && shirtShop ? "shirt" : "image");
  const searchQuery = useDeferredValue(search.trim().toLowerCase());
  const visible = useMemo(
    () =>
      items.filter(
        (a) =>
          (kind === "all" || (a.collection ? "shirt" : a.kind) === kind) &&
          (status === "all" || a.status === status) &&
          (project === "all" || a.project_id === project) &&
          `${a.name} ${a.project_name} ${a.collection ?? ""} ${a.description}`
            .toLowerCase()
            .includes(searchQuery),
      ),
    [items, kind, status, project, searchQuery],
  );
  const groups = new Map<string, { label: string; items: ArtifactCard[] }>();
  for (const item of visible) {
    const key = item.collection ? item.project_id + ":" + item.collection.toLowerCase() : "";
    if (!groups.has(key))
      groups.set(key, {
        label: item.collection
          ? (projectId ? "" : item.project_name + " · ") + item.collection
          : "",
        items: [],
      });
    groups.get(key)!.items.push(item);
  }
  function close() {
    setEditing(false);
    setError("");
    opener.current?.focus();
  }
  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await createArtifact(String(form.get("projectId")), {
          name: form.get("name"),
          description: form.get("description"),
          kind: form.get("kind"),
          ...(form.get("collection") ? { collection: form.get("collection") } : {}),
          stageId: form.get("stageId") || null,
          status: "in_progress",
          githubUrl: form.get("githubUrl") || "",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        close();
        router.push(artifactUrl(String(form.get("projectId")), result.id!));
      } catch {
        setError("Could not save the artifact. Your draft is still here.");
      }
    });
  }
  return (
    <section className={"artifact-library min-w-0"} aria-label={t("Artifacts")}>
      <div
        className={
          "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 max-[700px]:items-start"
        }
      >
        <div>
          <h2
            className={[
              projectId ? undefined : "sr-only",
              "font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 absolute w-0.25 h-0.25 p-0 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0 m-0",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {t("Artifacts")}
          </h2>
          <p className={"muted text-muted mt-1.5 mx-0 mb-0 text-[12px] max-w-[60ch]"}>
            {t("Plans, designs, documents, and software produced by your projects.")}
          </p>
        </div>
        <Button
          type="submit"
          ref={opener}
          disabled={!projects.length}
          onClick={() => setEditing(true)}
          className={"max-[700px]:w-full"}
        >
          {t("New artifact")}
        </Button>
      </div>
      <div className={"artifact-filters flex flex-wrap gap-2.5 mb-5"}>
        <Input
          aria-label={t("Find an artifact")}
          placeholder={t("Find an artifact")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={"min-w-0 [flex:1_1_140px] [flex-basis:220px]"}
        />
        {!projectId && (
          <Select
            aria-label={t("Project")}
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className={"min-w-0 [flex:1_1_140px]"}
          >
            <option value="all">{t("All projects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Select
          aria-label={t("Artifact type")}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={"min-w-0 [flex:1_1_140px]"}
        >
          <option value="all">{t("All types")}</option>
          <option value="shirt">{t("Shirt design")}</option>
          {Object.entries(artifactKinds).map(([key, label]) => (
            <option key={key} value={key}>
              {t(label)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t("Artifact status")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={"min-w-0 [flex:1_1_140px]"}
        >
          <option value="all">{t("All statuses")}</option>
          <option value="in_progress">{t("In progress")}</option>
          <option value="ready">{t("Ready to use")}</option>
        </Select>
      </div>
      {!visible.length ? (
        <div
          className={
            "empty-state text-center py-15 px-5 [border:1px_dashed_var(--color-line)] rounded-[12px] text-muted [&_>_span]:text-[52px] [&_>_span]:text-lime lg:compact:py-6 lg:compact:px-4 lg:compact:[&_>_span]:text-[30px]"
          }
        >
          <h3
            className={
              "mb-[1em] font-sans tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-ink mt-5"
            }
          >
            {t(items.length ? "No matching artifacts." : "No artifacts yet.")}
          </h3>
          <p className={"mb-[1em] mt-0 text-[14px]"}>
            {t("Start with a work in progress, attach its output when ready.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {Array.from(groups, ([key, group]) => (
            <section key={key}>
              {(group.label || groups.size > 1) && (
                <h3 className="mb-2 font-semibold">
                  {group.label || t("Other artifacts")}{" "}
                  <small className="text-muted">{group.items.length}</small>
                </h3>
              )}
              <div
                className={
                  "artifact-grid grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_260px),_1fr))] gap-4"
                }
              >
                {group.items.map((a) => (
                  <Link
                    key={a.id}
                    className={
                      "artifact-card panel bg-panel rounded-[16px] max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] flex flex-col min-w-0 overflow-hidden border border-line hover:border-lime focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:4px] p-0"
                    }
                    href={artifactUrl(a.project_id, a.id)}
                  >
                    <div
                      className={[
                        `artifact-cover artifact-cover-${a.kind}`,
                        a.kind === "markdown" &&
                          "[background:linear-gradient(135deg,var(--theme-surface,#313b2c),#17231c)]!",
                        a.kind === "software" &&
                          "[background:linear-gradient(135deg,var(--theme-surface,#243736),var(--theme-surface-low,#142327))]!",
                        "h-45 [background:linear-gradient(135deg,_var(--theme-surface,#243b32),_#101c1b)] grid place-items-center border-b border-b-line relative overflow-hidden [flex:0_0_180px] [&_>_span]:text-[48px] [&_>_span]:text-lime [&_>_span]:opacity-80",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {a.shirt_cover ? (
                        <ShirtCover card={a} />
                      ) : a.cover_id ? (
                        <img
                          decoding="async"
                          loading="lazy"
                          src={artifactFileUrl(a.project_id, a.id, a.cover_id)}
                          alt={a.name}
                          className={
                            "w-full h-full [object-fit:cover] absolute inset-0 block min-h-0"
                          }
                        />
                      ) : (
                        <span aria-hidden="true">
                          <Icon
                            name={
                              a.kind === "markdown"
                                ? "markdown"
                                : a.kind === "software"
                                  ? "code"
                                  : "image"
                            }
                            size={32}
                          />
                        </span>
                      )}
                    </div>
                    <div className={"artifact-card-body p-4"}>
                      <div
                        className={
                          "artifact-card-meta flex justify-between items-center gap-2 text-[11px] text-muted"
                        }
                      >
                        <span>{t(a.collection ? "Shirt design" : artifactKinds[a.kind])}</span>
                        <span
                          className={[
                            `artifact-status ${a.status}`,
                            "inline-block shrink-0 py-1 px-2 border border-line rounded-[20px] text-[11px] text-muted [&.ready]:bg-[var(--theme-surface,#304630)] [&.ready]:text-lime [&.ready]:[border-color:var(--theme-border,#5c7544)]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {t(a.status === "ready" ? "Ready to use" : "In progress")}
                        </span>
                      </div>
                      <h3
                        className={
                          "font-sans tracking-[-0.045em] font-semibold lg:compact:text-[15px] lg:compact:mb-2 lg:compact:mt-4.5 mt-3 mx-0 mb-1 text-[18px] wrap-anywhere"
                        }
                      >
                        {a.name}
                      </h3>
                      <p className={"muted text-muted my-1.25 mx-0 text-[12px]"}>
                        {a.project_name}
                        {a.stage_id
                          ? ` · ${t(a.stage_name ?? stages.find((s) => s.id === a.stage_id)?.name ?? a.stage_id)}`
                          : ""}
                      </p>
                      {a.description && (
                        <p
                          className={
                            "artifact-excerpt [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden text-muted my-1.25 mx-0 text-[12px]"
                          }
                        >
                          {a.description}
                        </p>
                      )}
                      <small className={"block mt-3.75 text-muted text-[11px]"}>
                        {a.done_task_count}/{a.task_count} {t("tasks done")}
                        {a.file_count ? ` · ${a.file_count} ${t("files")}` : ""}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Dialog
        open={editing}
        onClose={close}
        dismissible={!pending}
        className={
          "artifact-dialog w-[min(560px,_calc(100vw_-_32px))] max-h-[90dvh] overflow-y-auto bg-panel text-ink border border-line rounded-[12px] p-6 backdrop:[background:var(--theme-overlay,#06100de8)]"
        }
        labelledBy="new-artifact-heading"
      >
        {editing && (
          <form
            className={
              "form-stack flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted lg:compact:gap-1.75"
            }
            onSubmit={create}
          >
            <div
              className={
                "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start"
              }
            >
              <h2
                id="new-artifact-heading"
                className={
                  "font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
                }
              >
                {t("New artifact")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                className={
                  "min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-2 lg:compact:mt-1 max-[700px]:w-full"
                }
                onClick={close}
                aria-label={t("Close")}
              >
                <Icon name="close" />
              </Button>
            </div>
            {projectId ? (
              <Input
                type="hidden"
                name="projectId"
                value={projectId}
                className={"w-full [resize:vertical]"}
              />
            ) : (
              <label className={"text-[13px] text-ink"}>
                {t("Project")}
                <Select
                  aria-label={t("Project")}
                  name="projectId"
                  value={createProject}
                  onChange={(e) => {
                    setCreateProject(e.target.value);
                    setCreateKind(
                      projects.find((p) => p.id === e.target.value)?.flow_id === "shirt-eshop"
                        ? "shirt"
                        : "image",
                    );
                  }}
                  required
                  className={"max-w-full focus-visible:[outline-offset:4px]"}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label className={"text-[13px] text-ink"}>
              {t("Artifact name")}
              <Input
                name="name"
                required
                maxLength={160}
                autoFocus
                className={"w-full [resize:vertical]"}
              />
            </label>
            <label className={"text-[13px] text-ink"}>
              {t("Artifact type")}
              <Select
                aria-label={t("Artifact type")}
                name="kind"
                value={createKind}
                onChange={(e) => setCreateKind(e.target.value)}
                className={"max-w-full focus-visible:[outline-offset:4px]"}
              >
                {shirtShop && <option value="shirt">{t("Shirt design")}</option>}
                {Object.entries(artifactKinds).map(([key, label]) => (
                  <option key={key} value={key}>
                    {t(label)}
                  </option>
                ))}
              </Select>
            </label>
            {createKind === "shirt" && (
              <label>
                {t("Collection")}
                <Input
                  name="collection"
                  maxLength={80}
                  required
                  defaultValue={
                    items.find((a) => a.project_id === createProject && a.collection)?.collection ??
                    t("Collection 01")
                  }
                  list="shop-collections"
                />
                <datalist id="shop-collections">
                  {Array.from(
                    new Set(
                      items
                        .filter((a) => a.project_id === createProject)
                        .map((a) => a.collection)
                        .filter(Boolean),
                    ),
                  ).map((c) => (
                    <option key={c} value={c!} />
                  ))}
                </datalist>
              </label>
            )}
            <label className={"text-[13px] text-ink"}>
              {t("Description")}
              <Textarea
                name="description"
                maxLength={4000}
                rows={3}
                className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
              />
            </label>
            {!!stages.length && (
              <label className={"text-[13px] text-ink"}>
                {t("Phase (optional)")}
                <Select
                  aria-label={t("Phase (optional)")}
                  name="stageId"
                  defaultValue={stageId ?? ""}
                  className={"max-w-full focus-visible:[outline-offset:4px]"}
                >
                  <option value="">{t("Whole project")}</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.name)}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
              {t(
                "Created in progress. Add images, a Markdown file, or a GitHub link on the next screen.",
              )}
            </p>
            {error && (
              <p
                role="alert"
                className={
                  "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[var(--theme-danger,#4e3030)] [color:var(--theme-danger-ink,#ffe4dd)]!"
                }
              >
                {t(error)}
              </p>
            )}
            <Button type="submit" disabled={pending} className={"mt-2 lg:compact:mt-1"}>
              {pending ? t("Saving…") : t("Create artifact")}
            </Button>
          </form>
        )}
      </Dialog>
    </section>
  );
}
