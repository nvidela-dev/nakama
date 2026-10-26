/** Product vocabulary. See docs/domain.md for canonical semantics. Public, static content only. */
export const glossary = [
  {
    id: "experiment",
    term: "Experiment",
    code: "Experiment / experiment_plans",
    definition:
      "A project-owned claim, method and success criteria. Plan versions are retained; optional milestones are labels, not task containers.",
  },
  {
    id: "experiment-run",
    term: "Experiment run",
    code: "experiment_runs",
    definition:
      "One execution preserving its plan and selected question snapshot. Completion is separate from supporting the claim; missing effort or cost stays unknown.",
  },
  {
    id: "experiment-evidence",
    term: "Experiment evidence",
    code: "experiment_evidence",
    definition:
      "Retained observations, measurements, external evidence or attributed AI analysis. Links alone do not preserve external content. Corrections add records.",
  },
  {
    id: "experiment-review",
    term: "Claim review",
    code: "experiment_reviews",
    definition:
      "A human assessment of a scoped claim against a preserved run and evidence snapshot. Supported, contradicted or inconclusive is separate from continue, revise or stop.",
  },

  {
    id: "project",
    term: "Project",
    code: "Project / project_id",
    definition:
      "The access boundary containing purpose, members, a selected flow, answers, discussion, tasks, and artifacts. A linked project keeps independent membership.",
  },
  {
    id: "person",
    term: "Person",
    code: "Actor / userId",
    definition:
      "An authenticated identity. Signing in identifies a person; active project membership authorizes access. Profile names and email display text do not grant access.",
  },
  {
    id: "membership",
    term: "Membership",
    code: "Member / project_memberships / owner / member",
    definition:
      "A person’s role within one project. Owner and member are project roles, distinct from application administration. Removing membership revokes access without erasing attribution.",
  },
  {
    id: "invitation",
    term: "Invitation",
    code: "Invitation",
    definition:
      "A recipient-specific, time-limited offer to join a project. An invitation is not membership until acceptance succeeds.",
  },
  {
    id: "flow",
    term: "Flow template / Flow",
    code: "Flow / flowId / version",
    definition:
      "Versioned guidance selected for a project. Use “flow” in product copy and flow in new code; “workflow” is a synonym, not another entity. Existing projects retain their selected version.",
  },
  {
    id: "stage",
    term: "Stage",
    code: "FlowStage / stageId",
    definition:
      "A named section of a flow containing nodes and a review. Stage names belong to their flow template; a stage is not a task group.",
  },
  {
    id: "node",
    term: "Node",
    code: "FlowNode / nodeId",
    definition:
      "An addressable question, activity, or outcome within a stage. Use “question” only for question nodes. “Step” and “journey” are presentation/legacy names, not extra domain entities.",
  },
  {
    id: "answer",
    term: "Answer",
    code: "Answer / node status",
    definition:
      "Saved content and explicit state for a node. An unfavorable finding or an explicit unknown can be answered; empty text alone is not an answer. Discussion messages do not become answers automatically.",
  },
  {
    id: "revision",
    term: "Revision",
    code: "revision / expectedRevision",
    definition:
      "A version used to preserve answer history or detect stale writes. Compare the expected revision before saving; a conflict requires reconciliation. Artifact revision checks do not imply artifact file history.",
  },
  {
    id: "review",
    term: "Stage review",
    code: "reviewed",
    definition:
      "A human assessment of a stage’s outcome, including unresolved questions and rationale. Reviewing is independent of answering every question; reopening preserves history.",
  },
  {
    id: "progress",
    term: "Guidance progress",
    code: "answered / question nodes",
    definition:
      "Answered question nodes divided by question nodes, with skipped and blocked counts separate. Activity/outcome nodes are excluded. Percentage measures coverage, not evidence quality, viability, or task completion.",
  },
  {
    id: "task",
    term: "Task",
    code: "Task / parentId",
    definition:
      "A project-scoped unit of work. The To-do tab contains hierarchical project tasks; numbering is derived from sibling order, not identity. Completing a parent alone does not complete its children.",
  },
  {
    id: "artifact",
    term: "Artifact",
    code: "Artifact / kind",
    definition:
      "A named project output: images/design, a Markdown document, or linked software. It may belong to a stage. An artifact is distinct from an answer, conclusion, task, or stage review.",
  },
  {
    id: "artifact-task",
    term: "Artifact task",
    code: "artifact task / artifact revision",
    definition:
      "A flat task belonging to one artifact and protected by its revision. Distinct from hierarchical project tasks. Completing these tasks does not automatically mark the artifact ready.",
  },
  {
    id: "readiness",
    term: "Artifact readiness",
    code: "in_progress / ready",
    definition:
      "An explicit output state. Ready requires a valid output of the artifact’s fixed type; Ready to use is its interface label. Task Ready means work has not started, not that an output is ready.",
  },
  {
    id: "discussion",
    term: "Discussion / Comment",
    code: "Comment / scope",
    definition:
      "Discussion is the conversation; a comment is an individual message. Each comment targets one project scope: project, stage, node, project tasks, or project artifacts. Messages do not change guidance progress.",
  },
  {
    id: "activity",
    term: "Activity",
    code: "Activity",
    definition:
      "An attributable project event, such as an edit or membership change. Distinct from a flow activity node and from operational logs. Activity records are not a copy of private comment bodies.",
  },
  {
    id: "lineage",
    term: "Project lineage",
    code: "source project / spawned project",
    definition:
      "Directed origin links between projects. A source can contribute to several spawned projects and a new project can have several sources. No self-links or circular ancestry; links do not share permissions.",
  },
  {
    id: "spawn",
    term: "Spawn project",
    code: "spawn",
    definition:
      "Create a new project and its source links together. Memberships, answers, tasks, artifacts, and files are not copied. Linking existing projects records origin without creating a new project.",
  },
  {
    id: "import",
    term: "Task import / export",
    code: "Lock-In v1 / import receipt",
    definition:
      "Explicit interchange of one project’s task tree. Import appends tasks with new IDs; a receipt prevents exact duplicate imports. Export excludes membership, answers, comments, and artifact files.",
  },
  {
    id: "learning",
    term: "Learning",
    code: "Concept; recorded in answers",
    definition:
      "An observation, including uncertainty or a negative result. Currently captured in answers/discussion, not a separate universal learning record.",
  },
  {
    id: "decision",
    term: "Decision",
    code: "Concept; rationale in answers/reviews",
    definition:
      "An explicit choice with rationale and attribution. Completion counts do not infer a decision. The conceptual model does not imply a dedicated decision editor or universal decision table.",
  },
  {
    id: "outcome",
    term: "Outcome",
    code: "Concept / outcome node / artifact",
    definition:
      "A conclusion, actionable next steps, or an output. Guidance records outcomes in answers; artifacts have dedicated records. Universal outcome records and guided-context export remain future work.",
  },
] as const;

