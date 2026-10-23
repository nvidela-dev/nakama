import type { Queryable } from "../src/server/database/database";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { TaskResult } from "../src/features/tasks/actions";
import type { ArtifactResult } from "../src/features/artifacts/actions";
import type { TaskSnapshot } from "../src/features/tasks/model";
import type { ArtifactDetail } from "../src/features/artifacts/model";
import type { CommentTarget } from "../src/features/collaboration/server/collaboration";
import type { DatabaseRows, NodeStatus } from "../src/shared/contracts/database.generated";
// These compile-time assertions must fail if the contracts are accidentally loosened.
function contracts(snapshot: TaskSnapshot, artifact: ArtifactDetail) {
  // @ts-expect-error A success snapshot and a generic error cannot coexist.
  const mixed: TaskResult = { snapshot, error: "Failure" };
  // @ts-expect-error Artifact creation and deletion are distinct outcomes.
  const ambiguous: ArtifactResult = { id: "synthetic", deleted: true };
  // @ts-expect-error A node discussion requires its stage.
  const target: CommentTarget = { nodeId: "synthetic" };
  // @ts-expect-error Database nullability is explicit, not an omitted property.
  const task: DatabaseRows["artifact_tasks"] = {
    id: "synthetic",
    title: "Title",
    status: "ready",
    position: 0,
    artifact_id: artifact.id,
  };
  // @ts-expect-error Status literals come from the database enum.
  const status: NodeStatus = "done";
  void [mixed, ambiguous, target, task, status];
  return snapshot;
}
test("compile-time contracts are checked by typecheck and build", () =>
  assert.equal(typeof contracts, "function"));

async function rawQueryContracts(tx: Queryable) {
  const result = await tx.query("SELECT id FROM projects");
  // @ts-expect-error Raw rows must be decoded before reading their fields.
  const id = result.rows[0].id;
  // @ts-expect-error A caller cannot declare an arbitrary SQL result type.
  await tx.query<{ id: string }>("SELECT id FROM projects");
  void id;
}
test("raw database reads require runtime decoding", () =>
  assert.equal(typeof rawQueryContracts, "function"));
