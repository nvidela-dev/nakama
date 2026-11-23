// Generated from all SQL migrations by npm run db:types. Do not edit.
// Database timestamps are Date; int8/numeric remain strings with node-postgres defaults.
export const ActivityKindValues = ["project_created","project_edited","flow_selected","invitation_created","invitation_revoked","member_joined","member_removed","comment_created","comment_edited","comment_deleted","comment_moderated","task_created","task_edited","task_status_changed","task_deleted","tasks_imported","artifact_created","artifact_updated","artifact_deleted","project_archived","project_restored"] as const;
export type ActivityKind = (typeof ActivityKindValues)[number];
export const ArtifactKindValues = ["image","markdown","software"] as const;
export type ArtifactKind = (typeof ArtifactKindValues)[number];
export const ArtifactMediaTypeValues = ["image/png","image/jpeg","image/webp","image/gif","text/markdown"] as const;
export type ArtifactMediaType = (typeof ArtifactMediaTypeValues)[number];
export const ArtifactStatusValues = ["in_progress","ready"] as const;
export type ArtifactStatus = (typeof ArtifactStatusValues)[number];
export const FlowIdValues = ["venture","creative","investigation","eshop","shirt-eshop","saas","importation","consultancy","platform","self-improvement","video-game"] as const;
export type FlowId = (typeof FlowIdValues)[number];
export const IterationStageValues = ["plan","run","review","follow_up"] as const;
export type IterationStage = (typeof IterationStageValues)[number];
export const LabAssessmentValues = ["supported","contradicted","inconclusive"] as const;
export type LabAssessment = (typeof LabAssessmentValues)[number];
export const LabEvidenceKindValues = ["ai_analysis","external_evidence","measurement","observation"] as const;
export type LabEvidenceKind = (typeof LabEvidenceKindValues)[number];
export const LabNextActionValues = ["continue","revise","stop"] as const;
export type LabNextAction = (typeof LabNextActionValues)[number];
export const LabProposalStatusValues = ["pending","accepted","edited","rejected"] as const;
export type LabProposalStatus = (typeof LabProposalStatusValues)[number];
export const LabRunStatusValues = ["running","completed","cancelled"] as const;
export type LabRunStatus = (typeof LabRunStatusValues)[number];
export const MembershipRoleValues = ["owner","member"] as const;
export type MembershipRole = (typeof MembershipRoleValues)[number];
export const MilestoneStatusValues = ["active","completed","archived"] as const;
export type MilestoneStatus = (typeof MilestoneStatusValues)[number];
export const NodeStatusValues = ["unanswered","draft","answered","skipped","blocked"] as const;
export type NodeStatus = (typeof NodeStatusValues)[number];
export const ProjectStateValues = ["active","parked","finished_enough"] as const;
export type ProjectState = (typeof ProjectStateValues)[number];
export const ProspectEventKindValues = ["assignment","call","message","reply","note","membership_ended","profile","stage"] as const;
export type ProspectEventKind = (typeof ProspectEventKindValues)[number];
export const ProspectStatusValues = ["ready","in_progress","deal","rejected","attempted_contact","in_conversation","proposal_sent","negotiating","assess_fit"] as const;
export type ProspectStatus = (typeof ProspectStatusValues)[number];
export const RevisionOriginValues = ["capture","human"] as const;
export type RevisionOrigin = (typeof RevisionOriginValues)[number];
export const TaskStatusValues = ["ready","in_progress","done"] as const;
export type TaskStatus = (typeof TaskStatusValues)[number];

