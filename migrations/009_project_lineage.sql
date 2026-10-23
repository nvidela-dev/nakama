CREATE TABLE project_links (
  source_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id,child_id),
  CHECK (source_id <> child_id)
);
CREATE INDEX project_links_by_child ON project_links(child_id,source_id);
