ALTER TABLE prospects ALTER COLUMN status SET DEFAULT 'assess_fit';

CREATE TABLE prospect_assessments (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  assessment jsonb NOT NULL CHECK (jsonb_typeof(assessment) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (catalogue_id, prospect_id),
  FOREIGN KEY (catalogue_id, prospect_id) REFERENCES prospects ON DELETE CASCADE
);

CREATE TABLE prospect_call_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  review jsonb NOT NULL CHECK (jsonb_typeof(review) = 'object'),
  recorded_at timestamptz,
  FOREIGN KEY (catalogue_id, prospect_id) REFERENCES prospects ON DELETE CASCADE
);
CREATE UNIQUE INDEX prospect_call_review_draft ON prospect_call_reviews (catalogue_id, prospect_id)
  WHERE recorded_at IS NULL;
CREATE INDEX prospect_call_review_history ON prospect_call_reviews (catalogue_id, prospect_id, id DESC)
  WHERE recorded_at IS NOT NULL;
