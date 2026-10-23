CREATE TABLE project_artifacts (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flow_id text,
  stage_id text,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 4000),
  kind text NOT NULL CHECK (kind IN ('image','markdown','software')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','ready')),
  github_url text,
  tasks jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tasks)='array' AND jsonb_array_length(tasks)<=100),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,id),
  FOREIGN KEY(project_id,flow_id) REFERENCES project_flows(project_id,flow_id),
  CHECK ((flow_id IS NULL AND stage_id IS NULL) OR (flow_id IS NOT NULL AND stage_id IS NOT NULL))
);
CREATE INDEX artifacts_by_project ON project_artifacts(project_id,updated_at DESC,id);
CREATE TABLE artifact_files (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  artifact_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 180),
  media_type text NOT NULL CHECK (media_type IN ('image/png','image/jpeg','image/webp','image/gif','text/markdown')),
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 2097152),
  size integer NOT NULL CHECK (size=octet_length(data)),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  FOREIGN KEY(project_id,artifact_id) REFERENCES project_artifacts(project_id,id) ON DELETE CASCADE
);
CREATE INDEX files_by_artifact ON artifact_files(project_id,artifact_id,created_at,id);
ALTER TABLE project_activity DROP CONSTRAINT project_activity_kind_check;
ALTER TABLE project_activity ADD CONSTRAINT project_activity_kind_check CHECK (kind IN (
 'project_created','project_edited','flow_selected','invitation_created','invitation_revoked','member_joined','member_removed',
 'comment_created','comment_edited','comment_deleted','comment_moderated',
 'task_created','task_edited','task_status_changed','task_deleted','tasks_imported',
 'artifact_created','artifact_updated','artifact_deleted'
));
