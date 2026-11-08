import { z } from "zod";
import { zones } from "../shirts/design";
const layerSchema = z.object({
  id: z.uuid(),
  fileId: z.uuid(),
  zone: z.enum(zones),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.05).max(1),
  rotation: z.number().int().min(-180).max(180),
});
export const layoutSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  blank: z.string().trim().max(180),
  notes: z.string().trim().max(2000),
  layers: z
    .array(layerSchema)
    .max(32)
    .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length),
});
export const shirtSchema = z.object({
  collection: z.string().trim().min(1).max(80),
  layout: layoutSchema,
});
export type ShirtDesign = z.infer<typeof shirtSchema>;
export type ShirtLayer = z.infer<typeof layerSchema>;
