"use client";
import { useEffect, useState } from "react";
import { useT } from "@/shared/i18n/provider";
import { Button } from "@/shared/ui/button";
import { browseArtifacts } from "../actions";
import { emptyArtifactFilters, type ArtifactFilters, type ArtifactPage } from "../model";
import { ArtifactLibrary, ArtifactFilterControls } from "./artifact-library";

type Request = { filters: ArtifactFilters; cursors: string[] };
export function GlobalArtifactLibrary({
  initial,
  projects,
}: {
  initial: ArtifactPage;
  projects: { id: string; name: string; flow_id: string | null }[];
}) {
  const t = useT();
  const [request, setRequest] = useState<Request | null>(null);
  const [response, setResponse] = useState<{ request: Request; page: ArtifactPage | null } | null>(
    null,
  );
  const filters = request?.filters ?? emptyArtifactFilters;
  const cursors = request?.cursors ?? [];
  useEffect(() => {
    if (!request) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const page = await browseArtifacts(request.filters, request.cursors.at(-1));
        if (active) setResponse({ request, page });
      } catch {
        if (active) setResponse({ request, page: null });
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request]);
  const loading = !!request && response?.request !== request;
  const page = request ? (response?.request === request ? response.page : null) : initial;
  const next = page?.next;
  const hasFilters =
    !!filters.search.trim() ||
    filters.project !== "all" ||
    filters.kind !== "all" ||
    filters.status !== "all";
  return (
    <>
      <ArtifactLibrary
        items={page?.items ?? []}
        projects={projects}
        searching={!page}
        hasFilters={hasFilters}
        filterControls={
          <ArtifactFilterControls
            filters={filters}
            projects={projects}
            onChange={(filters) => setRequest({ filters, cursors: [] })}
          />
        }
        pageStatus={
          loading ? (
            <p role="status">{t("Loading…")}</p>
          ) : !page && request ? (
            <div role="alert">
              {t("Could not load artifacts.")}{" "}
              <Button type="button" onClick={() => setRequest({ ...request })}>
                {t("Retry")}
              </Button>
            </div>
          ) : null
        }
      />
      {(cursors.length > 0 || next) && (
        <nav className="flex gap-3 mt-4" aria-label={t("Artifact pages")}>
          {cursors.length > 0 && (
            <Button
              type="button"
              onClick={() => setRequest({ filters, cursors: cursors.slice(0, -1) })}
            >
              {t("Previous page")}
            </Button>
          )}
          {next && (
            <Button
              type="button"
              onClick={() => setRequest({ filters, cursors: [...cursors, next] })}
            >
              {t("More artifacts")}
            </Button>
          )}
        </nav>
      )}
    </>
  );
}
