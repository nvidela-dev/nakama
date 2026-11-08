"use client";
import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from "react";
import Image from "next/image";
import { Button, ToolbarAction } from "@/shared/ui/button";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { Panel } from "@/shared/ui/panel";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
import { artifactFileUrl, type ArtifactDetail } from "../model";
import { zones, panels, type Zone, type ShirtLayer, type ShirtDesign } from "./design";
import { drawPanel, loadArt, downloadPrintPack, type ArtImages } from "./print";
import { ShirtPreview } from "./preview";

const colors = ["#e8e4da", "#f8f8f4", "#282a2b", "#6b765e", "#4b6473", "#884d44"];
const assetType = "application/x-nakama-artwork";
export function ShirtStudio({
  artifact,
  design,
  onChange,
  pending,
  dirty,
  onSave,
  onUpload,
  onRemove,
}: {
  artifact: ArtifactDetail;
  design: ShirtDesign;
  onChange: (d: ShirtDesign) => void;
  pending: boolean;
  dirty: boolean;
  onSave: () => void;
  onUpload: (files: File[], placed?: (id: string) => void) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT(),
    canvas = useRef<HTMLCanvasElement>(null),
    picker = useRef<HTMLInputElement>(null);
  const [zone, setZone] = useState<Zone>("chest"),
    [selected, setSelected] = useState(""),
    [drag, setDrag] = useState(false);
  const [images, setImages] = useState<ArtImages>(new Map()),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false);
  const layer = design.layout.layers.find((l) => l.id === selected && l.zone === zone);
  const panel = panels[zone],
    layers = design.layout.layers.filter((l) => l.zone === zone);
  const [imageError, setImageError] = useState(false);
  const fileKeys = artifact.files.map((f) => f.id).join(",");
  useEffect(() => {
    let active = true;
    Promise.allSettled(
      fileKeys
        .split(",")
        .filter(Boolean)
        .map(
          async (id) =>
            [id, await loadArt(artifactFileUrl(artifact.project_id, artifact.id, id))] as const,
        ),
    ).then((results) => {
      if (!active) return;
      setImages(new Map(results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))));
      setImageError(results.some((r) => r.status === "rejected"));
    });
    return () => {
      active = false;
    };
  }, [fileKeys, artifact.project_id, artifact.id]);
  useEffect(() => {
    if (canvas.current) drawPanel(canvas.current, design.layout, zone, images, 480);
  }, [design, zone, images]);
  const patch = (data: Partial<ShirtDesign["layout"]>) =>
    onChange({ ...design, layout: { ...design.layout, ...data } });
  const replace = (id: string, data: Partial<ShirtLayer>) =>
    patch({ layers: design.layout.layers.map((l) => (l.id === id ? { ...l, ...data } : l)) });
  function place(fileId: string, target: Zone, x = 0.5, y = 0.5) {
    if (design.layout.layers.length >= 32) {
      setError("A design supports 32 placements.");
      return;
    }
    const item = { id: crypto.randomUUID(), fileId, zone: target, x, y, width: 0.58, rotation: 0 };
    patch({ layers: [...design.layout.layers, item] });
    setZone(target);
    setSelected(item.id);
    setError("");
  }
  function drop(event: DragEvent<HTMLElement>, target: Zone, position = false) {
    event.preventDefault();
    const file = event.dataTransfer.getData(assetType);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = position ? (event.clientX - rect.left) / rect.width : 0.5,
      y = position ? (event.clientY - rect.top) / rect.height : 0.5;
    if (artifact.files.some((f) => f.id === file)) place(file, target, x, y);
    else if (event.dataTransfer.files.length) {
      // A panel drop places the first file; batch uploads belong in the artwork tray.
      onUpload([event.dataTransfer.files[0]!], (id) => place(id, target, x, y));
    }
  }
  function position(event: PointerEvent<HTMLCanvasElement>) {
    if (!layer || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    replace(layer.id, {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    });
  }
  async function exportPack() {
    setExporting(true);
    setError("");
    try {
      await downloadPrintPack(artifact);
    } catch {
      setError("The print pack could not be downloaded. Try again.");
    } finally {
      setExporting(false);
    }
  }
  const currentImage = layer && images.get(layer.fileId);
  return (
    <section aria-label={t("Shirt studio")} className="min-w-0 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{t("Shirt studio")}</h2>
          <small className="text-muted">
            {artifact.project_name} / {design.collection}
          </small>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <small aria-live="polite">{t(dirty ? "Unsaved placements" : "Saved design")}</small>
          <Button disabled={!dirty || !design.collection.trim() || pending} onClick={onSave}>
            {t("Save design")}
          </Button>
          <Button
            variant="secondary"
            disabled={dirty || pending || !artifact.shirt?.layout.layers.length}
            pending={exporting}
            onClick={exportPack}
          >
            {t("Download print pack")}
          </Button>
        </div>
      </div>
      <fieldset disabled={pending} className="min-w-0 grid gap-3 border-0 p-0 m-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)] items-start">
          <div className="min-w-0 grid gap-2">
            <ShirtPreview design={design} zone={zone} images={images} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1" aria-label={t("Print areas")}>
              {zones.map((z) => (
                <Button
                  key={z}
                  size="small"
                  variant={z === zone ? "primary" : "secondary"}
                  aria-pressed={z === zone}
                  onClick={() => {
                    setZone(z);
                    setSelected(design.layout.layers.filter((l) => l.zone === z).at(-1)?.id ?? "");
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => drop(e, z)}
                >
                  {t(panels[z].label)} · {design.layout.layers.filter((l) => l.zone === z).length}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap py-1">
              <span className="text-xs text-muted">{t("Garment colour")}</span>
              {colors.map((color) => (
                <Button
                  key={color}
                  shape="circle"
                  size="small"
                  variant="secondary"
                  aria-label={t("Garment colour") + " " + color}
                  aria-pressed={design.layout.color === color}
                  style={{ background: color, color: color === "#282a2b" ? "white" : "#15221f" }}
                  onClick={() => patch({ color })}
                >
                  {design.layout.color === color && <Icon name="answered" />}
                </Button>
              ))}
              <Input
                type="color"
                aria-label={t("Custom garment colour")}
                value={design.layout.color}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </div>
          </div>
          <Panel aria-label={t("Placement editor")}>
            <div className="flex justify-between items-baseline gap-2 mb-2">
              <h3 className="font-semibold">{t(panel.label)}</h3>
              <small className="text-muted tabular-nums">
                {panel.width} × {panel.height} cm
              </small>
            </div>
            <div className="grid place-items-center rounded-md border border-line bg-bg p-3">
              <canvas
                ref={canvas}
                aria-label={t("Print area preview")}
                style={{
                  background: design.layout.color,
                  aspectRatio: panel.width / panel.height,
                  height: "clamp(140px,22vh,230px)",
                  maxWidth: "100%",
                  touchAction: "none",
                }}
                className="border border-dashed border-slate-500 cursor-crosshair"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, zone, true)}
                onPointerDown={(e) => {
                  if (layer) {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    position(e);
                  }
                }}
                onPointerMove={position}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }}
              />
            </div>
            {!layers.length && (
              <p className="text-xs text-muted mt-2">
                {t("Drop artwork here or select it from the tray.")}
              </p>
            )}
            {!!layers.length && (
              <div className="grid gap-2 mt-2">
                <Select
                  aria-label={t("Artwork layer")}
                  value={layer?.id ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">{t("Select a layer")}</option>
                  {layers.map((l, i) => (
                    <option key={l.id} value={l.id}>
                      {i + 1} · {artifact.files.find((f) => f.id === l.fileId)?.name}
                    </option>
                  ))}
                </Select>
                {layer && (
                  <>
                    {(["x", "y", "width", "rotation"] as const).map((key) => {
                      const angle = key === "rotation",
                        horizontal = key !== "y",
                        max = angle ? 180 : horizontal ? panel.width : panel.height;
                      const val = angle ? layer.rotation : Math.round(layer[key] * max * 10) / 10;
                      return (
                        <label
                          key={key}
                          className="grid grid-cols-[6em_1fr_4em] items-center gap-1 text-xs"
                        >
                          <span>
                            {t(
                              {
                                x: "Centre X",
                                y: "Centre Y",
                                width: "Print width",
                                rotation: "Rotation",
                              }[key],
                            )}
                          </span>
                          <Input
                            type="range"
                            min={angle ? -180 : key === "width" ? max * 0.05 : 0}
                            max={max}
                            step={angle ? 1 : 0.1}
                            value={val}
                            onChange={(e) =>
                              replace(layer.id, {
                                [key]: angle ? +e.target.value : +e.target.value / max,
                              })
                            }
                          />
                          <span className="text-right tabular-nums">
                            {val}
                            {angle ? "°" : " cm"}
                          </span>
                        </label>
                      );
                    })}
                    <div className="flex items-center justify-between gap-2">
                      <small>
                        {currentImage &&
                          Math.round(
                            (currentImage.naturalWidth * 2.54) / (panel.width * layer.width),
                          ) + " PPI"}
                      </small>
                      <div>
                        <ToolbarAction
                          label={t("Bring to front")}
                          disabled={layers.at(-1)?.id === layer.id}
                          onClick={() =>
                            patch({
                              layers: [
                                ...design.layout.layers.filter((l) => l.id !== layer.id),
                                layer,
                              ],
                            })
                          }
                        >
                          <Icon name="arrowUp" />
                        </ToolbarAction>
                        <ToolbarAction
                          label={t("Remove placement")}
                          onClick={() => {
                            patch({
                              layers: design.layout.layers.filter((l) => l.id !== layer.id),
                            });
                            setSelected("");
                          }}
                        >
                          <Icon name="delete" />
                        </ToolbarAction>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Panel>
        </div>
        <Panel aria-label={t("Artwork tray")}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{t("Artwork tray")}</h3>
            <small>
              {artifact.files.length}/6 · 2 MB {t("per file")}
            </small>
          </div>
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,130px),1fr))]">
            <Button
              variant="secondary"
              style={{
                height: 100,
                borderStyle: "dashed",
                background: drag ? "#e1e8e3" : undefined,
              }}
              onClick={() => picker.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                onUpload(Array.from(e.dataTransfer.files));
              }}
              disabled={artifact.files.length >= 6}
            >
              <span className="grid place-items-center gap-2">
                <Icon name="plus" />
                {t("Drop artwork")}
              </span>
            </Button>
            <Input
              ref={picker}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-label={t("Upload artwork")}
              hidden
              onChange={(e) => {
                onUpload(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            {artifact.files.map((file) => (
              <div key={file.id} className="relative min-w-0">
                <Button
                  variant="secondary"
                  className="w-full"
                  style={{ height: 100, padding: 5 }}
                  aria-label={t("Place artwork") + " " + file.name}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(assetType, file.id)}
                  onClick={() => place(file.id, zone)}
                >
                  <span className="grid min-w-0 place-items-center gap-1">
                    <Image
                      unoptimized
                      width={64}
                      height={56}
                      alt=""
                      src={artifactFileUrl(artifact.project_id, artifact.id, file.id)}
                      className="max-w-full h-14 object-contain"
                    />
                    <small className="truncate max-w-full">{file.name}</small>
                  </span>
                </Button>
                {!design.layout.layers.some((l) => l.fileId === file.id) && (
                  <div className="absolute right-0 top-0">
                    <ToolbarAction
                      label={t("Delete artwork") + " " + file.name}
                      onClick={() => {
                        if (window.confirm(t("Delete unused artwork?"))) onRemove(file.id);
                      }}
                    >
                      <Icon name="delete" size={13} />
                    </ToolbarAction>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              {t("Collection")}
              <Input
                value={design.collection}
                maxLength={80}
                onChange={(e) => onChange({ ...design, collection: e.target.value })}
              />
            </label>
            <label>
              {t("Blank and sample size")}
              <Input
                value={design.layout.blank}
                maxLength={180}
                onChange={(e) => patch({ blank: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              {t("Printer notes")}
              <Textarea
                rows={2}
                maxLength={2000}
                value={design.layout.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </label>
          </div>
        </Panel>
      </fieldset>
      {(error || imageError) && (
        <p role="alert">{t(error || "Some artwork could not be previewed.")}</p>
      )}
    </section>
  );
}
