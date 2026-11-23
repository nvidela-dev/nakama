import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMiniviewGraph } from "../src/features/guidance/model/miniview-graph";
import { flows } from "../src/features/guidance/model/flows";
import { productionStages } from "../src/features/guidance/model/production-stages";
import { ProjectTimeline } from "../src/features/projects/components/project-timeline";
import { translator } from "../src/shared/i18n";

test("the map identifies exactly the milestone stages in each flow", () => {
  for (const flow of Object.values(flows)) {
    const graph = buildMiniviewGraph({
      flow,
      answers: [],
      reviews: [],
      projectState: "active",
      contentRevision: 0,
    });
    assert.deepEqual(
      graph.points.filter((p) => p.hasMilestoneBoard).map((p) => p.id),
      productionStages[flow.id],
      flow.id,
    );
    assert.ok(graph.points.every((p) => !p.nodeId || !p.hasMilestoneBoard));
  }
});

test("home card markers identify milestone boards in the viewer's language and retain progress", () => {
  const stage = {
    id: "building",
    name: "Building",
    answered: 1,
    total: 2,
    started: true,
    reviewed: false,
    revisit: false,
    blocked: 0,
    skipped: 0,
  };
  for (const locale of ["en", "es"] as const) {
    const t = translator(locale);
    const render = (hasMilestoneBoard: boolean) =>
      renderToStaticMarkup(
        createElement(ProjectTimeline, { stages: [{ ...stage, hasMilestoneBoard }], t }),
      );
    assert.ok(render(true).includes(t("Milestone board")));
    assert.ok(!render(false).includes(t("Milestone board")));
    assert.ok(render(true).includes("1/2"));
  }
});
