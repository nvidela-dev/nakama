"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/shared/i18n/provider";
import { panels, type ShirtDesign, type Zone } from "./design";
import { drawPanel, type ArtImages } from "./print";
import type { mountGarment } from "./garment";
export function ShirtPreview({
  design,
  zone,
  images,
}: {
  design: ShirtDesign;
  zone: Zone;
  images: ArtImages;
}) {
  const t = useT(),
    host = useRef<HTMLDivElement>(null),
    scene = useRef<ReturnType<typeof mountGarment> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "flat">("loading");
  const fallback = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    import("./garment")
      .then(({ mountGarment }) => {
        if (disposed || !host.current) return;
        scene.current = mountGarment(host.current);
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("flat");
      });
    return () => {
      disposed = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.view(zone);
  }, [zone, state]);
  useEffect(() => {
    scene.current?.paint(design, images);
    if (fallback.current) drawPanel(fallback.current, design.layout, zone, images, 480);
  }, [design, zone, images, state]);
  return (
    <div
      className="relative grid place-items-center overflow-hidden rounded-lg border border-line bg-[radial-gradient(ellipse_at_center,#f7f5ee_0%,#dadfdc_85%)]"
      style={{ height: "clamp(300px,49vh,550px)" }}
    >
      <div
        ref={host}
        role="img"
        aria-label={t("Rotatable shirt preview")}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />
      {state === "flat" && (
        <canvas
          ref={fallback}
          aria-label={t("Flat print preview")}
          className="relative max-w-[75%] max-h-[76%]"
          style={{ background: design.layout.color }}
        />
      )}
      <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700">
        {t(panels[zone].label)} · {state === "flat" ? "2D" : "3D"}
      </span>
      <small className="absolute bottom-3 rounded-full bg-white/90 px-3 py-1 text-slate-700 pointer-events-none">
        {t(
          state === "loading"
            ? "Loading preview…"
            : state === "flat"
              ? "Flat print preview"
              : "Drag to rotate · scroll or pinch to zoom",
        )}
      </small>
    </div>
  );
}
