"use client";
import { useEffect, useRef, useState } from "react";
import type { ShirtDesign, ShirtLayer } from "./design";
import type { ArtImages } from "./print";
import {
  inside,
  layerPoint,
  maxDesignPoints,
  maxPoints,
  maxStrokes,
  type TextureTool,
  type Stroke,
  type SurfaceHit,
} from "./texture";

export function useTextureBrush(
  design: ShirtDesign,
  images: ArtImages,
  selected: string,
  onChange: (design: ShirtDesign) => void,
  onSelect: (l: ShirtLayer) => void,
  onError: (s: string) => void,
) {
  const [tool, setTool] = useState<TextureTool>("move"),
    [color, setColor] = useState("#df5638"),
    [size, setSize] = useState(8);
  type Mark = { layer: ShirtLayer; stroke: Stroke };
  const drag = useRef<Mark | null>(null),
    frame = useRef(0),
    [preview, setPreview] = useState<Mark | null>(null);
  const [undone, setUndone] = useState<{ id: string; strokes: Stroke[] } | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function withStrokes(layer: ShirtLayer, strokes: Stroke[]): ShirtDesign {
    return {
      ...design,
      layout: {
        ...design.layout,
        layers: design.layout.layers.map((l) => (l.id === layer.id ? { ...l, strokes } : l)),
      },
    };
  }
  function begin(hit: SurfaceHit) {
    if (tool === "move" || drag.current) return false;
    if (!inside([hit.x, hit.y])) {
      onError("Start the stroke on placed artwork.");
      return false;
    }
    const layers = design.layout.layers.filter((l) => l.zone === hit.zone).reverse();
    const preferred = layers.find((l) => l.id === selected);
    const layer = [...(preferred ? [preferred] : []), ...layers].find((l) => {
      const img = images.get(l.fileId);
      return img && inside(layerPoint(hit, l, img));
    });
    if (!layer) {
      onError("Start the stroke on placed artwork.");
      return false;
    }
    if ((layer.strokes?.length ?? 0) >= maxStrokes) {
      onError("This layer has reached its stroke limit.");
      return false;
    }
    const pointCount = design.layout.layers.reduce(
      (total, l) => total + (l.strokes ?? []).reduce((n, s) => n + s.points.length, 0),
      0,
    );
    if (pointCount + maxPoints > maxDesignPoints) {
      onError("This design has reached its brush detail limit.");
      return false;
    }
    onError("");
    drag.current = {
      layer,
      stroke: {
        tool,
        color,
        size: size / 100,
        points: [layerPoint(hit, layer, images.get(layer.fileId)!)],
      },
    };
    setPreview(drag.current);
    return true;
  }
  function move(hit: SurfaceHit | null) {
    const current = drag.current;
    if (!current) return;
    if (!hit || hit.zone !== current.layer.zone || !inside([hit.x, hit.y])) {
      finish();
      return;
    }
    const point = layerPoint(hit, current.layer, images.get(current.layer.fileId)!);
    const previous = current.stroke.points.at(-1)!;
    if (!inside(point)) {
      finish();
      return;
    }
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.002) return;
    let points = current.stroke.points;
    if (points.length === maxPoints) points = points.filter((_, index) => index % 2 === 0);
    drag.current = { ...current, stroke: { ...current.stroke, points: [...points, point] } };
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setPreview(drag.current);
      });
  }
  function finish(cancel = false) {
    const current = drag.current;
    if (!current) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drag.current = null;
    setPreview(null);
    if (cancel) return;
    onChange(withStrokes(current.layer, [...(current.layer.strokes ?? []), current.stroke]));
    onSelect(current.layer);
    setUndone(null);
  }
  const layer = design.layout.layers.find((l) => l.id === selected);
  function undo() {
    if (!layer?.strokes?.length) return;
    setUndone({
      id: layer.id,
      strokes: [...(undone?.id === layer.id ? undone.strokes : []), layer.strokes.at(-1)!],
    });
    onChange(withStrokes(layer, layer.strokes.slice(0, -1)));
  }
  function redo() {
    if (!layer || !undone || undone.id !== layer.id || !undone.strokes.length) return;
    onChange(withStrokes(layer, [...(layer.strokes ?? []), undone.strokes.at(-1)!]));
    setUndone({ ...undone, strokes: undone.strokes.slice(0, -1) });
  }
  return {
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    begin,
    move,
    finish,
    undo,
    redo,
    canUndo: !!layer?.strokes?.length,
    canRedo: !!undone && undone.id === selected && !!undone.strokes.length,
    drawing: !!preview,
    display: preview
      ? withStrokes(preview.layer, [...(preview.layer.strokes ?? []), preview.stroke])
      : design,
  };
}
export type TextureBrush = ReturnType<typeof useTextureBrush>;
