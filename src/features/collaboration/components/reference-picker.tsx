"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/controls";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
import type { ChatReference, ReferenceResults } from "../references";
type Props = {
  load: (search: string) => Promise<ReferenceResults>;
  onSelect: (item: ChatReference) => void;
  disabled?: boolean;
};
export function ReferencePicker({ load, onSelect, disabled }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="comment-reference-trigger"
        variant="ghost"
        disabled={disabled}
        aria-label={t("Link a project or artifact")}
        title={t("Link a project or artifact")}
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" />
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        label={t("Link a project or artifact")}
        className="comment-reference-dialog"
      >
        {open && (
          <ReferenceSearch
            load={load}
            onSelect={(item) => {
              onSelect(item);
              setOpen(false);
            }}
            close={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}
function ReferenceSearch({ load, onSelect, close }: Props & { close: () => void }) {
  const t = useT();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ReferenceResults>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void load(search)
        .then((value) => {
          if (!cancelled) setResults(value);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, load, attempt]);
  return (
    <>
      <div className="comment-reference-heading">
        <h2>{t("Link a project or artifact")}</h2>
        <Button variant="ghost" aria-label={t("Close")} onClick={close}>
          <Icon name="close" />
        </Button>
      </div>
      <label htmlFor="chat-reference-search">{t("Search projects and artifacts")}</label>
      <Input
        ref={field}
        id="chat-reference-search"
        autoFocus
        type="search"
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        value={search}
        maxLength={100}
        onChange={(e) => {
          setSearch(e.target.value);
          setResults(undefined);
          setError(false);
        }}
      />
      <small>{t("Links do not grant access. Names you share become part of your message.")}</small>
      <div className="comment-reference-results" aria-live="polite" aria-busy={!results && !error}>
        {error ? (
          <>
            <p role="alert">{t("Could not load references.")}</p>
            <Button
              onClick={() => {
                setError(false);
                setResults(undefined);
                setAttempt((x) => x + 1);
              }}
            >
              {t("Try again")}
            </Button>
          </>
        ) : !results ? (
          <p>{t("Loading…")}</p>
        ) : results.items.length ? (
          <ul>
            {results.items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Button variant="ghost" onClick={() => onSelect(item)}>
                  <Icon name={item.kind === "project" ? "overview" : "markdown"} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {t(item.kind === "project" ? "Project" : "Artifact")}
                      {item.kind === "artifact" ? ` · ${item.projectName}` : ""}
                    </small>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("No matching projects or artifacts.")}</p>
        )}
      </div>
      {results?.hasMore && <small>{t("More results available. Narrow your search.")}</small>}
    </>
  );
}
