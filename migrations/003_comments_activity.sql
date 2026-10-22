ALTER TABLE project_flows ADD CONSTRAINT project_flow_identity UNIQUE (project_id, flow_id);
CREATE TABLE project_comments (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flow_id text,
  stage_id text,
  node_id text,
  author_id text NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by text,
  FOREIGN KEY (project_id, flow_id) REFERENCES project_flows(project_id, flow_id) ON DELETE CASCADE,
  CHECK ((flow_id IS NULL AND stage_id IS NULL AND node_id IS NULL) OR (flow_id IS NOT NULL AND stage_id IS NOT NULL)),
  CHECK ((deleted_at IS NULL AND deleted_by IS NULL AND length(content) BETWEEN 1 AND 4000) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND content = ''))
);
CREATE INDEX comments_by_target ON project_comments(project_id, stage_id, node_id, created_at DESC, id DESC);
CREATE TABLE project_activity (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('project_created','project_edited','flow_selected','invitation_created','invitation_revoked','member_joined','member_removed','comment_created','comment_edited','comment_deleted','comment_moderated')),
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  stage_id text,
  node_id text,
  comment_id uuid,
  subject_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_by_project ON project_activity(project_id, created_at DESC, id DESC);
CREATE INDEX revisions_by_project_time ON answer_revisions(project_id, created_at DESC);
CREATE INDEX reviews_by_project_time ON stage_review_history(project_id, created_at DESC);
