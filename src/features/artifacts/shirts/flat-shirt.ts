import { drawPanel, type ArtImages } from "./print";
import type { ShirtDesign, Zone } from "./design";
import type { SurfaceHit } from "./texture";

const outline =
  "M83 19 L118 7 Q141 23 162 7 L198 19 L238 48 L217 83 L192 68 L193 159 Q140 166 86 159 L88 68 L64 83 L43 48 Z";
export function flatShirt(
  canvas: HTMLCanvasElement,
  design: ShirtDesign,
  images: ArtImages,
  back: boolean,
  selected?: Zone,
) {
  canvas.width = 560;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  const shirt = new Path2D(outline);
  ctx.fillStyle = design.layout.color;
  ctx.strokeStyle = "#767b77";
  ctx.fill(shirt);
  ctx.stroke(shirt);
  ctx.clip(shirt);
  const panel = document.createElement("canvas"),
    side = back ? "back" : "chest";
  for (const zone of [side, "left_sleeve", "right_sleeve"] as const) {
    drawPanel(panel, design.layout, zone, images, 240);
    ctx.strokeStyle = "#527079";
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.7;
    if (zone === side) {
      ctx.drawImage(panel, 107, 40, 66, 88);
      if (selected === zone) ctx.strokeRect(107, 40, 66, 88);
    } else {
      const right = (zone === "left_sleeve") !== back;
      ctx.save();
      ctx.translate(right ? 207 : 73, 49);
      ctx.rotate(right ? -0.52 : 0.52);
      ctx.drawImage(panel, -10, -10, 20, 20);
      if (selected === zone) ctx.strokeRect(-10, -10, 20, 20);
      ctx.restore();
    }
  }
}
export function flatHit(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  back: boolean,
): SurfaceHit | null {
  const r = canvas.getBoundingClientRect(),
    x = ((clientX - r.left) * 280) / r.width,
    y = ((clientY - r.top) * 170) / r.height;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.resetTransform();
  const hit = ctx.isPointInPath(new Path2D(outline), x, y);
  ctx.restore();
  if (!hit) return null;
  if (x >= 89 && x <= 191)
    return { zone: back ? "back" : "chest", x: (x - 107) / 66, y: (y - 40) / 88 };
  const right = x > 140,
    zone: Zone = right !== back ? "left_sleeve" : "right_sleeve",
    a = right ? 0.52 : -0.52,
    dx = x - (right ? 207 : 73),
    dy = y - 49;
  return {
    zone,
    x: 0.5 + (dx * Math.cos(a) - dy * Math.sin(a)) / 20,
    y: 0.5 + (dx * Math.sin(a) + dy * Math.cos(a)) / 20,
  };
}
