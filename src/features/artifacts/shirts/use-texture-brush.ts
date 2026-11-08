"use client";
import { useEffect, useRef, useState } from "react";
import type { ShirtDesign, ShirtLayer, Zone } from "./design";
import {
  inside,
  nextPrintOrder,
  hasPrint,
  maxDesignPoints,
  maxPoints,
  maxStrokes,
  type PanelStroke,
  type Point,
  type SurfaceHit,
  type TextureTool,
} from "./texture";

type LegacyStroke = NonNullable<ShirtLayer["strokes"]>[number];
type UndoEntry =
  | { kind: "panel"; mark: PanelStroke }
  | { kind: "image"; id: string; zone: Zone; mark: LegacyStroke };
type Gesture = { mark: PanelStroke | null; gap: boolean; budget: number };
export function useTextureBrush(
  design: ShirtDesign,
  zone: Zone,
  selected: string,
  onChange: (design: ShirtDesign) => void,
  onZone: (zone: Zone) => void,
  onError: (s: string) => void,
) {
  const [tool, setTool] = useState<TextureTool>("move"),
    [color, setColor] = useState("#df5638"),
    [size, setSize] = useState(8);
  const gesture = useRef<Gesture | null>(null),
    frame = useRef(0),
    [preview, setPreview] = useState<PanelStroke | null>(null);
  const [undone, setUndone] = useState<UndoEntry[]>([]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const layout = design.layout,
    ink = layout.ink ?? [];
  const withInk = (marks: PanelStroke[]): ShirtDesign => ({
    ...design,
    layout: { ...layout, ink: marks },
  });
  function begin(hit: SurfaceHit | null) {
    if (tool === "move" || gesture.current) return false;
    const used =
      layout.layers.reduce(
        (n, l) => n + (l.strokes ?? []).reduce((m, s) => m + s.points.length, 0),
        0,
      ) + ink.reduce((n, s) => n + s.paths.reduce((m, p) => m + p.length, 0), 0);
    const budget = Math.min(maxDesignPoints - used, maxPoints);
    if (budget < 1) {
      onError("This design has reached its brush detail limit.");
      return false;
    }
    onError("");
    gesture.current = { mark: null, gap: true, budget };
    move(hit);
    return true;
  }
  function move(hit: SurfaceHit | null) {
    const g = gesture.current;
    if (!g || tool === "move") return;
    if (!hit || !inside([hit.x, hit.y]) || (g.mark && hit.zone !== g.mark.zone)) {
      g.gap = true;
      return;
    }
    const point: Point = [Math.round(hit.x * 10000) / 10000, Math.round(hit.y * 10000) / 10000];
    if (!g.mark) {
      if (tool === "erase" && !hasPrint(layout, hit.zone)) return;
      if (ink.filter((s) => s.zone === hit.zone).length >= maxStrokes) {
        onError("This print area has reached its stroke limit.");
        return;
      }
      g.mark = {
        zone: hit.zone,
        order: nextPrintOrder(layout),
        tool,
        color,
        size: size / 100,
        paths: [[point]],
      };
    } else {
      const lastPath = g.mark.paths.at(-1)!,
        last = lastPath.at(-1)!;
      if (!g.gap && Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.001) return;
      let paths = g.mark.paths;
      if (paths.reduce((n, p) => n + p.length, 0) >= g.budget) {
        // Preserve endpoints and separate excursions outside the panel on long drags.
        paths = paths.map((path) => path.filter((_, i) => i === path.length - 1 || i % 2 === 0));
        if (paths.reduce((n, p) => n + p.length, 0) >= g.budget) return;
      }
      g.mark = {
        ...g.mark,
        paths: g.gap ? [...paths, [point]] : [...paths.slice(0, -1), [...paths.at(-1)!, point]],
      };
    }
    g.gap = false;
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setPreview(gesture.current?.mark ?? null);
      });
  }
  function finish(cancel = false) {
    const g = gesture.current;
    if (!g) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    gesture.current = null;
    setPreview(null);
    if (!cancel && g.mark) {
      onChange(withInk([...ink, g.mark]));
      onZone(g.mark.zone);
      setUndone([]);
    }
  }
  const lastMark = ink.filter((mark) => mark.zone === zone).at(-1);
  const layer = layout.layers.find((l) => l.id === selected && l.zone === zone);
  const legacy = layer?.strokes ?? [];
  const next = undone.at(-1);
  const canRedo =
    !!next &&
    (next.kind === "panel" ? next.mark.zone === zone : next.id === selected && next.zone === zone);
  function changeLegacy(marks: LegacyStroke[]) {
    if (layer)
      onChange({
        ...design,
        layout: {
          ...layout,
          layers: layout.layers.map((l) => (l.id === layer.id ? { ...l, strokes: marks } : l)),
        },
      });
  }
  function undo() {
    if (lastMark) {
      onChange(withInk(ink.filter((mark) => mark !== lastMark)));
      setUndone([...undone, { kind: "panel", mark: lastMark }]);
    } else if (layer && legacy.length) {
      changeLegacy(legacy.slice(0, -1));
      setUndone([...undone, { kind: "image", id: layer.id, zone, mark: legacy.at(-1)! }]);
    }
  }
  function redo() {
    if (!canRedo || !next) return;
    if (next.kind === "panel") onChange(withInk([...ink, next.mark]));
    else changeLegacy([...legacy, next.mark]);
    setUndone(undone.slice(0, -1));
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
    canUndo: !!lastMark || legacy.length > 0,
    canRedo,
    drawing: !!preview,
    display: preview ? withInk([...ink, preview]) : design,
  };
}
export type TextureBrush = ReturnType<typeof useTextureBrush>;
