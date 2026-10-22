CREATE TABLE projects (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE project_memberships (
  project_id uuid NOT NULL REFERENCES projects(id),
  user_id text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX memberships_by_user ON project_memberships(user_id, project_id);
CREATE TABLE project_invitations (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_by text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE UNIQUE INDEX one_pending_invite_per_email ON project_invitations(project_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
