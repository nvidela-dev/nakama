CREATE SCHEMA job_manager;
CREATE TABLE job_manager.opportunities(canonical_key text PRIMARY KEY, company text, title text, canonical_url text);
CREATE TABLE job_manager.observations(observation_key text PRIMARY KEY,opportunity_key text,observed_date date,first_seen_raw text,company_type text,employment text,startup boolean,status_observed text,source_url text,payload jsonb,classification_evidence text);
INSERT INTO job_manager.opportunities VALUES ('fixture','Example Labs','Platform engineer','https://example.invalid/role'),('older','Example Staffing','Archived designer',null),('undated','Example Three','Unknown role',null);
INSERT INTO job_manager.observations VALUES
('a','fixture',(now() AT TIME ZONE 'America/Montevideo')::date,'Seen today','PRODUCT COMPANY','Contractor',true,'open','https://www.linkedin.com/jobs/example','{"fit":"TypeScript experience"}','Direct evidence'),
('b','older',(now() AT TIME ZONE 'America/Montevideo')::date,'Unknown','consultancy','employee',null,'open','https://example.invalid/old','{"historical_evidence_text":"Archived evidence"}','Old evidence');
CREATE TABLE job_manager.source_artifacts(sha256 text PRIMARY KEY, media_type text, body text);
CREATE TABLE job_manager.observation_sources(observation_key text, artifact_sha256 text);
INSERT INTO job_manager.source_artifacts VALUES
('early','application/json','{"report_date":"2020-12-27"}'), ('late','application/json','{"report_date":"2021-01-04"}');
INSERT INTO job_manager.observation_sources VALUES ('b','early'), ('b','late');
