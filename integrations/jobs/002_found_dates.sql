-- Use the earliest dated appearance in the catalogue, including repeat appearances
-- of the same archived card. A report establishes discovery even without a source check.
CREATE OR REPLACE VIEW nakama_jobs.found_dates AS
WITH archived_links AS MATERIALIZED (
  SELECT b.opportunity_key, s.artifact_sha256
  FROM job_manager.observation_sources s
  JOIN job_manager.observations b USING (observation_key)
  WHERE b.payload ? 'historical_evidence_text'
), report_headers AS MATERIALIZED (
  SELECT a.sha256, a.body::jsonb->>'report_date' AS report_date
  FROM job_manager.source_artifacts a
  WHERE a.media_type = 'application/json' AND a.sha256 IN (SELECT artifact_sha256 FROM archived_links)
), appearances AS (
  SELECT l.opportunity_key, CASE WHEN h.report_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    AND pg_input_is_valid(h.report_date, 'date') THEN h.report_date::date END AS day
  FROM archived_links l JOIN report_headers h ON h.sha256 = l.artifact_sha256
  UNION ALL
  SELECT opportunity_key, least(observed_date,
    CASE WHEN first_seen_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND pg_input_is_valid(first_seen_raw, 'date')
           THEN first_seen_raw::date
         WHEN first_seen_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+(Z|[+-][0-9]{2}:[0-9]{2})$'
           AND pg_input_is_valid(first_seen_raw, 'timestamptz')
           THEN (first_seen_raw::timestamptz AT TIME ZONE 'America/Montevideo')::date END)
  FROM job_manager.observations WHERE NOT (payload ? 'historical_evidence_text')
)
SELECT 'e-' || md5(opportunity_key) AS id, min(day) AS found_on
FROM appearances WHERE day <= (now() AT TIME ZONE 'America/Montevideo')::date
GROUP BY opportunity_key;
