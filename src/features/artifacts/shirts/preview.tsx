"use client";
import { useEffect, useRef, useState, useImperativeHandle, type Ref, type DragEvent } from "react";
import { useT } from "@/shared/i18n/provider";
import { panels, type ShirtDesign, type Zone } from "./design";
import type { ArtImages } from "./print";
import type { mountGarment } from "./garment";
import { flatShirt, flatHit } from "./flat-shirt";
import type { SurfaceHit } from "./texture";
import type { TextureBrush } from "./use-texture-brush";
export type PreviewHandle = { snapshot: () => string | undefined };
export function ShirtPreview({
  design,
  zone,
  images,
  ref,
  brush,
  onDrop,
  disabled,
}: {
  design: ShirtDesign;
  zone: Zone;
  images: ArtImages;
  ref: Ref<PreviewHandle>;
  brush: TextureBrush;
  disabled: boolean;
  onDrop: (event: DragEvent<HTMLElement>, hit: SurfaceHit) => void;
}) {
  const t = useT(),
    host = useRef<HTMLDivElement>(null),
    fallback = useRef<HTMLCanvasElement>(null),
    scene = useRef<ReturnType<typeof mountGarment> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "flat">("loading"),
    [over, setOver] = useState<Zone | null>(null);
  const back = zone === "back";
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
  useImperativeHandle(
    ref,
    () => ({
      snapshot() {
        if (!design.layout.layers.every((l) => images.has(l.fileId))) return;
        scene.current?.paint(design, images);
        const url = scene.current?.snapshot();
        if (brush.tool !== "move") scene.current?.paint(design, images, true);
        return url?.startsWith("data:image/webp;base64,") ? url : undefined;
      },
    }),
    [design, images, brush.tool],
  );
  useEffect(() => {
    scene.current?.view(zone);
  }, [zone, state]);
  useEffect(() => {
    scene.current?.rotate(brush.tool === "move" && !disabled);
  }, [brush.tool, state, disabled]);
  useEffect(() => {
    scene.current?.paint(design, images, brush.tool !== "move");
    if (fallback.current)
      flatShirt(fallback.current, design, images, back, brush.tool !== "move" ? zone : undefined);
  }, [design, back, images, state, brush.tool, zone]);
  function pick(x: number, y: number) {
    return (
      scene.current?.pick(x, y) ?? (fallback.current ? flatHit(fallback.current, x, y, back) : null)
    );
  }
  return (
    <div
      className="relative grid place-items-center overflow-hidden rounded-lg border border-line bg-[radial-gradient(ellipse_at_center,#f7f5ee_0%,#dadfdc_85%)]"
      style={{
        height: "clamp(300px,49vh,550px)",
        touchAction: "none",
        cursor: brush.tool === "move" ? "grab" : "crosshair",
      }}
      tabIndex={0}
      aria-label={t("Shirt surface")}
      onDragOver={(e) => {
        e.preventDefault();
        const hit = disabled ? null : pick(e.clientX, e.clientY);
        e.dataTransfer.dropEffect = hit ? "copy" : "none";
        setOver(hit?.zone ?? null);
      }}
      onDragLeave={(e) => {
        if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget))
          setOver(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(null);
        const hit = pick(e.clientX, e.clientY);
        if (!disabled && hit) onDrop(e, hit);
      }}
      onPointerDownCapture={(e) => {
        if (disabled || brush.tool === "move" || e.button !== 0 || !e.isPrimary) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.focus({ preventScroll: true });
        const hit = pick(e.clientX, e.clientY);
        if (brush.begin(hit)) e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          for (const sample of e.nativeEvent.getCoalescedEvents?.() ?? [])
            brush.move(pick(sample.clientX, sample.clientY));
          brush.move(pick(e.clientX, e.clientY));
        }
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          brush.move(pick(e.clientX, e.clientY));
          brush.finish();
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => brush.finish(true)}
      onLostPointerCapture={() => brush.finish()}
    >
      <div
        ref={host}
        role="img"
        aria-label={t("Rotatable shirt preview")}
        className="absolute inset-0"
      />
      {state === "flat" && (
        <canvas
          ref={fallback}
          aria-label={t("Flat shirt preview")}
          className="relative w-[min(100%,480px)] h-auto"
        />
      )}
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700">
        {t(panels[over ?? zone].label)} · {state === "flat" ? "2D" : "3D"}
      </span>
      <small
        aria-live="polite"
        className="absolute bottom-3 rounded-full bg-white/90 px-3 py-1 text-slate-700 pointer-events-none"
      >
        {t(
          over
            ? "Release to place artwork"
            : state === "loading"
              ? "Loading preview…"
              : brush.tool === "move"
                ? "Drop artwork on the shirt · drag to rotate"
                : brush.tool === "erase"
                  ? "Drag to erase print and reveal the fabric"
                  : "Drag to paint inside the print area",
        )}
      </small>
    </div>
  );
}
