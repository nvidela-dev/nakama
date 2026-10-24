// Generated from all SQL migrations by npm run db:types. Do not edit.
// Database timestamps are Date; int8/numeric remain strings with node-postgres defaults.
export const ActivityKindValues = ["project_created","project_edited","flow_selected","invitation_created","invitation_revoked","member_joined","member_removed","comment_created","comment_edited","comment_deleted","comment_moderated","task_created","task_edited","task_status_changed","task_deleted","tasks_imported","artifact_created","artifact_updated","artifact_deleted"] as const;
export type ActivityKind = (typeof ActivityKindValues)[number];
export const ArtifactKindValues = ["image","markdown","software"] as const;
export type ArtifactKind = (typeof ArtifactKindValues)[number];
export const ArtifactMediaTypeValues = ["image/png","image/jpeg","image/webp","image/gif","text/markdown"] as const;
export type ArtifactMediaType = (typeof ArtifactMediaTypeValues)[number];
export const ArtifactStatusValues = ["in_progress","ready"] as const;
export type ArtifactStatus = (typeof ArtifactStatusValues)[number];
export const FlowIdValues = ["venture","creative","investigation","eshop","shirt-eshop","saas","importation","consultancy","platform"] as const;
export type FlowId = (typeof FlowIdValues)[number];
export const MembershipRoleValues = ["owner","member"] as const;
export type MembershipRole = (typeof MembershipRoleValues)[number];
export const NodeStatusValues = ["unanswered","draft","answered","skipped","blocked"] as const;
export type NodeStatus = (typeof NodeStatusValues)[number];
export const ProjectStateValues = ["active","parked","finished_enough"] as const;
export type ProjectState = (typeof ProjectStateValues)[number];
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
    size: number | null;
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
  };
  projects: {
    id: string;
    name: string;
    description: string;
    created_at: Date;
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
}
