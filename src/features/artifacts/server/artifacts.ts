import {
  selectedFlowSchema,
  artifactBytesSchema,
  artifactRowSchema,
  artifactFileSchema,
  countSchema,
} from "@/server/database/row-schemas";
import {
  artifactKindSchema,
  artifactStatusSchema,
  artifactTaskSchema,
} from "@/shared/contracts/domain-schemas";
import { queryRows, required } from "@/server/database/query";
import type { ArtifactMediaType } from "@/shared/contracts/database.generated";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { membership, ProjectError, type Actor } from "@/features/projects/server/projects";
import { flows } from "@/features/guidance/model/flows";
import { recordActivity } from "@/server/database/activity-log";
import type { ArtifactDetail, ArtifactKind } from "@/features/artifacts/model";

const uuid = z.uuid();
const metadata = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).default(""),
  stageId: z.string().min(1).max(100).nullable().default(null),
  status: artifactStatusSchema.default("in_progress"),
  githubUrl: z.string().trim().max(500).default(""),
});
const tasksSchema = z
  .array(artifactTaskSchema)
  .max(100)
  .refine((items) => new Set(items.map((t) => t.id)).size === items.length);
export class ArtifactConflictError extends ProjectError {
  override readonly diagnosticType = "ArtifactConflictError";
  override readonly diagnosticCategory = "conflict";
  constructor(public current: ArtifactDetail) {
    super(
      "This artifact changed. Your draft is still here. Review the latest version before saving.",
    );
  }
}
const columns =
  "a.id,a.project_id,p.name AS project_name,a.flow_id,a.stage_id,a.name,a.description,a.kind,a.status,a.github_url,a.revision,a.updated_at";
