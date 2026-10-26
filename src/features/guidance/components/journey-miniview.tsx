"use client";
import { useStyleTheme } from "@/shared/ui/use-style-theme";
import { Icon, type IconName } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import type { Guidance } from "@/features/guidance/model/types";
import { useT } from "@/shared/i18n/provider";

type Point = {
  id: string;
  stageId: string;
  nodeId?: string | undefined;
  label: string;
  status: string;
  revisit: boolean;
  position: THREE.Vector3;
};
const symbols: Record<string, IconName> = {
  unanswered: "unanswered",
  draft: "draft",
  answered: "answered",
  skipped: "skipped",
  blocked: "warning",
  reviewed: "answered",
  "In progress": "draft",
  "Not started": "unanswered",
};

export default function JourneyMiniview({
  guidance,
  base,
  stageId,
  nodeId,
}: {
  guidance: Guidance;
  base: string;
  stageId?: string | undefined;
  nodeId?: string | undefined;
}) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef(new Map<string, HTMLAnchorElement>());
  const [failed, setFailed] = useState(false);
  const [angle, setAngle] = useState(0);
  const graph = useMemo(() => {
    const points: Point[] = [];
    const edges: [string, string][] = [];
    guidance.flow.stages.forEach((stage, index) => {
      const x = (index - (guidance.flow.stages.length - 1) / 2) * 3.5;
      const y = index % 2 ? 2.5 : 1.3;
      const z = index % 2 ? -2 : 1.5;
      const review = guidance.reviews.find((r) => r.stage_id === stage.id);
      const worked =
        guidance.answers.some((a) => a.stage_id === stage.id && a.status !== "unanswered") ||
        !!review;
      points.push({
        id: stage.id,
        stageId: stage.id,
        label: stage.name,
        status: review?.reviewed ? "reviewed" : worked ? "In progress" : "Not started",
        revisit: !!review && !review.reviewed,
        position: new THREE.Vector3(x, y, z),
      });
      const previous = guidance.flow.stages[index - 1];
      if (previous) edges.push([previous.id, stage.id]);
      const depths = new Map<string, number>();
      for (const node of stage.nodes)
        depths.set(
          node.id,
          node.after.length ? Math.max(...node.after.map((id) => depths.get(id) ?? 0)) + 1 : 0,
        );
      for (const node of stage.nodes) {
        const depth = depths.get(node.id)!;
        const siblings = stage.nodes.filter((n) => depths.get(n.id) === depth);
        const lane = siblings.indexOf(node) - (siblings.length - 1) / 2;
        const answer = guidance.answers.find((a) => a.node_id === node.id);
        points.push({
          id: node.id,
          stageId: stage.id,
          nodeId: node.id,
          label: node.label,
          status: answer?.status ?? "unanswered",
          revisit: answer?.needs_review ?? false,
          position: new THREE.Vector3(
            x + lane * 1.1,
            y - 1.6 - depth * 0.82,
            z + depth * 0.35 + lane * 0.3,
          ),
        });
        for (const parent of node.after.length ? node.after : [stage.id])
          edges.push([parent, node.id]);
      }
    });
    return { points, edges };
  }, [guidance]);

  const styleTheme = useStyleTheme();

  useEffect(() => {
    if (!canvas.current || failed) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true });
    } catch {
      // Renderer construction reports an external GPU failure; replace it with the accessible fallback.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    const theme = getComputedStyle(document.documentElement);
    const token = (name: string) => theme.getPropertyValue(name).trim();
    const lime = new THREE.Color(token("--color-lime"));
    const peach = new THREE.Color(token("--color-pink"));
    const muted = new THREE.Color(token("--color-muted"));
    const line = new THREE.Color(token("--color-line"));
    const colors: Record<string, THREE.Color> = {
      unanswered: muted,
      draft: peach,
      answered: lime,
      skipped: muted,
      blocked: peach,
      reviewed: lime,
      "In progress": peach,
      "Not started": muted,
    };
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-10.7, 10.7, 5.7, -5.7, 0.1, 100);
    camera.position.set(8 + angle * 4, 8, 24);
    camera.lookAt(0, -0.8, 0);
    const geometry = new THREE.IcosahedronGeometry(0.23, 1);
    const cube = new THREE.BoxGeometry(0.95, 0.95, 0.95, 4, 4, 4);
    const resources: { dispose(): void }[] = [geometry, cube];
    const positions = new Map(graph.points.map((p) => [p.id, p.position]));
    const grid = new THREE.GridHelper(30, 30, line, line.clone().multiplyScalar(0.45));
    grid.position.y = -5.2;
    scene.add(grid);
    resources.push(grid.geometry);
    if (Array.isArray(grid.material)) resources.push(...grid.material);
    else resources.push(grid.material);
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 64;
    const context = glowCanvas.getContext("2d")!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `${token("--color-lime")}8c`);
    gradient.addColorStop(0.3, `${token("--color-lime")}26`);
    gradient.addColorStop(1, `${token("--color-lime")}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    resources.push(glowTexture);
    for (const [index, point] of graph.points.entries()) {
      const selected = nodeId ? point.id === nodeId : point.id === stageId;
      const material = new THREE.MeshBasicMaterial({
        color: selected ? token("--color-ink") : (colors[point.status] ?? token("--color-muted")),
        wireframe: true,
        transparent: true,
        opacity: point.nodeId ? 0.85 : 0.7,
        blending: THREE.NormalBlending,
      });
      resources.push(material);
      const mesh = new THREE.Mesh(point.nodeId ? geometry : cube, material);
      mesh.position.copy(point.position);
      mesh.rotation.set(0.18 + index * 0.11, 0.3 + index * 0.23, 0.12);
      scene.add(mesh);
      if (!point.nodeId || point.status === "answered") {
        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        resources.push(glowMaterial);
        const glow = new THREE.Sprite(glowMaterial);
        glow.position.copy(point.position);
        glow.scale.setScalar(point.nodeId ? 1.2 : 2.4);
        scene.add(glow);
      }
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: lime,
      transparent: true,
      opacity: 0.55,
    });
    resources.push(lineMaterial);
    for (const [from, to] of graph.edges) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        positions.get(from)!,
        positions.get(to)!,
      ]);
      resources.push(lineGeometry);
      scene.add(new THREE.Line(lineGeometry, lineMaterial));
    }
    const surface = canvas.current.parentElement!;
    function render() {
      const { width, height } = surface.getBoundingClientRect();
      const halfHeight = Math.max(5.7, (10.7 * height) / width);
      const halfWidth = (halfHeight * width) / height;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
      for (const point of graph.points) {
        const label = labels.current.get(point.id);
        const projected = point.position.clone().project(camera);
        if (label) {
          label.style.left = `${((projected.x + 1) * width) / 2}px`;
          label.style.top = `${((1 - projected.y) * height) / 2}px`;
        }
      }
    }
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    const element = canvas.current;
    element.addEventListener("webglcontextlost", lost);
    const observer = new ResizeObserver(render);
    observer.observe(surface);
    try {
      render();
    } catch {
      setFailed(true);
    }
    return () => {
      observer.disconnect();
      element.removeEventListener("webglcontextlost", lost);
      resources.forEach((resource) => resource.dispose());
      renderer.dispose();
    };
  }, [graph, angle, stageId, nodeId, failed, styleTheme]);

  return (
    <div
      className={
        "journey-miniview mb-[1.25rem] p-[1rem] border border-line rounded-[4px] [background:radial-gradient(ellipse_at_50%_50%,_var(--color-panel)_0%,_var(--color-bg)_65%)] text-ink [box-shadow:inset_0_0_60px_var(--color-dark)] font-sans"
      }
    >
      <div
        className={
          "miniview-heading flex items-center justify-between gap-[0.75rem] flex-wrap pb-[0.6rem] border-b border-b-line"
        }
      >
        <strong
          className={
            "text-lime uppercase tracking-[0.18em] text-[0.85rem] [text-shadow:0_0_12px_var(--color-line)]"
          }
        >
          {t("3D stage map")}
        </strong>
        <div
          className={"miniview-controls flex gap-[0.4rem]"}
          role="group"
          aria-label={t("Map perspective")}
        >
          <Button
            type="button"
            onClick={() => setAngle(Math.max(-2, angle - 1))}
            disabled={failed || angle === -2}
            aria-label={t("Rotate left")}
            className={
              "text-lime bg-dark border rounded-[2px] min-h-10 py-[0.35rem] px-[0.65rem] border-line text-[0.75rem] disabled:opacity-50"
            }
          >
            <Icon name="rotateLeft" />
          </Button>
          <Button
            type="button"
            onClick={() => setAngle(0)}
            disabled={failed || angle === 0}
            className={
              "text-lime bg-dark border rounded-[2px] min-h-10 py-[0.35rem] px-[0.65rem] border-line text-[0.75rem] disabled:opacity-50"
            }
          >
            {t("Reset view")}
          </Button>
          <Button
            type="button"
            onClick={() => setAngle(Math.min(2, angle + 1))}
            disabled={failed || angle === 2}
            aria-label={t("Rotate right")}
            className={
              "text-lime bg-dark border rounded-[2px] min-h-10 py-[0.35rem] px-[0.65rem] border-line text-[0.75rem] disabled:opacity-50"
            }
          >
            <Icon name="rotateRight" />
          </Button>
        </div>
      </div>
      <p className={"muted mb-[1em] mt-0 text-muted text-[0.7rem]"}>
        {t(
          "Saved progress across stages. Branches show dependencies; upcoming stages remain visible.",
        )}
      </p>
      {failed ? (
        <p role="status" className={"mb-[1em] mt-0"}>
          {t("3D is unavailable. Use the stage tree below.")}
        </p>
      ) : (
        <div
          className={"miniview-scroll overflow-x-auto"}
          tabIndex={0}
          role="region"
          aria-label={t("Stage map. Scroll horizontally on small screens.")}
        >
          <div
            className={
              'miniview-scene relative min-w-185 h-107.5 max-w-275 [margin-inline:auto] after:[content:""] after:absolute after:inset-0 after:[pointer-events:none] after:[background:repeating-linear-gradient(transparent_0_3px,_#17231c30_3px_4px)]'
            }
          >
            <canvas ref={canvas} aria-hidden="true" className={"block w-full h-full"} />
            <nav
              aria-label={t("Stages and question branches")}
              className={
                "flex items-center gap-7 text-[13px] max-[700px]:gap-3.5 max-[700px]:text-[12px]"
              }
            >
              {graph.points.map((point) => (
                <Link
                  key={point.id}
                  ref={(element) => {
                    if (element) labels.current.set(point.id, element);
                    else labels.current.delete(point.id);
                  }}
                  href={`${base}?stage=${point.stageId}${point.nodeId ? `&node=${point.nodeId}` : ""}`}
                  className={[
                    `miniview-point ${point.nodeId ? "miniview-node" : "miniview-stage"}`,
                    "absolute [transform:translate(-50%,_-50%)] w-7.5 h-7.5 rounded-full z-[1] [&[aria-current]]:[outline:2px_solid_white] [&[aria-current]]:[outline-offset:3px] [&[aria-current]]:[outline-color:var(--color-lime)] focus-visible:[outline:2px_solid_white] focus-visible:[outline-offset:3px] focus-visible:[outline-color:var(--color-lime)] hover:z-[3] focus-visible:z-[3] [&:hover_.miniview-label]:block [&:focus-visible_.miniview-label]:block",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={
                    (nodeId ? point.id === nodeId : point.id === stageId) ? "location" : undefined
                  }
                  aria-label={`${t(point.label)} · ${t(point.status)}${point.revisit ? t(" · revisit") : ""}`}
                >
                  <span
                    className={
                      "miniview-label absolute left-1/2 [transform:translateX(-50%)] w-[max-content] max-w-36.25 py-[0.25rem] px-[0.4rem] bg-bg border rounded-[2px] text-ink text-[0.7rem] text-center leading-[1.35] border-line tracking-[0.03em] top-[auto] bottom-10 hidden [pointer-events:none]"
                    }
                  >
                    {!point.nodeId && (
                      <Icon name={symbols[point.status] ?? "unanswered"} size={12} />
                    )}
                    {t(point.label)}
                    <small className={"block text-muted text-[0.65rem]"}>
                      {t(point.status)}
                      {point.revisit ? t(" · revisit") : ""}
                    </small>
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      <p
        className={
          "miniview-legend mt-0 text-muted text-[0.7rem] mb-0 pt-[0.7rem] border-t border-t-line"
        }
      >
        {t(
          "Lime: answered or reviewed · Peach: in progress, draft, or blocked · Muted: not started or skipped",
        )}
      </p>
    </div>
  );
}
