"use client";
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
const symbols: Record<string, string> = {
  unanswered: "○",
  draft: "◐",
  answered: "✓",
  skipped: "↷",
  blocked: "!",
  reviewed: "✓",
  "In progress": "◐",
  "Not started": "○",
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
    const lime = new THREE.Color(token("--lime"));
    const peach = new THREE.Color(token("--pink"));
    const muted = new THREE.Color(token("--muted"));
    const line = new THREE.Color(token("--line"));
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
    gradient.addColorStop(0, `${token("--lime")}8c`);
    gradient.addColorStop(0.3, `${token("--lime")}26`);
    gradient.addColorStop(1, `${token("--lime")}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    resources.push(glowTexture);
    for (const [index, point] of graph.points.entries()) {
      const selected = nodeId ? point.id === nodeId : point.id === stageId;
      const material = new THREE.MeshBasicMaterial({
        color: selected ? token("--ink") : (colors[point.status] ?? token("--muted")),
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
  }, [graph, angle, stageId, nodeId, failed]);

  return (
    <div className="journey-miniview">
      <div className="miniview-heading">
        <strong>{t("3D stage map")}</strong>
        <div className="miniview-controls" role="group" aria-label={t("Map perspective")}>
          <Button
            type="button"
            onClick={() => setAngle(Math.max(-2, angle - 1))}
            disabled={failed || angle === -2}
            aria-label={t("Rotate left")}
          >
            ↶
          </Button>
          <Button type="button" onClick={() => setAngle(0)} disabled={failed || angle === 0}>
            {t("Reset view")}
          </Button>
          <Button
            type="button"
            onClick={() => setAngle(Math.min(2, angle + 1))}
            disabled={failed || angle === 2}
            aria-label={t("Rotate right")}
          >
            ↷
          </Button>
        </div>
      </div>
      <p className="muted">
        {t(
          "Saved progress across stages. Branches show dependencies; upcoming stages remain visible.",
        )}
      </p>
      {failed ? (
        <p role="status">{t("3D is unavailable. Use the stage tree below.")}</p>
      ) : (
        <div
          className="miniview-scroll"
          tabIndex={0}
          role="region"
          aria-label={t("Stage map. Scroll horizontally on small screens.")}
        >
          <div className="miniview-scene">
            <canvas ref={canvas} aria-hidden="true" />
            <nav aria-label={t("Stages and question branches")}>
              {graph.points.map((point) => (
                <Link
                  key={point.id}
                  ref={(element) => {
                    if (element) labels.current.set(point.id, element);
                    else labels.current.delete(point.id);
                  }}
                  href={`${base}?stage=${point.stageId}${point.nodeId ? `&node=${point.nodeId}` : ""}`}
                  className={`miniview-point ${point.nodeId ? "miniview-node" : "miniview-stage"}`}
                  aria-current={
                    (nodeId ? point.id === nodeId : point.id === stageId) ? "location" : undefined
                  }
                  aria-label={`${t(point.label)} · ${t(point.status)}${point.revisit ? t(" · revisit") : ""}`}
                >
                  <span className="miniview-label">
                    {!point.nodeId && `${symbols[point.status]} `}
                    {t(point.label)}
                    <small>
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
      <p className="miniview-legend">
        {t(
          "Lime: answered or reviewed · Peach: in progress, draft, or blocked · Muted: not started or skipped",
        )}
      </p>
    </div>
  );
}
