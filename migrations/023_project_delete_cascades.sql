-- Make the original project-owned rows participate in a single parent delete.

ALTER TABLE project_memberships
  DROP CONSTRAINT project_memberships_project_id_fkey,
  ADD CONSTRAINT project_memberships_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE;

ALTER TABLE project_invitations
  DROP CONSTRAINT project_invitations_project_id_fkey,
  ADD CONSTRAINT project_invitations_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE;

ALTER TABLE project_flows
  DROP CONSTRAINT project_flows_project_id_fkey,
  ADD CONSTRAINT project_flows_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE;

ALTER TABLE node_answers
  DROP CONSTRAINT node_answers_project_id_fkey,
  ADD CONSTRAINT node_answers_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES project_flows (project_id) ON DELETE CASCADE;

ALTER TABLE answer_revisions
  DROP CONSTRAINT answer_revisions_project_id_node_id_fkey,
  ADD CONSTRAINT answer_revisions_project_id_node_id_fkey FOREIGN KEY (project_id, node_id)
    REFERENCES node_answers (project_id, node_id) ON DELETE CASCADE;

ALTER TABLE stage_reviews
  DROP CONSTRAINT stage_reviews_project_id_fkey,
  ADD CONSTRAINT stage_reviews_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES project_flows (project_id) ON DELETE CASCADE;

ALTER TABLE stage_review_history
  DROP CONSTRAINT stage_review_history_project_id_fkey,
  ADD CONSTRAINT stage_review_history_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES project_flows (project_id) ON DELETE CASCADE;
