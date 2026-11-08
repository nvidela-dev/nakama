"use client";
import { useEffect, useRef } from "react";
import { artifactFileUrl, type ArtifactCard } from "../model";
import { drawPanel, loadArt } from "./print";

// A flat garment proof in the collection gallery, with private images loaded only as a card approaches the viewport.
export function ShirtCover({ card }: { card: ArtifactCard }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      preview = card.shirt_cover;
    if (!canvas || !preview) return;
    let disposed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const back =
          !preview.layers.some((l) => l.zone === "chest") &&
          preview.layers.some((l) => l.zone === "back");
        const side = back ? "back" : "chest";
        ctx.fillStyle = preview.color;
        ctx.strokeStyle = "#62645b";
        ctx.lineWidth = 1;
        const shirt = new Path2D(
          "M 83 19 L 118 7 Q 141 23 162 7 L 198 19 L 238 48 L 217 83 L 192 68 L 193 159 Q 140 166 86 159 L 88 68 L 64 83 L 43 48 Z",
        );
        ctx.fill(shirt);
        ctx.stroke(shirt);
        ctx.beginPath();
        ctx.moveTo(118, 7);
        ctx.bezierCurveTo(124, back ? 16 : 32, 157, back ? 16 : 32, 162, 7);
        ctx.stroke();
        const layers = preview.layers.filter((l) => l.zone === side || l.zone.endsWith("sleeve"));
        Promise.allSettled(
          [...new Set(layers.map((l) => l.fileId))].map(
            async (id) =>
              [id, await loadArt(artifactFileUrl(card.project_id, card.id, id))] as const,
          ),
        ).then((results) => {
          if (disposed) return;
          const images = new Map(
            results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
          );
          const panel = document.createElement("canvas");
          for (const zone of [side, "left_sleeve", "right_sleeve"] as const) {
            drawPanel(panel, { layers }, zone, images, 240);
            ctx.save();
            ctx.clip(shirt);
            if (zone === side) ctx.drawImage(panel, 107, 40, 66, 88);
            else {
              const right = (zone === "left_sleeve") !== back;
              ctx.translate(right ? 207 : 73, 49);
              ctx.rotate(right ? -0.52 : 0.52);
              ctx.drawImage(panel, -10, -10, 20, 20);
            }
            ctx.restore();
          }
        });
      },
      { rootMargin: "150px" },
    );
    observer.observe(canvas);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [card]);
  return (
    <canvas
      ref={ref}
      aria-label={card.name}
      role="img"
      width={280}
      height={170}
      className="w-full h-full object-contain bg-[#e9eae5] py-2"
    />
  );
}
