-- Run as the evidence database owner after creating a dedicated LOGIN named nakama_jobs_app.
GRANT USAGE ON SCHEMA nakama_jobs TO nakama_jobs_app;
GRANT SELECT ON nakama_jobs.discoveries,nakama_jobs.evidence,nakama_jobs.found_dates TO nakama_jobs_app;
GRANT SELECT,INSERT ON nakama_jobs.manual_leads,nakama_jobs.events TO nakama_jobs_app;
GRANT SELECT,INSERT ON nakama_jobs.tracking TO nakama_jobs_app;
GRANT UPDATE(stage,next_action,follow_up,revision,linear_url) ON nakama_jobs.tracking TO nakama_jobs_app;
