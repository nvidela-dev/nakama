import type { ShirtDesign, Zone } from "./design";
export type { PanelStroke } from "../server/shirt-schema";
export type Point = [number, number];
export type TextureTool = "move" | "paint" | "erase";
export type SurfaceHit = { zone: Zone; x: number; y: number };
export const maxStrokes = 96,
  maxPoints = 256,
  maxDesignPoints = 16000;
export type Artwork = Pick<ShirtDesign["layout"], "layers" | "ink">;

export function printStack(layout: Artwork, zone: Zone) {
  // Older designs use array order for images. Stable sorting keeps those layers together.
  return [
    ...layout.layers.filter((l) => l.zone === zone),
    ...(layout.ink ?? []).filter((s) => s.zone === zone),
  ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export function nextPrintOrder(layout: Artwork) {
  return (
    Math.max(
      0,
      ...layout.layers.map((l) => l.order ?? 0),
      ...(layout.ink ?? []).map((s) => s.order),
    ) + 1
  );
}
export function hasPrint(layout: Artwork, zone?: Zone) {
  return (
    layout.layers.some((l) => !zone || l.zone === zone) ||
    !!layout.ink?.some((s) => s.tool === "paint" && (!zone || s.zone === zone))
  );
}
export const inside = ([x, y]: Point) => x >= 0 && x <= 1 && y >= 0 && y <= 1;
export function printRect(zone: Zone) {
  const sleeve = zone.endsWith("sleeve"),
    w = sleeve ? 10 / 64 : 30 / 54,
    h = sleeve ? 10 / 23 : 40 / 72;
  return { x: (1 - w) / 2, y: sleeve ? 1 - 12 / 23 : zone === "chest" ? 16 / 72 : 12 / 72, w, h };
}
