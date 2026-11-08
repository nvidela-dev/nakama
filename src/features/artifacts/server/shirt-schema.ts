import { z } from "zod";
import { zones } from "../shirts/design";
import { maxStrokes, maxPoints, maxDesignPoints } from "../shirts/texture";
const fraction = z.number().min(0).max(1);
const strokeSchema = z.object({
  tool: z.enum(["paint", "erase"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  size: z.number().min(0.005).max(0.5),
  points: z
    .array(z.tuple([fraction, fraction]))
    .min(1)
    .max(maxPoints),
});
const layerSchema = z.object({
  id: z.uuid(),
  fileId: z.uuid(),
  strokes: z.array(strokeSchema).max(maxStrokes).optional(),
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
    .refine(
      (rows) =>
        rows.reduce(
          (total, l) => total + (l.strokes ?? []).reduce((n, s) => n + s.points.length, 0),
          0,
        ) <= maxDesignPoints,
    )
    .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length),
});
export const shirtSchema = z.object({
  collection: z.string().trim().min(1).max(80),
  layout: layoutSchema,
});
export type ShirtDesign = z.infer<typeof shirtSchema>;
export type ShirtLayer = z.infer<typeof layerSchema>;
