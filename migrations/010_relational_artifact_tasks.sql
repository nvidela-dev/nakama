-- Keep artifact-wide revisions and task ordering while replacing the JSON collection.
CREATE TABLE artifact_tasks (
  project_id uuid NOT NULL,
  artifact_id uuid NOT NULL,
  id uuid NOT NULL,
  position integer NOT NULL CHECK (position BETWEEN 0 AND 99),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  status text NOT NULL CHECK (status IN ('ready','in_progress','done')),
  PRIMARY KEY (project_id,artifact_id,id),
  UNIQUE (project_id,artifact_id,position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (project_id,artifact_id) REFERENCES project_artifacts(project_id,id) ON DELETE CASCADE
);
INSERT INTO artifact_tasks(project_id,artifact_id,id,position,title,status)
  SELECT a.project_id,a.id,(t.value->>'id')::uuid,(t.ordinality-1)::integer,t.value->>'title',t.value->>'status'
  FROM project_artifacts a CROSS JOIN LATERAL jsonb_array_elements(a.tasks) WITH ORDINALITY AS t(value,ordinality);
ALTER TABLE project_artifacts DROP COLUMN tasks;

-- Size is derived from the stored bytes, never independently writable.
ALTER TABLE artifact_files DROP COLUMN size;
ALTER TABLE artifact_files ADD COLUMN size integer GENERATED ALWAYS AS (octet_length(data)) STORED;
