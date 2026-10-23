CREATE TABLE project_task_lists (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE project_tasks (
  id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id uuid,
  position integer GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','in_progress','done')),
  collapsed boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id,id),
  FOREIGN KEY (project_id,parent_id) REFERENCES project_tasks(project_id,id) ON DELETE CASCADE
);
CREATE INDEX project_tasks_order ON project_tasks(project_id,position);
CREATE TABLE project_task_imports (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  imported_by text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,fingerprint)
);
ALTER TABLE project_activity DROP CONSTRAINT project_activity_kind_check;
ALTER TABLE project_activity ADD CONSTRAINT project_activity_kind_check CHECK (kind IN (
 'project_created','project_edited','flow_selected','invitation_created','invitation_revoked','member_joined','member_removed',
 'comment_created','comment_edited','comment_deleted','comment_moderated',
 'task_created','task_edited','task_status_changed','task_deleted','tasks_imported'
));
