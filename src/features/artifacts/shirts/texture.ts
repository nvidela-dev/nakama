import { panels, type ShirtLayer, type Zone } from "./design";
export type Point = [number, number];
export type Stroke = NonNullable<ShirtLayer["strokes"]>[number];
export type TextureTool = "move" | "paint" | "erase";
export type SurfaceHit = { zone: Zone; x: number; y: number };
export const maxStrokes = 96,
  maxPoints = 256,
  maxDesignPoints = 16000;

export function layerPoint(hit: SurfaceHit, layer: ShirtLayer, image: HTMLImageElement): Point {
  const panel = panels[hit.zone],
    a = (-layer.rotation * Math.PI) / 180;
  const dx = hit.x - layer.x,
    dy = ((hit.y - layer.y) * panel.height) / panel.width;
  const x = 0.5 + (dx * Math.cos(a) - dy * Math.sin(a)) / layer.width;
  const y =
    0.5 +
    ((dx * Math.sin(a) + dy * Math.cos(a)) * image.naturalWidth) /
      (layer.width * image.naturalHeight);
  return [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000];
}
export const inside = ([x, y]: Point) => x >= 0 && x <= 1 && y >= 0 && y <= 1;

// Both ray picking and texture painting use this rectangle in top-left atlas coordinates.
export function printRect(zone: Zone) {
  const sleeve = zone.endsWith("sleeve"),
    w = sleeve ? 10 / 64 : 30 / 54,
    h = sleeve ? 10 / 23 : 40 / 72;
  return { x: (1 - w) / 2, y: sleeve ? 1 - 12 / 23 : zone === "chest" ? 16 / 72 : 12 / 72, w, h };
}
