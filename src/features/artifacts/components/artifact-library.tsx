"use client";
import { CreateArtifactDialog } from "./create-artifact-dialog";
import { EmptyState } from "@/shared/ui/panel";
import { FilterBar } from "@/shared/ui/form-patterns";
import { ArtifactCardItem } from "./artifact-card-item";

import { Input, Select } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createArtifact } from "@/features/artifacts/actions";
import {
  artifactKinds,
  type ArtifactCard,
  type ArtifactFilters,
  emptyArtifactFilters,
} from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";

export function ArtifactLibrary({
  items,
  projects,
  projectId,
  stages = [],
  stageId,
  filterControls,
  pageStatus,
  searching = false,
  hasFilters = false,
}: {
  filterControls?: ReactNode;
  pageStatus?: ReactNode;
  searching?: boolean;
  hasFilters?: boolean;
  items: ArtifactCard[];
  projects: { id: string; name: string; flow_id?: string | null }[];
  projectId?: string;
  stages?: { id: string; name: string }[];
  stageId?: string | undefined;
}) {
  const t = useT(),
    router = useRouter();
  const [filters, setFilters] = useState(emptyArtifactFilters);
  const { search, kind, status, project } = filters;
  const [editing, setEditing] = useState(false);
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
          type="button"
          disabled={!projects.length}
          onClick={() => setEditing(true)}
          className={"max-[700px]:w-full"}
        >
          {t("New artifact")}
        </Button>
      </div>
      {filterControls ?? (
        <ArtifactFilterControls
          filters={filters}
          onChange={setFilters}
          projects={projects}
          scoped={!!projectId}
        />
      )}
      {pageStatus}
      {searching ? null : !visible.length ? (
        <EmptyState
          title={t(items.length || hasFilters ? "No matching artifacts." : "No artifacts yet.")}
        >
          {t("Start with a work in progress, attach its output when ready.")}
        </EmptyState>
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
                  "artifact-grid grid grid-cols-[repeat(auto-fill,minmax(min(100%,244px),1fr))] gap-2"
                }
              >
                {group.items.map((a) => (
                  <ArtifactCardItem key={a.id} card={a} showProject={!projectId} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <CreateArtifactDialog
          items={items}
          projects={projects}
          projectId={projectId}
          stages={stages}
          stageId={stageId}
          close={() => setEditing(false)}
          save={createArtifact}
          onCreated={(href) => router.push(href)}
        />
      )}
    </section>
  );
}

export function ArtifactFilterControls({
  filters,
  onChange,
  projects,
  scoped = false,
}: {
  filters: ArtifactFilters;
  onChange: (value: ArtifactFilters) => void;
  projects: { id: string; name: string }[];
  scoped?: boolean;
}) {
  const t = useT(),
    { search, project, kind, status } = filters;
  return (
    <FilterBar className="artifact-filters mb-5">
      <Input
        aria-label={t("Find an artifact")}
        placeholder={t("Find an artifact")}
        maxLength={200}
        value={search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className={"min-w-0 [flex:1_1_140px] [flex-basis:220px]"}
      />
      {!scoped && (
        <Select
          aria-label={t("Project")}
          value={project}
          onChange={(e) => onChange({ ...filters, project: e.target.value })}
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
        onChange={(e) => onChange({ ...filters, kind: e.target.value })}
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
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={"min-w-0 [flex:1_1_140px]"}
      >
        <option value="all">{t("All statuses")}</option>
        <option value="in_progress">{t("In progress")}</option>
        <option value="ready">{t("Ready to use")}</option>
      </Select>
    </FilterBar>
  );
}
