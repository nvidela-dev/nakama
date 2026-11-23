ALTER TABLE project_memberships ADD COLUMN profile_label_updated_at timestamptz;

-- Answer and review events previously looked up the roster label on every read.
-- Capture that label before the roster can change, including for older app writers.
ALTER TABLE answer_revisions ADD COLUMN author_name text;
ALTER TABLE stage_review_history ADD COLUMN author_name text;
UPDATE answer_revisions r SET author_name=m.display_name FROM project_memberships m
  WHERE m.project_id=r.project_id AND m.user_id=r.author_id;
UPDATE stage_review_history r SET author_name=m.display_name FROM project_memberships m
  WHERE m.project_id=r.project_id AND m.user_id=r.author_id;
CREATE FUNCTION snapshot_guidance_author() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT display_name INTO NEW.author_name FROM project_memberships
    WHERE project_id=NEW.project_id AND user_id=NEW.author_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_answer_author BEFORE INSERT ON answer_revisions
  FOR EACH ROW EXECUTE FUNCTION snapshot_guidance_author();
CREATE TRIGGER snapshot_review_author BEFORE INSERT ON stage_review_history
  FOR EACH ROW EXECUTE FUNCTION snapshot_guidance_author();
