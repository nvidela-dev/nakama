ALTER TABLE prospect_invitations
  ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN accepted_by text,
  ADD COLUMN revoked_at timestamptz;
