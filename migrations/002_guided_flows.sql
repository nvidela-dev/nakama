CREATE TABLE project_flows (
  project_id uuid PRIMARY KEY REFERENCES projects(id),
  flow_id text NOT NULL CHECK (flow_id IN ('venture', 'creative')),
  template_version integer NOT NULL CHECK (template_version = 1),
  project_state text NOT NULL DEFAULT 'active' CHECK (project_state IN ('active', 'parked', 'finished_enough')),
  content_revision integer NOT NULL DEFAULT 0,
  selected_by text NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE node_answers (
  project_id uuid NOT NULL REFERENCES project_flows(project_id),
  node_id text NOT NULL,
  stage_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  content text NOT NULL CHECK (length(content) <= 20000),
  status text NOT NULL CHECK (status IN ('unanswered', 'draft', 'answered', 'skipped', 'blocked')),
  choice text,
  needs_review boolean NOT NULL DEFAULT false,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, node_id)
);
CREATE TABLE answer_revisions (
  project_id uuid NOT NULL,
  node_id text NOT NULL,
  revision integer NOT NULL,
  content text NOT NULL,
  status text NOT NULL,
  choice text,
  author_id text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('capture', 'human')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, node_id, revision),
  FOREIGN KEY (project_id, node_id) REFERENCES node_answers(project_id, node_id)
);
CREATE TABLE stage_reviews (
  project_id uuid NOT NULL REFERENCES project_flows(project_id),
  stage_id text NOT NULL,
  reviewed boolean NOT NULL,
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 1 AND 2000),
  reviewed_by text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, stage_id)
);
CREATE TABLE stage_review_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES project_flows(project_id),
  stage_id text NOT NULL,
  content_revision integer NOT NULL,
  rationale text NOT NULL,
  author_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
