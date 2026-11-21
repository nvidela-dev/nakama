-- Only normalized skill names are needed for comparison. Profiles follow the owner's account.
CREATE TABLE IF NOT EXISTS nakama_jobs.resume_profiles (
  owner_id text PRIMARY KEY,
  skills text[] NOT NULL CHECK (cardinality(skills) > 0)
);
ALTER TABLE nakama_jobs.manual_leads ADD COLUMN IF NOT EXISTS listed_skills text;

-- Read role-side qualifications only. Fit commentary can mention the candidate's own skills.
CREATE OR REPLACE VIEW nakama_jobs.role_requirements AS
SELECT DISTINCT 'e-' || md5(b.opportunity_key) AS lead_id, evidence.description
FROM job_manager.observations b
CROSS JOIN LATERAL (VALUES
  (b.payload->>'stack'), (b.payload->>'requirements'),
  (b.payload#>>'{structured_source,stack}'), (b.payload#>>'{structured_source,requirements}'),
  (b.payload#>>'{structured_source,observed}'),
  (b.payload#>>'{payload,stack}'), (b.payload#>>'{payload,requirements}'),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)\mObserved:\s*(.+?)\s*Fit\s*/\s*gaps:')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)Post evidence / requirements\s+(.+?)\s+Uncertainties')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)Observed requirements\s+(.+?)\s+Unknowns and caveats')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)What the listing asks for\s+(.+?)\s+Compensation, eligibility')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)Requirements / evidence\s+(.+?)\s+Questions to resolve')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)Requirements and screening gates\s+(.+?)\s+Research assessment')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)Stack and scope\s+(.+?)\s+Published compensation')),
  (substring(b.payload->>'historical_evidence_text' FROM '(?is)\mStack:\s*(.+?)\s*Fit\s*/\s*gaps:'))
) AS evidence(description)
WHERE nullif(trim(evidence.description),'') IS NOT NULL;
