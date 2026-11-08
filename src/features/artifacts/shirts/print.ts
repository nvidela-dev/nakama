import { artifactFileUrl, type ArtifactDetail } from "../model";
import { panels, zones, type ShirtDesign, type Zone } from "./design";

export function loadArt(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}
export type ArtImages = Map<string, HTMLImageElement>;
export function drawPanel(
  canvas: HTMLCanvasElement,
  layout: Pick<ShirtDesign["layout"], "layers">,
  zone: Zone,
  images: ArtImages,
  width: number,
) {
  const panel = panels[zone];
  canvas.width = width;
  canvas.height = Math.round((width * panel.height) / panel.width);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  for (const layer of layout.layers.filter((l) => l.zone === zone)) {
    const image = images.get(layer.fileId);
    if (!image) continue;
    const w = width * layer.width,
      h = (w * image.naturalHeight) / image.naturalWidth;
    ctx.save();
    ctx.translate(layer.x * width, layer.y * canvas.height);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
// Browser canvases default to 96 DPI. Write PNG pHYs so physical size matches the template.
export async function pngWithDpi(canvas: HTMLCanvasElement, dpi: number): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
  );
  const original = new Uint8Array(await blob.arrayBuffer());
  const chunks: Uint8Array[] = [original.slice(0, 8)];
  const phys = new Uint8Array(21);
  const view = new DataView(phys.buffer);
  view.setUint32(0, 9);
  phys.set([112, 72, 89, 115], 4);
  const ppm = Math.round(dpi / 0.0254);
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  phys[16] = 1;
  view.setUint32(17, crc32(phys.subarray(4, 17)));
  for (let offset = 8; offset < original.length;) {
    const length = new DataView(original.buffer).getUint32(offset);
    const type = String.fromCharCode(...original.slice(offset + 4, offset + 8));
    if (type !== "pHYs") chunks.push(original.slice(offset, offset + length + 12));
    if (type === "IHDR") chunks.push(phys);
    offset += length + 12;
  }
  return new Blob(chunks as BlobPart[], { type: "image/png" });
}
export async function downloadPrintPack(artifact: ArtifactDetail) {
  const design = artifact.shirt;
  if (!design?.layout.layers.length) throw new Error("Place artwork before exporting.");
  const { zipSync, strToU8 } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  const images: ArtImages = new Map();
  const urls: string[] = [];
  // Read each private original once. Use the same decoded bytes for the proofs and the archive.
  try {
    const files = [];
    for (const file of artifact.files.filter((f) =>
      design.layout.layers.some((l) => l.fileId === f.id),
    )) {
      const response = await fetch(artifactFileUrl(artifact.project_id, artifact.id, file.id), {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Artwork could not be downloaded.");
      const blob = await response.blob(),
        url = URL.createObjectURL(blob);
      urls.push(url);
      const image = await loadArt(url);
      images.set(file.id, image);
      const path = "originals/" + file.id + "-" + file.name.replace(/[^\w. -]/g, "_");
      entries[path] = new Uint8Array(await blob.arrayBuffer());
      files.push({
        id: file.id,
        name: file.name,
        path,
        widthPx: image.naturalWidth,
        heightPx: image.naturalHeight,
      });
    }
    const instructions = [
      artifact.project_name + " / " + design.collection,
      artifact.name,
      "Revision " + artifact.revision,
      "Blank / size: " + (design.layout.blank || "Confirm with shop"),
      "Garment colour (sRGB): " + design.layout.color,
      "Production notes: " + design.layout.notes,
      "",
      "Print each transparent PNG at the indicated physical size, 300 pixels per inch. Transparent pixels are unprinted.",
      "Orient artwork as viewed from outside the garment. Left and right are the wearer's sides.",
      "Chest and back: centre the print area horizontally, starting 8 cm below the centre neckline seam. Sleeves: centre on the outer sleeve, with the bottom edge 2 cm above the cuff.",
      "Confirm blank measurements, ink and colour matching with the printer before the production run.",
      "",
    ];
    for (const zone of zones.filter((z) => design.layout.layers.some((l) => l.zone === z))) {
      const { width, height, label } = panels[zone],
        canvas = document.createElement("canvas");
      drawPanel(canvas, design.layout, zone, images, Math.round((width * 300) / 2.54));
      const proof = await pngWithDpi(canvas, 300);
      entries["print/" + zone + ".png"] = new Uint8Array(await proof.arrayBuffer());
      instructions.push(label + " — " + width + " × " + height + " cm");
      for (const l of design.layout.layers.filter((l) => l.zone === zone)) {
        const original = images.get(l.fileId)!;
        const dpi = Math.round((original.naturalWidth * 2.54) / (width * l.width));
        instructions.push(
          "  " + files.find((f) => f.id === l.fileId)?.name + " — " + dpi + " effective source PPI",
        );
      }
      canvas.width = 0;
    }
    entries["job.json"] = strToU8(
      JSON.stringify(
        {
          version: 1,
          store: artifact.project_name,
          design: artifact.name,
          revision: artifact.revision,
          ...design,
          panels,
          files,
          coordinates:
            "x/y are centre fractions from the upper left of the print area; width is a fraction of area width; rotation is clockwise degrees; array order is back to front.",
        },
        null,
        2,
      ),
    );
    entries["PRINT.txt"] = strToU8(instructions.join("\n"));
    const zip = zipSync(entries, { level: 0 });
    const url = URL.createObjectURL(new Blob([new Uint8Array(zip)], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download =
      (artifact.name.replace(/[^\p{L}\p{N}_-]+/gu, "-") || "shirt") +
      "-r" +
      artifact.revision +
      ".zip";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } finally {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }
}
