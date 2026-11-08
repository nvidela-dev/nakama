import { z } from "zod";
import { zones } from "../shirts/design";
import { maxStrokes, maxPoints, maxDesignPoints } from "../shirts/texture";
const fraction = z.number().min(0).max(1);
const point = z.tuple([fraction, fraction]);
const brush = z.object({
  tool: z.enum(["paint", "erase"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  size: z.number().min(0.005).max(0.5),
});
const order = z.number().int().nonnegative().safe();
const strokeSchema = brush.extend({ points: z.array(point).min(1).max(maxPoints) });
const panelStrokeSchema = brush.extend({
  zone: z.enum(zones),
  order,
  paths: z
    .array(z.array(point).min(1).max(maxPoints))
    .min(1)
    .max(maxPoints)
    .refine((paths) => paths.reduce((n, p) => n + p.length, 0) <= maxPoints),
});
const layerSchema = z.object({
  id: z.uuid(),
  fileId: z.uuid(),
  zone: z.enum(zones),
  order: order.optional(),
  strokes: z.array(strokeSchema).max(maxStrokes).optional(),
  x: fraction,
  y: fraction,
  width: z.number().min(0.05).max(1),
  rotation: z.number().int().min(-180).max(180),
});
export const shirtCoverSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  layers: z
    .array(layerSchema)
    .max(32)
    .refine((layers) => new Set(layers.map((l) => l.id)).size === layers.length),
  ink: z
    .array(panelStrokeSchema)
    .max(maxStrokes * zones.length)
    .optional(),
});
export const layoutSchema = shirtCoverSchema
  .extend({
    blank: z.string().trim().max(180),
    notes: z.string().trim().max(2000),
  })
  .refine((layout) => {
    const imagePoints = layout.layers.reduce(
      (n, l) => n + (l.strokes ?? []).reduce((m, s) => m + s.points.length, 0),
      0,
    );
    return (
      (layout.ink ?? []).reduce(
        (n, s) => n + s.paths.reduce((m, p) => m + p.length, 0),
        imagePoints,
      ) <= maxDesignPoints &&
      zones.every((zone) => (layout.ink ?? []).filter((s) => s.zone === zone).length <= maxStrokes)
    );
  });
export const shirtSchema = z.object({
  collection: z.string().trim().min(1).max(80),
  layout: layoutSchema,
});
export type ShirtDesign = z.infer<typeof shirtSchema>;
export type ShirtLayer = z.infer<typeof layerSchema>;
export type PanelStroke = z.infer<typeof panelStrokeSchema>;
