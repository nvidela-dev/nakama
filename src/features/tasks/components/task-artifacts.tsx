"use client";
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
  onClose,
}: {
  projectId: string;
  taskId: string;
  items: { id: string; name: string }[];
  attached: string[];
  run: (op: TaskOperation) => void;
  pending: boolean;
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
      onCancel={() => {
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
          {attached.map((id) => (
            <div key={id} className="flex flex-wrap gap-1">
              <Button
                variant="secondary"
                disabled={loading}
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
                {items.find((item) => item.id === id)?.name ?? t("Artifact")}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => run({ kind: "attach", id: taskId, artifactId: id, remove: true })}
              >
                {t("Detach artifact")}
              </Button>
            </div>
          ))}
          <details>
            <summary className="cursor-pointer text-xs">
              {t("Create artifact for this task")}
            </summary>
            <div className="grid gap-2 mt-2">
              <Input
                className={"w-full min-w-0 min-h-8 pointer-coarse:min-h-11"}
                aria-label={t("Artifact name")}
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
              />
              <Select
                className={"w-full min-w-0 min-h-8 pointer-coarse:min-h-11"}
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
                onClick={() =>
                  run({ kind: "create-artifact", id: taskId, name, artifactKind: kind })
                }
              >
                {t("Create and attach")}
              </Button>
            </div>
          </details>
          {error && <p role="alert">{t(error)}</p>}
        </div>
      )}
    </Modal>
  );
}
