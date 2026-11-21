ALTER TYPE prospect_event_kind ADD VALUE 'profile';
ALTER TABLE prospect_events ADD COLUMN profile_changes jsonb;
ALTER TABLE prospects
  ADD COLUMN edited_name boolean NOT NULL DEFAULT false,
  ADD COLUMN edited_details boolean NOT NULL DEFAULT false,
  ADD COLUMN research jsonb NOT NULL DEFAULT '{}';

-- The original package survives byte-for-byte. An unfinished upload is never a published import.
CREATE TABLE prospect_imports (
  catalogue_id text NOT NULL REFERENCES prospect_catalogues(id) ON DELETE CASCADE,
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 402653184),
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  imported_by text NOT NULL,
  completed_at timestamptz,
  metadata jsonb,
  report jsonb,
  PRIMARY KEY(catalogue_id,digest)
);
CREATE TABLE prospect_import_chunks (
  catalogue_id text NOT NULL,
  digest text NOT NULL,
  position integer NOT NULL CHECK(position >= 0),
  content bytea NOT NULL,
  PRIMARY KEY(catalogue_id,digest,position),
  FOREIGN KEY(catalogue_id,digest) REFERENCES prospect_imports ON DELETE CASCADE
);
-- Keep full databases, presentation exports and index-only exports independently.
CREATE TABLE prospect_sources (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  source_rank integer NOT NULL CHECK(source_rank BETWEEN 1 AND 3),
  digest text NOT NULL,
  source_time timestamptz,
  payload jsonb NOT NULL,
  PRIMARY KEY(catalogue_id,prospect_id,source_rank),
  FOREIGN KEY(catalogue_id,prospect_id) REFERENCES prospects ON DELETE CASCADE,
  FOREIGN KEY(catalogue_id,digest) REFERENCES prospect_imports ON DELETE CASCADE
);
CREATE TABLE prospect_image_files (
  catalogue_id text NOT NULL REFERENCES prospect_catalogues ON DELETE CASCADE,
  sha256 text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image/jpeg','image/png','image/webp')),
  content bytea NOT NULL,
  PRIMARY KEY(catalogue_id,sha256)
);
CREATE TABLE prospect_image_refs (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  PRIMARY KEY(catalogue_id,prospect_id,sha256),
  FOREIGN KEY(catalogue_id,prospect_id) REFERENCES prospects ON DELETE CASCADE
);
ALTER TABLE prospects DROP CONSTRAINT prospects_details_check;
