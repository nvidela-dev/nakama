ALTER TABLE project_comments DROP CONSTRAINT project_comments_check;
ALTER TABLE project_comments ADD CONSTRAINT project_comments_check
  CHECK (
    ((flow_id IS NULL AND stage_id IS NULL AND node_id IS NULL) OR
     (stage_id IN ('tasks', 'artifacts') AND node_id IS NULL) OR
     (flow_id IS NOT NULL AND stage_id IS NOT NULL))
  );
