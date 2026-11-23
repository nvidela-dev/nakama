"use client";
import { buildMiniviewGraph } from "../model/miniview-graph";
import { useStyleTheme } from "@/shared/ui/use-style-theme";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Guidance } from "@/features/guidance/model/types";

export function useMiniviewScene(
  guidance: Guidance,
  stageId: string | undefined,
  nodeId: string | undefined,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef(new Map<string, HTMLAnchorElement>());
  const [failed, setFailed] = useState(false);
  const [angle, setAngle] = useState(0);
  const graph = useMemo(() => buildMiniviewGraph(guidance), [guidance]);
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
      "✓ Reviewed": lime,
      "All questions answered": lime,
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

  return { canvas, labels, failed, angle, setAngle, graph };
}
