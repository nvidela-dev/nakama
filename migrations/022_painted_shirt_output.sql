-- A painted shirt can supply printable output without an uploaded image.
CREATE OR REPLACE FUNCTION validate_artifact_output(project uuid,artifact uuid) RETURNS void LANGUAGE plpgsql AS $$
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
  IF output.status='ready' AND ((output.kind='software' AND output.github_url IS NULL) OR (output.kind<>'software' AND file_count=0
    AND NOT EXISTS (
      SELECT 1 FROM shirt_designs s WHERE output.kind='image'
        AND s.project_id=project AND s.artifact_id=artifact
        AND jsonb_path_exists(s.layout, '$.ink[*] ? (@.tool == "paint" && @.paths.size() > 0)')
    ))) THEN
    RAISE EXCEPTION 'Ready artifact requires its output' USING ERRCODE='23514';
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION guard_artifact_output() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME IN ('artifact_files','shirt_designs') THEN
    IF TG_OP<>'DELETE' THEN PERFORM validate_artifact_output(NEW.project_id,NEW.artifact_id); END IF;
    IF TG_OP<>'INSERT' THEN PERFORM validate_artifact_output(OLD.project_id,OLD.artifact_id); END IF;
  ELSE
    IF TG_OP<>'DELETE' THEN PERFORM validate_artifact_output(NEW.project_id,NEW.id); END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER shirt_designs_lock BEFORE INSERT OR UPDATE OR DELETE ON shirt_designs
  FOR EACH ROW EXECUTE FUNCTION lock_artifact_output();
CREATE CONSTRAINT TRIGGER shirt_print_output_valid AFTER INSERT OR UPDATE OR DELETE ON shirt_designs
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_artifact_output();