/** Reading order follows ownership, guidance, reasoning, execution, collaboration, then lineage. */
export const glossaryGroups = [
  {
    id: "access",
    title: "Projects and access",
    description: "Who participates, what belongs together, and where permissions apply.",
    terms: ["project", "person", "membership", "invitation"],
  },
  {
    id: "guidance",
    title: "Guidance and progress",
    description: "How a project’s flow is structured, answered, and reviewed.",
    terms: ["flow", "stage", "node", "answer", "review", "progress"],
  },
  {
    id: "reasoning",
    title: "Learning and decisions",
    description: "What the work teaches us, what we choose, and what it produces.",
    terms: [
      "learning",
      "decision",
      "outcome",
      "experiment",
      "experiment-run",
      "experiment-evidence",
      "experiment-review",
    ],
  },
  {
    id: "execution",
    title: "Work and outputs",
    description: "Actions to complete, outputs to use, and task interchange.",
    terms: ["task", "artifact", "artifact-task", "readiness", "import"],
  },
  {
    id: "collaboration",
    title: "Discussion and change history",
    description: "Conversations, attributable events, and protection against stale edits.",
    terms: ["discussion", "activity", "revision"],
  },
  {
    id: "relationships",
    title: "Project relationships",
    description: "How projects contribute to follow-up projects without sharing access.",
    terms: ["lineage", "spawn"],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  description: string;
  terms: readonly (typeof glossary)[number]["id"][];
}[];
