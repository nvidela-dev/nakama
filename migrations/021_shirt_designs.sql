-- Shirt designs specialize private image artifacts. Collection names are scoped to the shop.
CREATE TABLE shirt_designs (
  project_id uuid NOT NULL,
  artifact_id uuid NOT NULL,
  collection text NOT NULL CHECK (length(trim(collection)) BETWEEN 1 AND 80),
  layout jsonb NOT NULL CHECK (jsonb_typeof(layout) = 'object'),
  PRIMARY KEY (project_id, artifact_id),
  FOREIGN KEY (project_id, artifact_id) REFERENCES project_artifacts(project_id,id) ON DELETE CASCADE
);
