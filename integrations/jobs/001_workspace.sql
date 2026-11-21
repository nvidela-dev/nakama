-- Run in the existing job evidence database, separately from Nakama's project migrations.
CREATE SCHEMA IF NOT EXISTS nakama_jobs;

CREATE OR REPLACE VIEW nakama_jobs.evidence AS
SELECT 'e-' || md5(o.canonical_key) AS lead_id, b.observation_key,
       b.observed_date, b.first_seen_raw, b.company_type, b.employment, b.startup,
       b.status_observed, b.source_url, b.payload ? 'historical_evidence_text' AS historical,
       CASE WHEN jsonb_typeof(b.payload->'fit')='string' THEN b.payload->>'fit'
            WHEN jsonb_typeof(b.payload->'fit_evidence')='string' THEN b.payload->>'fit_evidence'
            ELSE NULL END AS relevance,
       b.classification_evidence,
       coalesce(b.payload->>'historical_evidence_text',
                CASE WHEN jsonb_typeof(b.payload->'evidence')='string' THEN b.payload->>'evidence' END,
                CASE WHEN jsonb_typeof(b.payload->'requirements')='string' THEN b.payload->>'requirements' END) AS evidence_text,
       EXISTS (SELECT FROM unnest(ARRAY[b.source_url,b.payload->>'post_url',b.payload->>'discovery_url',b.payload->>'source_url']) AS links(url)
               WHERE url ~* '^https?://([a-z0-9-]+[.])*(linkedin[.]com|lnkd[.]in)([/:?#]|$)')
       OR coalesce(b.payload->>'source_category', '') ~* '^linkedin($|[ _/-])'
       OR coalesce(b.payload->>'source', '') ~* '^linkedin($|[ _/-])' AS from_linkedin
FROM job_manager.opportunities o JOIN job_manager.observations b ON b.opportunity_key=o.canonical_key;

CREATE OR REPLACE VIEW nakama_jobs.discoveries AS
WITH ranked AS (
 SELECT e.*, min(observed_date) OVER (PARTITION BY lead_id) AS first_observed,
   max(observed_date) FILTER (WHERE NOT historical AND status_observed IS NOT NULL) OVER (PARTITION BY lead_id) AS last_checked,
   row_number() OVER (PARTITION BY lead_id ORDER BY observed_date DESC NULLS LAST,historical,observation_key) AS position
 FROM nakama_jobs.evidence e
)
SELECT 'e-' || md5(o.canonical_key) AS id, o.company, o.title, coalesce(nullif(o.canonical_url,''),e.source_url) AS url,
       e.first_observed, e.first_seen_raw, e.last_checked,
       CASE WHEN NOT e.historical AND e.observed_date=(now() AT TIME ZONE 'America/Montevideo')::date
             AND (lower(trim(e.status_observed)) IN ('open','official_jd_available')
                  OR lower(e.status_observed) ~ '^live official jd($|;| reverified(;|$))')
             AND lower(e.status_observed) !~ '(unverified|unconfirmed|not confirmed|not live|not available|unavailable|closed|filled|on hold|indexed|cached|403|404|no longer)'
             THEN 'current'
            WHEN e.historical OR e.observed_date < (now() AT TIME ZONE 'America/Montevideo')::date THEN 'historical'
            ELSE 'unknown' END AS availability,
       e.relevance, e.company_type, e.employment, e.startup
FROM job_manager.opportunities o LEFT JOIN ranked e ON e.lead_id='e-' || md5(o.canonical_key) AND e.position=1;

CREATE TABLE IF NOT EXISTS nakama_jobs.manual_leads (
 id text PRIMARY KEY, owner_id text NOT NULL, company text NOT NULL, title text NOT NULL, url text,
 first_observed date NOT NULL, relevance text
);
CREATE TABLE IF NOT EXISTS nakama_jobs.tracking (
 owner_id text NOT NULL, lead_id text NOT NULL, stage text CHECK(stage IN ('pursuing','applied','interview','offer','closed')),
 next_action text NOT NULL DEFAULT '', follow_up date, revision integer NOT NULL DEFAULT 0,
 linear_id uuid NOT NULL DEFAULT gen_random_uuid(), linear_url text, PRIMARY KEY(owner_id,lead_id), UNIQUE(linear_id)
);
CREATE TABLE IF NOT EXISTS nakama_jobs.events (
 id uuid PRIMARY KEY, owner_id text NOT NULL, lead_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('application','contact','reply','interview','feedback','offer','rejected','withdrawn','note')),
 occurred_on date NOT NULL, detail text NOT NULL, practice text NOT NULL DEFAULT '', recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (owner_id,lead_id) REFERENCES nakama_jobs.tracking(owner_id,lead_id)
);
CREATE INDEX IF NOT EXISTS job_event_history ON nakama_jobs.events(owner_id,lead_id,occurred_on DESC, recorded_at DESC);
