import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { zones, type Zone, type ShirtDesign } from "./design";
import { drawPanel, type ArtImages } from "./print";

import { printStack, printRect, type SurfaceHit } from "./texture";
type Sample = (u: number, v: number) => [number, number, number, number, number];
function fabric(columns: number, rows: number, sample: Sample) {
  const vertices = [],
    uv = [],
    indices = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const [x, y, z, s, t] = sample(i / columns, j / rows);
      vertices.push(x, y, z);
      uv.push(s, t);
      if (i < columns && j < rows) {
        const a = j * (columns + 1) + i,
          b = a + columns + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
// A crew-neck block in centimetres. Artwork UVs use the same physical print rectangles as the export.
export function mountGarment(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  renderer.domElement.style.touchAction = "none";
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 600);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enablePan = false;
  orbit.minDistance = 85;
  orbit.maxDistance = 240;
  orbit.minPolarAngle = 0.22;
  orbit.maxPolarAngle = Math.PI - 0.22;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa0a8b5, 1.8));
  const key = new THREE.DirectionalLight(0xfff4df, 2.1);
  key.position.set(-70, 110, 80);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2edf5, 1.3);
  rim.position.set(45, 50, -75);
  scene.add(rim);
  const meshes: THREE.Mesh[] = [];
  const mats = Object.fromEntries(
    zones.map((zone) => [
      zone,
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }),
    ]),
  ) as Record<Zone, THREE.MeshStandardMaterial>;
  const stitch = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(geo, mat);
    meshes.push(mesh);
    scene.add(mesh);
  };
  const seam = (points: THREE.Vector3[], radius: number) =>
    add(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 80, radius, 5, true),
      stitch,
    );
  // Body rings taper at the waist and roll into the shoulder and neckline.
  const rings = [
    [0.3, 25, 9, 0],
    [1.4, 25.2, 9.1, 0],
    [7, 24.8, 8.8, 0],
    [25, 23.9, 8.3, 0],
    [41, 24.4, 9.3, 0],
    [49, 25, 10.1, 0],
    [57, 25.3, 10, 0.6],
    [62.5, 24.5, 9, 1],
    [66, 16, 7.5, 2],
    [68, 9, 6.2, 4],
  ] as const;
  function body(a: number, j: number): [number, number, number] {
    const [y, rx, rz, drop] = rings[j]!;
    const fold =
      (0.55 * Math.sin(9 * a + 0.04 * y) + 0.38 * Math.cos(13 * a - 0.025 * y)) * (1 - j / 10);
    return [
      Math.sin(a) * (rx + fold),
      y - drop * Math.max(0, Math.cos(a)) + 0.28 * Math.sin(5 * a) * (1 - j / 9),
      Math.cos(a) * (rz + fold),
    ];
  }
  for (const zone of ["chest", "back"] as const) {
    const front = zone === "chest";
    add(
      fabric(56, rings.length - 1, (u, v) => {
        const [x, y, z] = body(
          (u - 0.5) * Math.PI + (front ? 0 : Math.PI),
          Math.round(v * (rings.length - 1)),
        );
        // The texture atlas spans 54 x 72 cm. Its horizontal axis follows the outside view.
        return [x, y, z, 0.5 + (front ? x : -x) / 54, y / 72];
      }),
      mats[zone],
    );
  }
  const circle = Array.from({ length: 80 }, (_, i) => (i * 2 * Math.PI) / 80);
  seam(
    circle.map((a) => new THREE.Vector3(...body(a, rings.length - 1))),
    0.9,
  );
  seam(
    circle.map((a) => new THREE.Vector3(...body(a, 1))),
    0.19,
  );
  for (const zone of ["left_sleeve", "right_sleeve"] as const) {
    const sign = zone === "left_sleeve" ? 1 : -1;
    function sleeve(u: number, v: number): [number, number, number] {
      // Viewed from the wearer's left, screen-right points toward the back of the garment.
      const a = (0.5 - u) * 2 * Math.PI * sign,
        axis = 23 * v,
        r = 11.7 - 1.6 * v;
      return [
        sign * (15 + 0.87 * axis + 0.49 * r * Math.cos(a)),
        54.5 - 0.49 * axis + 0.87 * r * Math.cos(a),
        (5.5 + 3.2 * Math.sin((v * Math.PI) / 2)) * Math.sin(a),
      ];
    }
    add(
      fabric(64, 9, (u, v) => [...sleeve(u, v), u, 1 - v]),
      mats[zone],
    );
    seam(
      circle.map((_, i) => new THREE.Vector3(...sleeve(i / 80, 0.965))),
      0.21,
    );
  }
  const render = () => renderer.render(scene, camera);
  orbit.addEventListener("change", render);

  function view(zone: Zone) {
    const angle = {
      chest: 0.12,
      back: Math.PI,
      left_sleeve: Math.PI / 2,
      right_sleeve: -Math.PI / 2,
    }[zone];
    const distance = Math.max(132, 126 / camera.aspect);
    camera.position.set(
      Math.sin(angle) * distance,
      zone.endsWith("sleeve") ? 34 + distance * 0.42 : 40,
      Math.cos(angle) * distance,
    );
    orbit.target.set(0, 34, 0);
    orbit.update();
    render();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  view("chest");
  const painted = new Map<Zone, string>();
  let loaded: ArtImages | undefined;
  function paint(design: ShirtDesign, images: ArtImages, guides = false) {
    if (loaded !== images) {
      painted.clear();
      loaded = images;
    }
    for (const zone of zones) {
      const key = design.layout.color + guides + JSON.stringify(printStack(design.layout, zone));
      if (painted.get(zone) === key) continue;
      painted.set(zone, key);
      const mat = mats[zone];
      const sleeve = zone.endsWith("sleeve");
      const atlas =
        mat.map?.image instanceof HTMLCanvasElement
          ? mat.map.image
          : document.createElement("canvas");
      atlas.width = sleeve ? 1024 : 768;
      atlas.height = sleeve ? 320 : 1024;
      const ctx = atlas.getContext("2d")!;
      ctx.fillStyle = design.layout.color;
      ctx.fillRect(0, 0, atlas.width, atlas.height);
      const print = document.createElement("canvas");
      drawPanel(print, design.layout, zone, images, sleeve ? 256 : 512);
      const rect = printRect(zone);
      ctx.drawImage(
        print,
        rect.x * atlas.width,
        rect.y * atlas.height,
        rect.w * atlas.width,
        rect.h * atlas.height,
      );
      if (guides) {
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = "#455563";
        ctx.strokeRect(
          rect.x * atlas.width,
          rect.y * atlas.height,
          rect.w * atlas.width,
          rect.h * atlas.height,
        );
      }
      mat.map ??= new THREE.CanvasTexture(atlas);
      mat.map.needsUpdate = true;
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.needsUpdate = true;
    }
    stitch.color.set(design.layout.color).multiplyScalar(0.77);
    render();
  }
  const ray = new THREE.Raycaster();
  function pick(clientX: number, clientY: number): SurfaceHit | null {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ray.setFromCamera(
      new THREE.Vector2(
        (2 * (clientX - rect.left)) / rect.width - 1,
        1 - (2 * (clientY - rect.top)) / rect.height,
      ),
      camera,
    );
    const hit = ray
      .intersectObjects(meshes, false)
      .find((hit) => hit.uv && hit.object instanceof THREE.Mesh && hit.object.material !== stitch);
    if (!hit?.uv) return null;
    const zone = zones.find((z) => mats[z] === (hit.object as THREE.Mesh).material);
    if (!zone) return null;
    const panel = printRect(zone);
    return { zone, x: (hit.uv.x - panel.x) / panel.w, y: (1 - hit.uv.y - panel.y) / panel.h };
  }
  function snapshot() {
    // Frame the whole garment at a fixed size while preserving the user's viewing angle.
    const shot = camera.clone(),
      size = renderer.getSize(new THREE.Vector2()),
      ratio = renderer.getPixelRatio();
    shot.aspect = 1;
    shot.updateProjectionMatrix();
    shot.position.sub(orbit.target).normalize().multiplyScalar(147).add(orbit.target);
    shot.lookAt(orbit.target);
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(224, 224, false);
      renderer.render(scene, shot);
      return renderer.domElement.toDataURL("image/webp", 0.82);
    } finally {
      renderer.setPixelRatio(ratio);
      renderer.setSize(size.x, size.y, false);
      render();
    }
  }
  return {
    pick,
    snapshot,
    rotate: (enabled: boolean) => {
      orbit.enabled = enabled;
    },
    view,
    paint,
    dispose() {
      observer.disconnect();
      orbit.dispose();
      meshes.forEach((mesh) => mesh.geometry.dispose());
      Object.values(mats).forEach((mat) => {
        mat.map?.dispose();
        mat.dispose();
      });
      stitch.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
