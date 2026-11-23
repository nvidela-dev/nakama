ALTER TABLE artifact_files ALTER COLUMN size SET NOT NULL;
CREATE INDEX invitations_by_project ON project_invitations(project_id, created_at DESC);
CREATE INDEX comments_by_project_active ON project_comments(project_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER project_tasks_acyclic ON project_tasks;
CREATE TRIGGER project_tasks_acyclic BEFORE INSERT OR UPDATE OF parent_id, project_id ON project_tasks
  FOR EACH ROW WHEN (NEW.parent_id IS NOT NULL) EXECUTE FUNCTION guard_task_ancestry();

-- Older application versions can still submit a flow alongside section comments.
CREATE FUNCTION normalize_comment_section() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.flow_id := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER normalize_comment_section BEFORE INSERT OR UPDATE OF stage_id, flow_id ON project_comments
  FOR EACH ROW WHEN (NEW.stage_id IN ('tasks', 'artifacts')) EXECUTE FUNCTION normalize_comment_section();
UPDATE project_comments SET flow_id=NULL WHERE stage_id IN ('tasks','artifacts') AND flow_id IS NOT NULL;
ALTER TABLE project_comments DROP CONSTRAINT project_comments_check;
ALTER TABLE project_comments ADD CONSTRAINT project_comments_scope CHECK (
  (stage_id IS NULL AND node_id IS NULL AND flow_id IS NULL)
  OR (stage_id IS NOT NULL AND stage_id IN ('tasks','artifacts') AND node_id IS NULL AND flow_id IS NULL)
  OR (stage_id IS NOT NULL AND stage_id NOT IN ('tasks','artifacts') AND flow_id IS NOT NULL)
);

ALTER TABLE project_artifacts DROP CONSTRAINT project_artifacts_project_id_flow_id_fkey,
  ADD FOREIGN KEY(project_id,flow_id) REFERENCES project_flows(project_id,flow_id) ON DELETE CASCADE;
-- Preserve legacy text and event timestamps verbatim; enforce these rules on new writes.
ALTER TABLE projects ADD CHECK (btrim(name) <> '' AND btrim(description) <> '') NOT VALID;
ALTER TABLE project_tasks ADD CHECK (btrim(title) <> '') NOT VALID;
ALTER TABLE stage_reviews ADD CHECK (btrim(rationale) <> '') NOT VALID;
ALTER TABLE project_artifacts ADD CHECK (btrim(name) <> '') NOT VALID;
ALTER TABLE artifact_files ADD CHECK (btrim(name) <> '') NOT VALID;
ALTER TABLE project_invitations ADD CHECK (accepted_at IS NULL OR revoked_at IS NULL) NOT VALID,
  ADD CHECK (email = lower(btrim(email))) NOT VALID;
ALTER TABLE project_comments ADD CHECK (deleted_at IS NOT NULL OR btrim(content) <> '') NOT VALID,
  ADD CHECK (edited_at IS NULL OR (revision > 1 AND edited_at >= created_at)) NOT VALID,
  ADD CHECK (deleted_at IS NULL OR deleted_at >= COALESCE(edited_at,created_at)) NOT VALID;
