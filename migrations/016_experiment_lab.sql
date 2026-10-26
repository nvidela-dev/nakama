CREATE TYPE lab_run_status AS ENUM ('running','completed','cancelled');
CREATE TYPE lab_evidence_kind AS ENUM ('ai_analysis','external_evidence','measurement','observation');
CREATE TYPE lab_assessment AS ENUM ('supported','contradicted','inconclusive');
CREATE TYPE lab_next_action AS ENUM ('continue','revise','stop');
CREATE TYPE lab_proposal_status AS ENUM ('pending','accepted','edited','rejected');
CREATE TABLE experiments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0), created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,id)
);
CREATE TABLE experiment_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, experiment_id uuid NOT NULL,
 version integer NOT NULL CHECK(version > 0), definition jsonb NOT NULL CHECK(jsonb_typeof(definition)='object'),
 author_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,experiment_id) REFERENCES experiments(project_id,id) ON DELETE CASCADE,
 UNIQUE(project_id,experiment_id,id), UNIQUE(experiment_id,version)
);
CREATE TABLE experiment_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, experiment_id uuid NOT NULL, plan_id uuid NOT NULL,
 context jsonb NOT NULL CHECK(jsonb_typeof(context)='object'), status lab_run_status NOT NULL DEFAULT 'running',
 executor text NOT NULL, started_by text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
 effort_minutes integer CHECK(effort_minutes >= 0), cost text, deviations text NOT NULL DEFAULT '',
 FOREIGN KEY(project_id,experiment_id,plan_id) REFERENCES experiment_plans(project_id,experiment_id,id) ON DELETE CASCADE,
 UNIQUE(project_id,experiment_id,id), CHECK((status='running')=(ended_at IS NULL))
);
CREATE TABLE experiment_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, experiment_id uuid NOT NULL, run_id uuid NOT NULL,
 kind lab_evidence_kind NOT NULL, content text NOT NULL CHECK(length(trim(content)) > 0), source text NOT NULL CHECK(length(trim(source)) > 0),
 measurement text, unit text, author_id text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,experiment_id,run_id) REFERENCES experiment_runs(project_id,experiment_id,id) ON DELETE CASCADE
);
CREATE TABLE experiment_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, experiment_id uuid NOT NULL, run_id uuid NOT NULL,
 assessment lab_assessment NOT NULL, next_action lab_next_action NOT NULL, rationale text NOT NULL CHECK(length(trim(rationale)) > 0),
 reconciliation text NOT NULL DEFAULT '', snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 author_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,experiment_id,run_id) REFERENCES experiment_runs(project_id,experiment_id,id) ON DELETE CASCADE
);
CREATE TABLE experiment_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, experiment_id uuid NOT NULL, run_id uuid NOT NULL,
 agent text NOT NULL, content text NOT NULL, source text NOT NULL, status lab_proposal_status NOT NULL DEFAULT 'pending',
 submitted_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), reviewer_id text, reviewed_at timestamptz,
 review_note text, accepted_content text,
 FOREIGN KEY(project_id,experiment_id,run_id) REFERENCES experiment_runs(project_id,experiment_id,id) ON DELETE CASCADE,
 CHECK((status='pending')=(reviewed_at IS NULL))
);
CREATE INDEX experiment_evidence_run_idx ON experiment_evidence(project_id,experiment_id,run_id);
CREATE INDEX experiment_reviews_run_idx ON experiment_reviews(project_id,experiment_id,run_id);
CREATE INDEX experiment_proposals_run_idx ON experiment_proposals(project_id,experiment_id,run_id);
