CREATE TABLE prospect_catalogues (
  id text PRIMARY KEY CHECK(id='business'),
  owner_id text NOT NULL
);
CREATE TABLE prospect_memberships (
  catalogue_id text NOT NULL REFERENCES prospect_catalogues(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK(role IN ('owner','member')),
  joined_email text,
  PRIMARY KEY(catalogue_id,user_id)
);
CREATE UNIQUE INDEX prospect_catalogue_owner ON prospect_memberships(catalogue_id) WHERE role='owner';
CREATE TABLE prospect_invitations (
  catalogue_id text NOT NULL REFERENCES prospect_catalogues(id) ON DELETE CASCADE,
  email text NOT NULL,
  PRIMARY KEY(catalogue_id,email)
);
CREATE TYPE prospect_status AS ENUM ('ready','in_progress','deal','rejected');
CREATE TYPE prospect_event_kind AS ENUM ('assignment','call','message','reply','note','membership_ended');

CREATE TABLE prospects (
  catalogue_id text NOT NULL REFERENCES prospect_catalogues(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  assignee_id text,
  status prospect_status NOT NULL DEFAULT 'ready',
  revision integer NOT NULL DEFAULT 0,
  PRIMARY KEY (catalogue_id,id),
  FOREIGN KEY (catalogue_id,assignee_id) REFERENCES prospect_memberships(catalogue_id,user_id)
    ON DELETE SET NULL (assignee_id)
);
CREATE INDEX prospects_by_assignee ON prospects(catalogue_id,assignee_id);

CREATE TABLE prospect_catalogue_grants (
  catalogue_id text NOT NULL,
  user_id text NOT NULL,
  PRIMARY KEY (catalogue_id,user_id),
  FOREIGN KEY (catalogue_id,user_id) REFERENCES prospect_memberships(catalogue_id,user_id) ON DELETE CASCADE
);

CREATE TABLE prospect_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  kind prospect_event_kind NOT NULL,
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  outcome prospect_status CHECK (outcome IN ('deal','rejected')),
  previous_assignee_id text,
  next_assignee_id text,
  previous_assignee text,
  next_assignee text,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (catalogue_id,prospect_id) REFERENCES prospects(catalogue_id,id) ON DELETE CASCADE
);
CREATE INDEX prospect_events_timeline ON prospect_events(catalogue_id,prospect_id,id DESC);

-- Membership removal also ends assignments. Preserve this transition across a later re-invitation.
CREATE FUNCTION end_prospect_assignments() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  WITH released AS (
    UPDATE prospects SET assignee_id=NULL, revision=revision+1
    WHERE catalogue_id=OLD.catalogue_id AND assignee_id=OLD.user_id RETURNING catalogue_id,id
  )
  INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,previous_assignee_id,previous_assignee)
    SELECT catalogue_id,id,'membership_ended',OLD.user_id,OLD.display_name,OLD.user_id,OLD.display_name FROM released;
  RETURN OLD;
END;
$$;
CREATE TRIGGER end_prospect_assignments_before_removal BEFORE DELETE ON prospect_memberships
FOR EACH ROW EXECUTE FUNCTION end_prospect_assignments();

CREATE TABLE prospect_shares (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  user_id text NOT NULL,
  PRIMARY KEY(catalogue_id,prospect_id,user_id),
  FOREIGN KEY(catalogue_id,prospect_id) REFERENCES prospects ON DELETE CASCADE,
  FOREIGN KEY(catalogue_id,user_id) REFERENCES prospect_memberships ON DELETE CASCADE
);
