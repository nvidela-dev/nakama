import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityFeed } from "../src/features/collaboration/components/activity-feed";
import type { Activity } from "../src/features/collaboration/model";

test("server-rendered activity preserves language, attribution, UTC dates and navigation", () => {
  const entry: Activity = {
    kind: "task_created",
    actor_name: "Test author",
    actor_id: "author",
    former_member: true,
    created_at: new Date("2026-11-23T15:30:00Z"),
    subject_name: "Synthetic task",
    stage_id: "tasks",
    node_id: null,
    comment_id: null,
    detail: null,
    sort_key: "one",
  };
  for (const [locale, action, formerMember, pagination] of [
    ["en", "added a task", "Former member", "Older activity"],
    ["es", "agregó una tarea", "Exmiembro", "Actividad anterior"],
  ] as const) {
    const markup = renderToStaticMarkup(
      createElement(ActivityFeed, {
        projectId: "sample",
        locale,
        activity: { items: [entry], next: "cursor" },
        olderHref: "/projects/sample?activityBefore=cursor",
      }),
    );
    for (const label of [
      action,
      formerMember,
      pagination,
      "Test author",
      "Synthetic task",
      "UTC",
    ]) {
      assert.ok(markup.includes(label), label);
    }
    assert.match(markup, /href="\/projects\/sample\?view=tasks"/);
    assert.match(markup, /href="\/projects\/sample\?activityBefore=cursor"/);
    assert.match(markup, /dateTime="2026-11-23T15:30:00.000Z"/i);
  }
});
