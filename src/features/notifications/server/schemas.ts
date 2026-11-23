import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import { id, cursorTimeSchema } from "@/server/database/row-schemas";
export const unreadCommentSchema = z.object({
  id,
  author_name: z.string(),
  content: z.string(),
  created_at: z.date(),
  project_id: id,
  project_name: z.string(),
  stage_id: z.string().nullable(),
  node_id: z.string().nullable(),
  ...cursorTimeSchema.shape,
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_comments"],
    "id" | "author_name" | "content" | "created_at" | "project_id" | "stage_id" | "node_id"
  > & { project_name: string; cursor_time: string }
>;
