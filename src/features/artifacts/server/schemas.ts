import { artifactTaskSchema } from "@/shared/contracts/domain-schemas";
import type { ArtifactDetail } from "../model";
import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import {
  artifactKindSchema,
  artifactMediaTypeSchema,
  artifactStatusSchema,
  flowIdSchema,
} from "@/shared/contracts/domain-schemas";
import { id, positive } from "@/server/database/row-schemas";
export const artifactRowSchema = z.object({
  id,
  project_id: id,
  project_name: z.string(),
  flow_id: flowIdSchema.nullable(),
  stage_id: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  kind: artifactKindSchema,
  status: artifactStatusSchema,
  github_url: z.string().nullable(),
  revision: positive,
  updated_at: z.date(),
}) satisfies z.ZodType<
  Omit<DatabaseRows["project_artifacts"], "created_by" | "updated_by" | "created_at"> & {
    project_name: string;
  }
>;
export const artifactFileSchema = z.object({
  id,
  name: z.string(),
  media_type: artifactMediaTypeSchema,
  size: positive,
}) satisfies z.ZodType<Pick<DatabaseRows["artifact_files"], "id" | "name" | "media_type" | "size">>;
export const artifactBytesSchema = z.object({ data: z.instanceof(Uint8Array) }) satisfies z.ZodType<
  Pick<DatabaseRows["artifact_files"], "data">
>;

export const artifactDetailRowSchema = artifactRowSchema.extend({
  files: z.array(artifactFileSchema),
  tasks: z.array(artifactTaskSchema),
}) satisfies z.ZodType<Omit<ArtifactDetail, "markdown" | "shirt">>;
