ALTER TABLE prospects ADD COLUMN on_board boolean NOT NULL DEFAULT false;
-- Handing off or releasing an active card ends its previous assignee's board membership.
CREATE FUNCTION release_prospect_board_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND OLD.on_board THEN NEW.on_board=false; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER release_prospect_board_on_handoff BEFORE UPDATE OF assignee_id ON prospects
FOR EACH ROW EXECUTE FUNCTION release_prospect_board_entry();
ALTER TABLE prospects ADD CONSTRAINT board_requires_assignee CHECK (NOT on_board OR assignee_id IS NOT NULL);
CREATE INDEX prospect_personal_board ON prospects(catalogue_id,assignee_id,status) WHERE on_board;
ALTER TABLE prospect_sources ADD COLUMN cover_sha256 text GENERATED ALWAYS AS
  ((payload->'attachments')->>(payload#>>'{index,thumbnail}')) STORED;
