"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/controls";
import { Icon } from "@/shared/ui/icon";
import { LoadingState } from "@/shared/ui/loading-state";
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
        className="comment-reference-trigger col-start-1 row-start-2 w-7.5 min-h-9 p-1.25 pointer-coarse:min-h-11"
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
        className={
          "comment-reference-dialog bg-[var(--theme-surface-low,#172b25)] text-ink border border-line rounded-[12px] w-[min(480px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_40px)] p-4 [&_>_input]:w-full [&_>_input]:my-2 [&_>_input]:mx-0 [&_>_label]:block [&_>_label]:text-[11px] [&_>_label]:text-muted [&_>_small]:block [&_>_small]:text-[11px] [&_>_small]:text-muted backdrop:[background:#0009]"
        }
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
      <div className={"comment-reference-heading flex items-center justify-between gap-3"}>
        <h2
          className={
            "font-sans tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 text-[15px] m-0"
          }
        >
          {t("Link a project or artifact")}
        </h2>
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
      <div
        className={"comment-reference-results h-[min(300px,_45dvh)] overflow-y-auto mt-3"}
        aria-live="polite"
        aria-busy={!results && !error}
      >
        {error ? (
          <>
            <p role="alert" className={"mb-[1em] mt-0"}>
              {t("Could not load references.")}
            </p>
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
          <LoadingState label={t("Loading…")} variant="compact" lines={3} />
        ) : results.items.length ? (
          <ul className={"list-none m-0 p-0"}>
            {results.items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Button
                  variant="ghost"
                  onClick={() => onSelect(item)}
                  className={
                    "flex gap-2 w-full p-2.25 text-left rounded-[6px] hover:bg-[var(--theme-overlay,#ffffff0c)]"
                  }
                >
                  <Icon name={item.kind === "project" ? "overview" : "markdown"} />
                  <span>
                    <strong className={"block text-[12px] wrap-anywhere"}>{item.name}</strong>
                    <small className={"block text-[11px] text-muted"}>
                      {t(item.kind === "project" ? "Project" : "Artifact")}
                      {item.kind === "artifact" ? ` · ${item.projectName}` : ""}
                    </small>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={"mb-[1em] mt-0"}>{t("No matching projects or artifacts.")}</p>
        )}
      </div>
      {results?.hasMore && <small>{t("More results available. Narrow your search.")}</small>}
    </>
  );
}
