"use client";
import type { ArtifactChoice } from "@/features/artifacts/model";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/controls";
import { Modal } from "antd";
import { Suspense } from "react";
import { useT } from "@/shared/i18n/provider";
import { readArtifact } from "@/features/artifacts/actions";
import type { ArtifactDetail, ArtifactKind } from "@/features/artifacts/model";
import type { TaskOperation } from "../input";
const ArtifactEditor = dynamic(() =>
  import("@/features/artifacts/components/artifact-editor").then((module) => module.ArtifactEditor),
);
export function TaskArtifacts({
  projectId,
  taskId,
  items,
  attached,
  run,
  pending,
  operationError,
  onClose,
}: {
  projectId: string;
  taskId: string;
  items: ArtifactChoice[];
  attached: string[];
  run: (op: TaskOperation) => Promise<boolean>;
  pending: boolean;
  operationError: string;
  onClose: () => void;
}) {
  const t = useT();
  const [preview, setPreview] = useState<ArtifactDetail | null>(null),
    [loading, startTransition] = useTransition(),
    [error, setError] = useState("");
  const [name, setName] = useState(""),
    [kind, setKind] = useState<ArtifactKind>("markdown");
  return (
    <Modal
      open
      width={preview ? 960 : 520}
      title={t(preview ? "Task artifact" : "Artifacts")}
      footer={null}
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={() => {
        if (pending) return;
        if (preview) setPreview(null);
        else onClose();
      }}
    >
      {preview ? (
        <Suspense fallback={<p role="status">{t("Loading…")}</p>}>
          <ArtifactEditor key={preview.id} initial={preview} stages={[]} />
        </Suspense>
      ) : (
        <div className="grid gap-2 border-t border-line pt-2">
          <label className="grid gap-1 text-xs">
            {t("Attach artifact")}
            <Select
              className={"w-full min-w-0 min-h-8 pointer-coarse:min-h-11"}
              value=""
              disabled={pending}
              onChange={(event) => {
                if (event.target.value)
                  run({
                    kind: "attach",
                    id: taskId,
                    artifactId: event.target.value,
                    remove: false,
                  });
              }}
            >
              <option value="">{t("Choose an artifact")}</option>
              {items
                .filter((item) => !attached.includes(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </label>
          {attached.map((id) => {
            const item = items.find((a) => a.id === id);
            return (
              <div key={id} className="flex flex-wrap gap-1">
                <Button
                  variant="secondary"
                  disabled={loading || pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const result = await readArtifact(projectId, id);
                        if (result.error) setError(result.error);
                        else if (result.artifact) setPreview(result.artifact);
                      } catch {
                        setError("Could not load artifact.");
                      }
                    })
                  }
                >
                  {item?.name ?? t("Artifact")}
                </Button>
                {item && (
                  <span className="self-center text-xs text-muted">
                    {t(item.status === "ready" ? "Ready to use" : "In progress")}
                  </span>
                )}
                <Button
                  variant="secondary"
                  aria-label={t("Detach artifact") + " · " + (item?.name ?? t("Artifact"))}
                  disabled={pending}
                  onClick={() => run({ kind: "attach", id: taskId, artifactId: id, remove: true })}
                >
                  {t("Detach artifact")}
                </Button>
              </div>
            );
          })}
          <details>
            <summary className="cursor-pointer text-xs">
              {t("Create artifact for this task")}
            </summary>
            <div className="grid gap-2 mt-2">
              <Input
                className={"w-full min-w-0 min-h-8 pointer-coarse:min-h-11"}
                disabled={pending}
                aria-label={t("Artifact name")}
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
              />
              <Select
                className={"w-full min-w-0 min-h-8 pointer-coarse:min-h-11"}
                disabled={pending}
                aria-label={t("Artifact type")}
                value={kind}
                onChange={(event) => setKind(event.target.value as ArtifactKind)}
              >
                <option value="markdown">{t("Markdown document")}</option>
                <option value="image">{t("Images / designs")}</option>
                <option value="software">{t("Software")}</option>
              </Select>
              <Button
                disabled={pending || !name.trim()}
                onClick={async () => {
                  if (await run({ kind: "create-artifact", id: taskId, name, artifactKind: kind }))
                    setName("");
                }}
              >
                {t("Create and attach")}
              </Button>
            </div>
          </details>
          {(operationError || error) && <p role="alert">{t(operationError || error)}</p>}
        </div>
      )}
    </Modal>
  );
}
