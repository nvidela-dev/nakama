-- Service checks give friendly feedback; database guards also cover scripts and future writers.
CREATE FUNCTION guard_project_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(734922);
  IF EXISTS (WITH RECURSIVE descendants(id) AS (
    SELECT child_id FROM project_links WHERE source_id=NEW.child_id
      AND (source_id,child_id) IS DISTINCT FROM (OLD.source_id,OLD.child_id)
    UNION SELECT l.child_id FROM project_links l JOIN descendants d ON l.source_id=d.id
      WHERE (l.source_id,l.child_id) IS DISTINCT FROM (OLD.source_id,OLD.child_id)
  ) SELECT 1 FROM descendants WHERE id=NEW.source_id) THEN
    RAISE EXCEPTION 'Circular project lineage' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_lineage_acyclic BEFORE INSERT OR UPDATE ON project_links FOR EACH ROW EXECUTE FUNCTION guard_project_lineage();

CREATE FUNCTION guard_task_ancestry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('tasks:' || NEW.project_id::text,0));
  IF EXISTS (WITH RECURSIVE ancestors(id,parent_id) AS (
    SELECT id,parent_id FROM project_tasks WHERE project_id=NEW.project_id AND id=NEW.parent_id
    UNION SELECT p.id,p.parent_id FROM project_tasks p JOIN ancestors a ON p.id=a.parent_id WHERE p.project_id=NEW.project_id
  ) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN
    RAISE EXCEPTION 'Circular task ancestry' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER project_tasks_acyclic BEFORE INSERT OR UPDATE OF parent_id,project_id ON project_tasks FOR EACH ROW EXECUTE FUNCTION guard_task_ancestry();

ALTER TABLE project_artifacts ADD CONSTRAINT github_output_kind CHECK (
  github_url IS NULL OR (kind='software' AND length(github_url)<=500 AND github_url ~ '^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+([/?#].*)?$')
);
CREATE FUNCTION guard_artifact_kind() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind<>OLD.kind THEN RAISE EXCEPTION 'Artifact kind is immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER artifact_kind_immutable BEFORE UPDATE OF kind ON project_artifacts FOR EACH ROW EXECUTE FUNCTION guard_artifact_kind();

CREATE FUNCTION validate_artifact_output(project uuid,artifact uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE output project_artifacts%ROWTYPE; file_count integer; invalid_file boolean;
BEGIN
  SELECT * INTO output FROM project_artifacts WHERE project_id=project AND id=artifact;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*),COALESCE(bool_or(
    (output.kind='image' AND media_type='text/markdown') OR
    (output.kind='markdown' AND (media_type<>'text/markdown' OR size>512000)) OR
    output.kind='software'),false)
    INTO file_count,invalid_file FROM artifact_files WHERE project_id=project AND artifact_id=artifact;
  IF invalid_file OR (output.kind='image' AND file_count>6) OR (output.kind='markdown' AND file_count>1) THEN
    RAISE EXCEPTION 'Artifact files do not match their kind or limits' USING ERRCODE='23514';
  END IF;
  IF output.status='ready' AND ((output.kind='software' AND output.github_url IS NULL) OR (output.kind<>'software' AND file_count=0)) THEN
    RAISE EXCEPTION 'Ready artifact requires its output' USING ERRCODE='23514';
  END IF;
END;
$$;
CREATE FUNCTION guard_artifact_output() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='artifact_files' THEN
    IF TG_OP<>'DELETE' THEN PERFORM validate_artifact_output(NEW.project_id,NEW.artifact_id); END IF;
    IF TG_OP<>'INSERT' THEN PERFORM validate_artifact_output(OLD.project_id,OLD.artifact_id); END IF;
  ELSE
    IF TG_OP<>'DELETE' THEN PERFORM validate_artifact_output(NEW.project_id,NEW.id); END IF;
  END IF;
  RETURN NULL;
END;
$$;
-- Check the final transaction state, allowing atomic Markdown replacement and readiness changes.
CREATE CONSTRAINT TRIGGER artifact_output_valid AFTER INSERT OR UPDATE ON project_artifacts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_artifact_output();
CREATE CONSTRAINT TRIGGER artifact_files_valid AFTER INSERT OR UPDATE OR DELETE ON artifact_files
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_artifact_output();
CREATE FUNCTION lock_artifact_output() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Serialize file writes per artifact, including writers outside the application service.
  IF TG_OP='INSERT' THEN
    PERFORM 1 FROM project_artifacts WHERE project_id=NEW.project_id AND id=NEW.artifact_id FOR UPDATE;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    PERFORM 1 FROM project_artifacts WHERE project_id=OLD.project_id AND id=OLD.artifact_id FOR UPDATE;
    RETURN OLD;
  ELSE
    PERFORM 1 FROM project_artifacts WHERE (project_id,id) IN ((OLD.project_id,OLD.artifact_id),(NEW.project_id,NEW.artifact_id)) ORDER BY project_id,id FOR UPDATE;
    RETURN NEW;
  END IF;
END;
$$;
CREATE TRIGGER artifact_files_lock BEFORE INSERT OR UPDATE OR DELETE ON artifact_files FOR EACH ROW EXECUTE FUNCTION lock_artifact_output();
DO $$
DECLARE artifact record;
BEGIN
  FOR artifact IN SELECT project_id,id FROM project_artifacts LOOP
    PERFORM validate_artifact_output(artifact.project_id,artifact.id);
  END LOOP;
  IF EXISTS (WITH RECURSIVE reach(source_id,child_id) AS (
    SELECT source_id,child_id FROM project_links
    UNION SELECT r.source_id,l.child_id FROM reach r JOIN project_links l ON l.source_id=r.child_id
  ) SELECT 1 FROM reach WHERE source_id=child_id) THEN
    RAISE EXCEPTION 'Existing project lineage contains a cycle';
  END IF;
  IF EXISTS (WITH RECURSIVE reach(project_id,id,parent_id) AS (
    SELECT project_id,id,parent_id FROM project_tasks WHERE parent_id IS NOT NULL
    UNION SELECT r.project_id,r.id,t.parent_id FROM reach r JOIN project_tasks t ON t.project_id=r.project_id AND t.id=r.parent_id WHERE t.parent_id IS NOT NULL
  ) SELECT 1 FROM reach WHERE id=parent_id) THEN
    RAISE EXCEPTION 'Existing task ancestry contains a cycle';
  END IF;
END;
$$;
