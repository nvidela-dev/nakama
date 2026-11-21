CREATE TYPE iteration_stage AS ENUM ('plan','run','review','follow_up');
ALTER TABLE experiments ADD COLUMN stage iteration_stage NOT NULL DEFAULT 'plan';
UPDATE experiments e SET stage=CASE
  WHEN EXISTS (SELECT 1 FROM experiment_reviews v WHERE v.project_id=e.project_id AND v.experiment_id=e.id) THEN 'follow_up'::iteration_stage
  WHEN EXISTS (SELECT 1 FROM experiment_runs r WHERE r.project_id=e.project_id AND r.experiment_id=e.id AND r.status='completed') THEN 'review'::iteration_stage
  WHEN EXISTS (SELECT 1 FROM experiment_runs r WHERE r.project_id=e.project_id AND r.experiment_id=e.id) THEN 'run'::iteration_stage
  ELSE 'plan'::iteration_stage END;
CREATE TABLE iteration_reflections (
 project_id uuid NOT NULL, experiment_id uuid NOT NULL, prompt text NOT NULL CHECK(prompt IN ('aim','observed','learned','next')),
 revision integer NOT NULL CHECK(revision>0), content text NOT NULL CHECK(char_length(btrim(content)) BETWEEN 1 AND 12000),
 author_id text NOT NULL, author_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id,experiment_id,prompt,revision),
 FOREIGN KEY(project_id,experiment_id) REFERENCES experiments(project_id,id) ON DELETE CASCADE
);