export interface DatabaseRows {
  answer_revisions: {
    project_id: string;
    node_id: string;
    revision: number;
    content: string;
    status: NodeStatus;
    choice: string | null;
    author_id: string;
    origin: RevisionOrigin;
    created_at: Date;
  };
  artifact_files: {
    id: string;
    project_id: string;
    artifact_id: string;
    name: string;
    media_type: ArtifactMediaType;
    data: Uint8Array;
    created_at: Date;
    created_by: string;
    size: number;
  };
  artifact_tasks: {
    project_id: string;
    artifact_id: string;
    id: string;
    position: number;
    title: string;
    status: TaskStatus;
  };
  comment_reads: {
    comment_id: string;
    user_id: string;
    read_at: Date;
  };
  experiment_evidence: {
    id: string;
    project_id: string;
    experiment_id: string;
    run_id: string;
    kind: LabEvidenceKind;
    content: string;
    source: string;
    measurement: string | null;
    unit: string | null;
    author_id: string;
    recorded_at: Date;
  };
  experiment_plans: {
    id: string;
    project_id: string;
    experiment_id: string;
    version: number;
    definition: unknown;
    author_id: string;
    created_at: Date;
  };
  experiment_proposals: {
    id: string;
    project_id: string;
    experiment_id: string;
    run_id: string;
    agent: string;
    content: string;
    source: string;
    status: LabProposalStatus;
    submitted_by: string;
    created_at: Date;
    reviewer_id: string | null;
    reviewed_at: Date | null;
    review_note: string | null;
    accepted_content: string | null;
  };
  experiment_reviews: {
    id: string;
    project_id: string;
    experiment_id: string;
    run_id: string;
    assessment: LabAssessment;
    next_action: LabNextAction;
    rationale: string;
    reconciliation: string;
    snapshot: unknown;
    author_id: string;
    created_at: Date;
  };
  experiment_runs: {
    id: string;
    project_id: string;
    experiment_id: string;
    plan_id: string;
    context: unknown;
    status: LabRunStatus;
    executor: string;
    started_by: string;
    started_at: Date;
    ended_at: Date | null;
    effort_minutes: number | null;
    cost: string | null;
    deviations: string;
  };
  experiments: {
    id: string;
    project_id: string;
    revision: number;
    created_by: string;
    created_at: Date;
    stage: IterationStage;
  };
  iteration_reflections: {
    project_id: string;
    experiment_id: string;
    prompt: string;
    revision: number;
    content: string;
    author_id: string;
    author_name: string;
    created_at: Date;
  };
  milestone_columns: {
    template_id: string;
    column_id: string;
    status: TaskStatus;
    position: number;
  };
  milestone_template_flows: {
    template_id: string;
    flow_id: FlowId;
  };
  node_answers: {
    project_id: string;
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
  project_activity: {
    id: string;
    project_id: string;
    kind: ActivityKind;
    actor_id: string;
    actor_name: string;
    stage_id: string | null;
    node_id: string | null;
    comment_id: string | null;
    subject_name: string | null;
    created_at: Date;
  };
  project_artifacts: {
    id: string;
    project_id: string;
    flow_id: FlowId | null;
    stage_id: string | null;
    name: string;
    description: string;
    kind: ArtifactKind;
    status: ArtifactStatus;
    github_url: string | null;
    revision: number;
    created_by: string;
    updated_by: string;
    created_at: Date;
    updated_at: Date;
  };
  project_comments: {
    id: string;
    project_id: string;
    flow_id: FlowId | null;
    stage_id: string | null;
    node_id: string | null;
    author_id: string;
    author_name: string;
    content: string;
    revision: number;
    created_at: Date;
    edited_at: Date | null;
    deleted_at: Date | null;
    deleted_by: string | null;
  };
  project_flows: {
    project_id: string;
    flow_id: FlowId;
    template_version: number;
    project_state: ProjectState;
    content_revision: number;
    selected_by: string;
    selected_at: Date;
  };
  project_invitations: {
    id: string;
    project_id: string;
    email: string;
    token_hash: string;
    invited_by: string;
    created_at: Date;
    expires_at: Date;
    accepted_by: string | null;
    accepted_at: Date | null;
    revoked_at: Date | null;
  };
  project_links: {
    source_id: string;
    child_id: string;
    created_by: string;
    created_at: Date;
  };
  project_memberships: {
    project_id: string;
    user_id: string;
    display_name: string;
    role: MembershipRole;
    joined_at: Date;
  };
  project_milestones: {
    id: string;
    project_id: string;
    flow_id: FlowId;
    template_id: string;
    title: string;
    description: string;
    status: MilestoneStatus;
    position: number;
    created_by: string;
    updated_by: string;
    created_at: Date;
    updated_at: Date;
  };
  project_task_imports: {
    project_id: string;
    fingerprint: string;
    imported_by: string;
    imported_at: Date;
  };
  project_task_lists: {
    project_id: string;
    revision: number;
  };
  project_tasks: {
    id: string;
    project_id: string;
    parent_id: string | null;
    position: number;
    title: string;
    status: TaskStatus;
    collapsed: boolean;
    created_by: string;
    updated_by: string;
    created_at: Date;
    updated_at: Date;
    milestone_id: string | null;
    column_id: string | null;
    board_position: number;
  };
  projects: {
    id: string;
    name: string;
    description: string;
    created_at: Date;
    archived: boolean;
    linear_project_url: string | null;
    linear_link_revision: number;
  };
  prospect_assessments: {
    catalogue_id: string;
    prospect_id: string;
    revision: number;
    assessment: unknown;
    updated_at: Date;
  };
  prospect_call_reviews: {
    id: string;
    catalogue_id: string;
    prospect_id: string;
    revision: number;
    review: unknown;
    recorded_at: Date | null;
  };
  prospect_catalogue_grants: {
    catalogue_id: string;
    user_id: string;
  };
  prospect_catalogues: {
    id: string;
    owner_id: string;
  };
  prospect_events: {
    id: string;
    catalogue_id: string;
    prospect_id: string;
    kind: ProspectEventKind;
    actor_id: string;
    actor_name: string;
    outcome: ProspectStatus | null;
    previous_assignee_id: string | null;
    next_assignee_id: string | null;
    previous_assignee: string | null;
    next_assignee: string | null;
    note: string;
    created_at: Date;
    profile_changes: unknown | null;
  };
  prospect_facets: {
    catalogue_id: string;
    prospect_id: string;
    region: string;
    city: string;
    industry: string;
    identity_state: string;
    services: string[];
    search_text: string;
  };
  prospect_image_files: {
    catalogue_id: string;
    sha256: string;
    media_type: string;
    content: Uint8Array;
  };
  prospect_image_refs: {
    catalogue_id: string;
    prospect_id: string;
    sha256: string;
  };
  prospect_import_chunks: {
    catalogue_id: string;
    digest: string;
    position: number;
    content: Uint8Array;
  };
  prospect_imports: {
    catalogue_id: string;
    digest: string;
    byte_size: number;
    sequence: string;
    imported_by: string;
    completed_at: Date | null;
    metadata: unknown | null;
    report: unknown | null;
  };
  prospect_invitations: {
    catalogue_id: string;
    email: string;
    expires_at: Date;
    accepted_by: string | null;
    revoked_at: Date | null;
  };
  prospect_memberships: {
    catalogue_id: string;
    user_id: string;
    display_name: string;
    role: string;
    joined_email: string | null;
  };
  prospect_shares: {
    catalogue_id: string;
    prospect_id: string;
    user_id: string;
  };
  prospect_sources: {
    catalogue_id: string;
    prospect_id: string;
    source_rank: number;
    digest: string;
    source_time: Date | null;
    payload: unknown;
    cover_sha256: string | null;
  };
  prospect_todos: {
    catalogue_id: string;
    prospect_id: string;
    id: string;
    title: string;
    done: boolean;
    created_at: Date;
  };
  prospects: {
    catalogue_id: string;
    id: string;
    name: string;
    details: string;
    assignee_id: string | null;
    status: ProspectStatus;
    revision: number;
    edited_name: boolean;
    edited_details: boolean;
    research: unknown;
    linear_url: string | null;
    on_board: boolean;
  };
  shirt_designs: {
    project_id: string;
    artifact_id: string;
    collection: string;
    layout: unknown;
  };
  stage_review_history: {
    id: string;
    project_id: string;
    stage_id: string;
    content_revision: number;
    rationale: string;
    author_id: string;
    created_at: Date;
  };
  stage_reviews: {
    project_id: string;
    stage_id: string;
    reviewed: boolean;
    rationale: string;
    reviewed_by: string;
    reviewed_at: Date;
  };
  task_artifacts: {
    project_id: string;
    task_id: string;
    artifact_id: string;
    created_by: string;
    created_at: Date;
  };
}
