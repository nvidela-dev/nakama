-- The previous stage checks use PostgreSQL's default column constraint names.
ALTER TABLE nakama_jobs.tracking DROP CONSTRAINT tracking_stage_check,
  ADD CONSTRAINT tracking_stage_check CHECK (stage IN
    ('pursuing','applied','screening','interview','waiting','accepted','rejected','offer','closed'));

ALTER TABLE nakama_jobs.events DROP CONSTRAINT events_kind_check,
  ADD CONSTRAINT events_kind_check CHECK (kind IN
    ('application','contact','reply','interview','screening','outreach','feedback','offer','rejected','withdrawn','note')),
  ADD COLUMN round_type text,
  ADD COLUMN round_outcome text,
  ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 10),
  ADD COLUMN contact_method text CHECK (contact_method IN ('call','email','message')),
  ADD COLUMN direction text CHECK (direction IN ('inbound','outbound')),
  ADD COLUMN response text CHECK (response IN ('reply','no_reply')),
  ADD COLUMN contact_at timestamptz,
  ADD COLUMN follow_up date;

-- Separate intervals retain the original deadline after a later reply or stage correction.
CREATE TABLE nakama_jobs.stage_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id text NOT NULL,
  lead_id text NOT NULL,
  stage text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz CHECK (ended_at >= started_at),
  FOREIGN KEY (owner_id,lead_id) REFERENCES nakama_jobs.tracking(owner_id,lead_id)
);
CREATE UNIQUE INDEX job_current_stage_history ON nakama_jobs.stage_history(owner_id,lead_id) WHERE ended_at IS NULL;
CREATE INDEX job_stage_chronology ON nakama_jobs.stage_history(owner_id,lead_id,started_at DESC);
