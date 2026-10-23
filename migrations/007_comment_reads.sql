CREATE TABLE comment_reads (
  comment_id uuid NOT NULL REFERENCES project_comments(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX comment_reads_by_user ON comment_reads(user_id, comment_id);
