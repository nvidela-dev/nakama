import { z } from "zod";
import type { Database, Queryable } from "./database";
import { membership, ProjectError, type Actor } from "./projects";
import {
  descendants,
  findNode,
  flows,
  type Flow,
  type FlowId,
  type NodeStatus,
} from "./flows";
export type Answer = {
  node_id: string;
  stage_id: string;
  revision: number;
  content: string;
  status: NodeStatus;
  choice: string | null;
  needs_review: boolean;
  updated_by: string;
  updated_at: Date;
};
export type Revision = {
  revision: number;
  content: string;
  status: NodeStatus;
  choice: string | null;
  author_id: string;
  origin: "capture" | "human";
  created_at: Date;
};
export type StageReview = {
  stage_id: string;
  reviewed: boolean;
  rationale: string;
  reviewed_by: string;
  reviewed_at: Date;
};
export type Guidance = {
  flow: Flow;
  answers: Answer[];
  reviews: StageReview[];
  projectState: string;
  contentRevision: number;
};
export class ConflictError extends ProjectError {
  constructor(public current: Answer) {
    super(
      "A friend saved a newer answer. Your draft is still here. Compare it with their version before saving again.",
    );
  }
}
async function selectedFlow(tx: Queryable, projectId: string) {
  const row = (
    await tx.query<{
      flow_id: FlowId;
      template_version: number;
      project_state: string;
      content_revision: number;
    }>("SELECT * FROM project_flows WHERE project_id = $1", [projectId])
  ).rows[0];
  if (!row) throw new ProjectError("Choose a flow first.");
  const flow = flows[row.flow_id];
  if (flow.version !== row.template_version)
    throw new ProjectError("This flow version is not supported.");
  return {
    flow,
    projectState: row.project_state,
    contentRevision: row.content_revision,
  };
}
const answerInput = z.object({
  revision: z.number().int().min(0),
  content: z.string().trim().max(20000),
  status: z.enum(["unanswered", "draft", "answered", "skipped", "blocked"]),
  choice: z.string().max(100).nullable(),
});
export function guidanceService(db: Database) {
  return {
    async select(actor: Actor, projectId: string, flowId: string) {
      if (flowId !== "venture" && flowId !== "creative")
        throw new ProjectError("Choose one of the two flows.");
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        const project = (
          await tx.query<{
            name: string;
            description: string;
            created_at: Date;
          }>(
            "SELECT name, description, created_at FROM projects WHERE id = $1 FOR UPDATE",
            [projectId],
          )
        ).rows[0];
        const existing = (
          await tx.query<{ flow_id: string }>(
            "SELECT flow_id FROM project_flows WHERE project_id = $1",
            [projectId],
          )
        ).rows[0];
        if (existing) {
          if (existing.flow_id !== flowId)
            throw new ProjectError(
              "This project already has a flow. Existing answers will not be replaced.",
            );
          return;
        }
        await tx.query(
          "INSERT INTO project_flows (project_id, flow_id, template_version, selected_by) VALUES ($1, $2, 1, $3)",
          [projectId, flowId, actor.userId],
        );
        const owner = (
          await tx.query<{ user_id: string }>(
            "SELECT user_id FROM project_memberships WHERE project_id = $1 AND role = 'owner'",
            [projectId],
          )
        ).rows[0];
        const stage = flows[flowId].stages[0];
        for (const [index, content] of [
          project.name,
          project.description,
        ].entries()) {
          const nodeId = stage.nodes[index].id;
          await tx.query(
            "INSERT INTO node_answers (project_id, node_id, stage_id, revision, content, status, updated_by, updated_at) VALUES ($1, $2, $3, 1, $4, 'answered', $5, $6)",
            [
              projectId,
              nodeId,
              stage.id,
              content,
              owner.user_id,
              project.created_at,
            ],
          );
          await tx.query(
            "INSERT INTO answer_revisions (project_id, node_id, revision, content, status, author_id, origin, created_at) VALUES ($1, $2, 1, $3, 'answered', $4, 'capture', $5)",
            [projectId, nodeId, content, owner.user_id, project.created_at],
          );
        }
      });
    },
    async get(actor: Actor, projectId: string): Promise<Guidance | null> {
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR SHARE", [
          projectId,
        ]);
        if (
          !(
            await tx.query(
              "SELECT project_id FROM project_flows WHERE project_id = $1",
              [projectId],
            )
          ).rows.length
        )
          return null;
        const selected = await selectedFlow(tx, projectId);
        return {
          ...selected,
          answers: (
            await tx.query<Answer>(
              "SELECT * FROM node_answers WHERE project_id = $1 ORDER BY node_id",
              [projectId],
            )
          ).rows,
          reviews: (
            await tx.query<StageReview>(
              "SELECT * FROM stage_reviews WHERE project_id = $1 ORDER BY stage_id",
              [projectId],
            )
          ).rows,
        };
      });
    },
    async editProject(
      actor: Actor,
      projectId: string,
      input: { name: string; description: string },
      expected: { name: string; description: string; contentRevision: number },
    ) {
      const name = input.name.trim(), description = input.description.trim();
      if (!name || name.length > 100 || !description || description.length > 2000)
        throw new ProjectError("Add a name (up to 100 characters) and a description (up to 2,000).");
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId, true);
        const current = (await tx.query<{ name: string; description: string }>(
          "SELECT name, description FROM projects WHERE id = $1 FOR UPDATE", [projectId],
        )).rows[0];
        const selected = (await tx.query<{ content_revision: number }>(
          "SELECT content_revision FROM project_flows WHERE project_id = $1", [projectId],
        )).rows[0];
        if (!current || current.name !== expected.name || current.description !== expected.description || (selected?.content_revision ?? 0) !== expected.contentRevision)
          throw new ProjectError("Project changed. Reload before saving; your edits are still here.");
        if (!selected) {
          await tx.query("UPDATE projects SET name = $1, description = $2 WHERE id = $3", [name, description, projectId]);
          return;
        }
        const { flow } = await selectedFlow(tx, projectId);
        // Reuse answer saves on this same transaction: both metadata fields, history,
        // review invalidation, and the project header either commit together or roll back.
        const scoped: Database = {
          query: (query, values) => tx.query(query, values),
          transaction: (work) => work(tx),
        };
        for (const [index, value] of [name, description].entries()) {
          if (value === (index === 0 ? current.name : current.description)) continue;
          const node = flow.stages[0].nodes[index];
          const answer = (await tx.query<{ revision: number }>(
            "SELECT revision FROM node_answers WHERE project_id = $1 AND node_id = $2", [projectId, node.id],
          )).rows[0];
          await guidanceService(scoped).save(actor, projectId, node.id, {
            revision: answer?.revision ?? 0, content: value, status: "answered", choice: null,
          });
        }
      });
    },
    async save(
      actor: Actor,
      projectId: string,
      nodeId: string,
      input: unknown,
    ) {
      const result = answerInput.safeParse(input);
      if (!result.success)
        throw new ProjectError(
          "Check the answer and its state; answers can be up to 20,000 characters.",
        );
      const data = result.data;
      if (
        ["answered", "skipped", "blocked"].includes(data.status) &&
        !data.content
      )
        throw new ProjectError(
          "Record an answer, uncertainty, or reason before choosing this state.",
        );
      if (data.status === "unanswered" && data.content)
        throw new ProjectError("Use Draft to keep unfinished text.");
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        // One project lock gives first inserts, edits, and stage reviews a consistent revision boundary.
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR UPDATE", [
          projectId,
        ]);
        const { flow } = await selectedFlow(tx, projectId);
        const target = findNode(flow, nodeId);
        if (!target)
          throw new ProjectError(
            "This question does not belong to this project flow.",
          );
        if (data.choice && !target.node.choices?.includes(data.choice))
          throw new ProjectError("Choose an available direction.");
        if (target.node.choices && data.status === "answered" && !data.choice)
          throw new ProjectError("Choose a direction and record why.");
        const current = (
          await tx.query<Answer>(
            "SELECT * FROM node_answers WHERE project_id = $1 AND node_id = $2",
            [projectId, nodeId],
          )
        ).rows[0];
        if ((current?.revision ?? 0) !== data.revision) {
          if (current) throw new ConflictError(current);
          throw new ProjectError("This answer changed. Reload before saving.");
        }
        const isName = nodeId === "idea-name" || nodeId === "spark-name";
        const isDescription =
          nodeId === "idea-description" || nodeId === "spark-description";
        if (
          (isName && data.content.length > 100) ||
          (isDescription && data.content.length > 2000)
        )
          throw new ProjectError(
            "Keep the project name under 100 characters and description under 2,000.",
          );
        if (data.status === "answered" && (isName || isDescription)) {
          await tx.query(
            isName
              ? "UPDATE projects SET name = $1 WHERE id = $2"
              : "UPDATE projects SET description = $1 WHERE id = $2",
            [data.content, projectId],
          );
        }
        const revision = data.revision + 1;
        await tx.query(
          "INSERT INTO node_answers (project_id, node_id, stage_id, revision, content, status, choice, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (project_id,node_id) DO UPDATE SET revision = EXCLUDED.revision, content = EXCLUDED.content, status = EXCLUDED.status, choice = EXCLUDED.choice, updated_by = EXCLUDED.updated_by, updated_at = now(), needs_review = false",
          [
            projectId,
            nodeId,
            target.stage.id,
            revision,
            data.content,
            data.status,
            data.choice,
            actor.userId,
          ],
        );
        await tx.query(
          "INSERT INTO answer_revisions (project_id,node_id,revision,content,status,choice,author_id,origin) VALUES ($1,$2,$3,$4,$5,$6,$7,'human')",
          [
            projectId,
            nodeId,
            revision,
            data.content,
            data.status,
            data.choice,
            actor.userId,
          ],
        );
        // Earlier changes invalidate conclusions, never the underlying answers or their history.
        const stageIndex = flow.stages.findIndex(
          (s) => s.id === target.stage.id,
        );
        const affectedNodes = [
          ...descendants(target.stage, nodeId),
          ...flow.stages
            .slice(stageIndex + 1)
            .flatMap((s) => s.nodes.map((n) => n.id)),
        ];
        if (affectedNodes.length)
          await tx.query(
            "UPDATE node_answers SET needs_review = true WHERE project_id = $1 AND node_id = ANY($2::text[])",
            [projectId, affectedNodes],
          );
        const affectedStages = flow.stages.slice(stageIndex).map((s) => s.id);
        await tx.query(
          "UPDATE stage_reviews SET reviewed = false WHERE project_id = $1 AND stage_id = ANY($2::text[])",
          [projectId, affectedStages],
        );
        if (
          data.status === "answered" &&
          (nodeId === "venture-direction" || nodeId === "experiment-direction")
        ) {
          const state = ["Park", "Save for later"].includes(data.choice ?? "")
            ? "parked"
            : "active";
          await tx.query(
            "UPDATE project_flows SET project_state = $1 WHERE project_id = $2",
            [state, projectId],
          );
        }
        if (data.status === "answered" && nodeId === "create-loop")
          await tx.query(
            "UPDATE project_flows SET project_state = $1 WHERE project_id = $2",
            [
              data.choice === "Finished enough" ? "finished_enough" : "active",
              projectId,
            ],
          );
        await tx.query(
          "UPDATE project_flows SET content_revision = content_revision + 1 WHERE project_id = $1",
          [projectId],
        );
        return revision;
      });
    },
    async history(actor: Actor, projectId: string, nodeId: string) {
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        const { flow } = await selectedFlow(tx, projectId);
        if (!findNode(flow, nodeId))
          throw new ProjectError("Question not found.");
        return (
          await tx.query<Revision>(
            "SELECT revision,content,status,choice,author_id,origin,created_at FROM answer_revisions WHERE project_id = $1 AND node_id = $2 ORDER BY revision DESC",
            [projectId, nodeId],
          )
        ).rows;
      });
    },
    async reviewStage(
      actor: Actor,
      projectId: string,
      stageId: string,
      rationale: string,
      expectedRevision: number,
    ) {
      if (!rationale.trim() || rationale.length > 2000)
        throw new ProjectError(
          "Record what you decided and any remaining unknowns (up to 2,000 characters).",
        );
      await db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        await tx.query("SELECT id FROM projects WHERE id = $1 FOR UPDATE", [
          projectId,
        ]);
        const { flow, contentRevision } = await selectedFlow(tx, projectId);
        if (expectedRevision !== contentRevision)
          throw new ProjectError(
            "Project answers changed while you were reviewing. Reload and review the latest answers first.",
          );
        if (!flow.stages.some((s) => s.id === stageId))
          throw new ProjectError("Stage not found.");
        await tx.query(
          "INSERT INTO stage_review_history (project_id,stage_id,content_revision,rationale,author_id) VALUES ($1,$2,$3,$4,$5)",
          [projectId, stageId, contentRevision, rationale.trim(), actor.userId],
        );
        await tx.query(
          "INSERT INTO stage_reviews (project_id,stage_id,reviewed,rationale,reviewed_by) VALUES ($1,$2,true,$3,$4) ON CONFLICT(project_id,stage_id) DO UPDATE SET reviewed = true, rationale = EXCLUDED.rationale, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now()",
          [projectId, stageId, rationale.trim(), actor.userId],
        );
      });
    },
  };
}