async function detail(
  tx: Queryable,
  projectId: string,
  artifactId: string,
): Promise<ArtifactDetail> {
  if (!uuid.safeParse(artifactId).success) throw new ProjectError("Artifact not found.");
  const artifact = (
    await queryRows(
      tx,
      artifactRowSchema,
      `SELECT ${columns} FROM project_artifacts a JOIN projects p ON p.id=a.project_id WHERE a.project_id=$1 AND a.id=$2`,
      [projectId, artifactId],
    )
  )[0];
  if (!artifact) throw new ProjectError("Artifact not found.");
  const files = await queryRows(
    tx,
    artifactFileSchema,
    "SELECT id,name,media_type,size FROM artifact_files WHERE project_id=$1 AND artifact_id=$2 ORDER BY created_at,id",
    [projectId, artifactId],
  );
  const tasks = await queryRows(
    tx,
    artifactTaskSchema,
    "SELECT id,title,status FROM artifact_tasks WHERE project_id=$1 AND artifact_id=$2 ORDER BY position",
    [projectId, artifactId],
  );
  let markdown: string | null = null;
  if (artifact.kind === "markdown" && files.length) {
    const row = (
      await queryRows(
        tx,
        artifactBytesSchema,
        "SELECT data FROM artifact_files WHERE project_id=$1 AND artifact_id=$2 AND id=$3",
        [projectId, artifactId, required(files[0]).id],
      )
    )[0];
    markdown = Buffer.from(required(row).data).toString("utf8");
  }
  return { ...artifact, tasks, files, markdown };
}
async function lock(
  tx: Queryable,
  person: Actor,
  projectId: string,
  artifactId: string,
  revision: number,
) {
  await membership(tx, person, projectId);
  await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE", [projectId]);
  const current = await detail(tx, projectId, artifactId);
  if (!Number.isSafeInteger(revision) || revision !== current.revision)
    throw new ArtifactConflictError(current);
  return current;
}
function github(input: string) {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/.*)?$/.test(url.pathname) ||
      /\/(\.\.?)(\/|$)/.test(url.pathname)
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new ProjectError("Use an HTTPS GitHub repository, release, or source link.");
  }
}
async function stageFlow(tx: Queryable, projectId: string, stageId: string | null) {
  if (!stageId) return null;
  const row = (
    await queryRows(
      tx,
      selectedFlowSchema.pick({ flow_id: true }),
      "SELECT flow_id FROM project_flows WHERE project_id=$1",
      [projectId],
    )
  )[0];
  if (!row || !flows[row.flow_id]?.stages.some((stage) => stage.id === stageId))
    throw new ProjectError("Choose a stage from this project.");
  return row.flow_id;
}
function ready(kind: ArtifactKind, status: string, githubUrl: string | null, fileCount: number) {
  if (status !== "ready") return;
  if (kind === "software" && !githubUrl)
    throw new ProjectError("Add a GitHub link before marking software ready.");
  if (kind !== "software" && !fileCount)
    throw new ProjectError(
      "Upload the required image or Markdown file before marking this artifact ready.",
    );
}
async function updated(tx: Queryable, person: Actor, projectId: string, artifactId: string) {
  await tx.query(
    "UPDATE project_artifacts SET revision=revision+1,updated_at=now(),updated_by=$3 WHERE project_id=$1 AND id=$2",
    [projectId, artifactId, person.userId],
  );
  await recordActivity(tx, person, projectId, "artifact_updated");
  return detail(tx, projectId, artifactId);
}
export function artifactService(db: Database) {
  return {
    async list(person: Actor, projectId?: string) {
      if (!person.userId) throw new ProjectError("Sign in first.");
      return db.transaction(async (tx) => {
        if (projectId) await membership(tx, person, projectId);
        return (
          await queryRows(
            tx,
            artifactRowSchema.extend({
              task_count: z.number().int().nonnegative(),
              done_task_count: z.number().int().nonnegative(),
              cover_id: z.uuid().nullable(),
              file_count: z.number().int().nonnegative(),
            }),
            `SELECT ${columns},
        (SELECT count(*)::int FROM artifact_tasks t WHERE t.project_id=a.project_id AND t.artifact_id=a.id) AS task_count,
        (SELECT count(*)::int FROM artifact_tasks t WHERE t.project_id=a.project_id AND t.artifact_id=a.id AND t.status='done') AS done_task_count,
        (SELECT f.id FROM artifact_files f WHERE f.project_id=a.project_id AND f.artifact_id=a.id AND f.media_type::text LIKE 'image/%' ORDER BY f.created_at,f.id LIMIT 1) AS cover_id,
        (SELECT count(*)::int FROM artifact_files f WHERE f.project_id=a.project_id AND f.artifact_id=a.id) AS file_count
        FROM project_artifacts a JOIN projects p ON p.id=a.project_id
        JOIN project_memberships m ON m.project_id=a.project_id AND m.user_id=$1
        WHERE ($2::uuid IS NULL OR a.project_id=$2) ORDER BY a.updated_at DESC,a.id`,
            [person.userId, projectId ?? null],
          )
        ).map((item) => ({
          ...item,
          stage_name: item.flow_id
            ? (flows[item.flow_id]?.stages.find((stage) => stage.id === item.stage_id)?.name ??
              null)
            : null,
        }));
      });
    },
    get: (person: Actor, projectId: string, artifactId: string) =>
      db.transaction(async (tx) => {
        await membership(tx, person, projectId);
        await tx.query("SELECT id FROM projects WHERE id=$1 FOR SHARE", [projectId]);
        return detail(tx, projectId, artifactId);
      }),
    create: (person: Actor, projectId: string, input: unknown) =>
      db.transaction(async (tx) => {
        await membership(tx, person, projectId);
        await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE", [projectId]);
        const parsed = metadata.extend({ kind: artifactKindSchema }).safeParse(input);
        if (!parsed.success)
          throw new ProjectError("Check the artifact name, description, and type.");
        const data = parsed.data,
          url = github(data.githubUrl);
        if (url && data.kind !== "software")
          throw new ProjectError("Only software artifacts use a GitHub link.");
        ready(data.kind, data.status, url, 0);
        if (
          required(
            (
              await queryRows(
                tx,
                countSchema,
                "SELECT count(*)::int AS count FROM project_artifacts WHERE project_id=$1",
                [projectId],
              )
            )[0],
          ).count >= 200
        )
          throw new ProjectError("This project has reached the 200-artifact limit.");
        const flowId = await stageFlow(tx, projectId, data.stageId),
          id = randomUUID();
        await tx.query(
          "INSERT INTO project_artifacts(id,project_id,flow_id,stage_id,name,description,kind,status,github_url,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)",
          [
            id,
            projectId,
            flowId,
            data.stageId,
            data.name,
            data.description,
            data.kind,
            data.status,
            url,
            person.userId,
          ],
        );
        await recordActivity(tx, person, projectId, "artifact_created");
        return id;
      }),
    save: (
      person: Actor,
      projectId: string,
      artifactId: string,
      revision: number,
      input: unknown,
    ) =>
      db.transaction(async (tx) => {
        const current = await lock(tx, person, projectId, artifactId, revision);
        const parsed = metadata.safeParse(input);
        if (!parsed.success)
          throw new ProjectError("Check the artifact name, description, and type.");
        const data = parsed.data,
          url = github(data.githubUrl);
        if (url && current.kind !== "software")
          throw new ProjectError("Only software artifacts use a GitHub link.");
        ready(current.kind, data.status, url, current.files.length);
        const flowId = await stageFlow(tx, projectId, data.stageId);
        await tx.query(
          "UPDATE project_artifacts SET name=$3,description=$4,flow_id=$5,stage_id=$6,status=$7,github_url=$8 WHERE project_id=$1 AND id=$2",
          [
            projectId,
            artifactId,
            data.name,
            data.description,
            flowId,
            data.stageId,
            data.status,
            url,
          ],
        );
        return updated(tx, person, projectId, artifactId);
      }),
    tasks: (
      person: Actor,
      projectId: string,
      artifactId: string,
      revision: number,
      input: unknown,
    ) =>
      db.transaction(async (tx) => {
        await lock(tx, person, projectId, artifactId, revision);
        const parsed = tasksSchema.safeParse(input);
        if (!parsed.success)
          throw new ProjectError(
            "Use up to 100 artifact tasks with titles of up to 300 characters.",
          );
        const ids = parsed.data.map((task) => task.id);
        await tx.query(
          "DELETE FROM artifact_tasks WHERE project_id=$1 AND artifact_id=$2 AND NOT (id=ANY($3::uuid[]))",
          [projectId, artifactId, ids],
        );
        await tx.query(
          `INSERT INTO artifact_tasks(project_id,artifact_id,id,position,title,status)
      SELECT $1,$2,id,position,title,status::task_status FROM jsonb_to_recordset($3::jsonb) AS tasks(id uuid,position integer,title text,status text)
      ON CONFLICT(project_id,artifact_id,id) DO UPDATE SET position=EXCLUDED.position,title=EXCLUDED.title,status=EXCLUDED.status`,
          [
            projectId,
            artifactId,
            JSON.stringify(parsed.data.map((task, position) => ({ ...task, position }))),
          ],
        );
        return updated(tx, person, projectId, artifactId);
      }),
    upload: (
      person: Actor,
      projectId: string,
      artifactId: string,
      revision: number,
      file: { name: string; data: Uint8Array },
    ) =>
      db.transaction(async (tx) => {
        const current = await lock(tx, person, projectId, artifactId, revision);
        let name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 180);
        if (!name || !file.data.length || file.data.length > 2 * 1024 * 1024)
          throw new ProjectError("Choose a file up to 2 MB.");
        let mediaType: ArtifactMediaType;
        if (current.kind === "software")
          throw new ProjectError("Software artifacts use a GitHub link.");
        if (current.kind === "markdown") {
          if (!/\.(md|markdown)$/i.test(name) || file.data.length > 512_000)
            throw new ProjectError("Choose a UTF-8 Markdown file up to 500 KB.");
          try {
            const text = new TextDecoder("utf-8", { fatal: true }).decode(file.data);
            if (!text.trim() || text.includes("\0")) throw new Error();
          } catch {
            throw new ProjectError("Choose a UTF-8 Markdown file up to 500 KB.");
          }
          mediaType = "text/markdown";
          await tx.query("DELETE FROM artifact_files WHERE project_id=$1 AND artifact_id=$2", [
            projectId,
            artifactId,
          ]);
        } else {
          if (current.files.length >= 6)
            throw new ProjectError("An image artifact can contain up to six images.");
          try {
            const sharp = (await import("sharp")).default;
            const image = await sharp(file.data, { limitInputPixels: 40_000_000 }).metadata();
            const types: Partial<Record<string, ArtifactMediaType>> = {
              png: "image/png",
              jpeg: "image/jpeg",
              webp: "image/webp",
              gif: "image/gif",
            };
            const detectedType = types[image.format ?? ""];
            if (
              !detectedType ||
              !image.width ||
              !image.height ||
              image.width * (image.pageHeight ?? image.height) * (image.pages ?? 1) > 40_000_000
            )
              throw new Error();
            mediaType = detectedType;
            const extension = image.format === "jpeg" ? "jpg" : required(image.format);
            if (
              !(
                image.format === "jpeg" ? /\.jpe?g$/i : new RegExp("\\." + extension + "$", "i")
              ).test(name)
            )
              name = name.replace(/\.[^.]*$/, "").slice(0, 170) + "." + extension;
          } catch {
            throw new ProjectError("Choose a valid PNG, JPEG, WebP, or GIF image up to 2 MB.");
          }
        }
        await tx.query(
          "INSERT INTO artifact_files(id,project_id,artifact_id,name,media_type,data,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            randomUUID(),
            projectId,
            artifactId,
            name,
            mediaType,
            Buffer.from(file.data),
            person.userId,
          ],
        );
        return updated(tx, person, projectId, artifactId);
      }),
    removeFile: (
      person: Actor,
      projectId: string,
      artifactId: string,
      revision: number,
      fileId: string,
    ) =>
      db.transaction(async (tx) => {
        const current = await lock(tx, person, projectId, artifactId, revision);
        if (!current.files.some((file) => file.id === fileId))
          throw new ProjectError("Artifact file not found.");
        ready(current.kind, current.status, current.github_url, current.files.length - 1);
        await tx.query(
          "DELETE FROM artifact_files WHERE project_id=$1 AND artifact_id=$2 AND id=$3",
          [projectId, artifactId, fileId],
        );
        return updated(tx, person, projectId, artifactId);
      }),
    file: (person: Actor, projectId: string, artifactId: string, fileId: string) =>
      db.transaction(async (tx) => {
        await membership(tx, person, projectId);
        if (!uuid.safeParse(artifactId).success || !uuid.safeParse(fileId).success)
          throw new ProjectError("Artifact file not found.");
        const row = (
          await queryRows(
            tx,
            artifactFileSchema.extend({ data: z.instanceof(Uint8Array) }),
            "SELECT id,name,media_type,size,data FROM artifact_files WHERE project_id=$1 AND artifact_id=$2 AND id=$3",
            [projectId, artifactId, fileId],
          )
        )[0];
        if (!row) throw new ProjectError("Artifact file not found.");
        return row;
      }),
    remove: (
      person: Actor,
      projectId: string,
      artifactId: string,
      revision: number,
      confirmation: string,
    ) =>
      db.transaction(async (tx) => {
        const current = await lock(tx, person, projectId, artifactId, revision);
        if (confirmation !== current.name)
          throw new ProjectError("Enter the exact artifact name to delete it.");
        await tx.query("DELETE FROM project_artifacts WHERE project_id=$1 AND id=$2", [
          projectId,
          artifactId,
        ]);
        await recordActivity(tx, person, projectId, "artifact_deleted");
      }),
  };
}
