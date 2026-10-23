CREATE TYPE membership_role AS ENUM ('owner','member');
CREATE TYPE node_status AS ENUM ('unanswered','draft','answered','skipped','blocked');
CREATE TYPE task_status AS ENUM ('ready','in_progress','done');
CREATE TYPE artifact_kind AS ENUM ('image','markdown','software');
CREATE TYPE artifact_status AS ENUM ('in_progress','ready');
CREATE TYPE project_state AS ENUM ('active','parked','finished_enough');
CREATE TYPE revision_origin AS ENUM ('capture','human');
CREATE TYPE artifact_media_type AS ENUM ('image/png','image/jpeg','image/webp','image/gif','text/markdown');
CREATE TYPE activity_kind AS ENUM (
 'project_created','project_edited','flow_selected','invitation_created','invitation_revoked','member_joined','member_removed',
 'comment_created','comment_edited','comment_deleted','comment_moderated',
 'task_created','task_edited','task_status_changed','task_deleted','tasks_imported',
 'artifact_created','artifact_updated','artifact_deleted'
);
ALTER TABLE project_memberships DROP CONSTRAINT project_memberships_role_check;
ALTER TABLE project_memberships ALTER COLUMN role TYPE membership_role USING role::membership_role;
ALTER TABLE node_answers DROP CONSTRAINT node_answers_status_check;
ALTER TABLE node_answers ALTER COLUMN status TYPE node_status USING status::node_status;
ALTER TABLE answer_revisions ALTER COLUMN status TYPE node_status USING status::node_status;
ALTER TABLE answer_revisions DROP CONSTRAINT answer_revisions_origin_check;
ALTER TABLE answer_revisions ALTER COLUMN origin TYPE revision_origin USING origin::revision_origin;
ALTER TABLE project_tasks DROP CONSTRAINT project_tasks_status_check;
ALTER TABLE project_tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE project_tasks ALTER COLUMN status TYPE task_status USING status::task_status;
ALTER TABLE project_tasks ALTER COLUMN status SET DEFAULT 'ready';
ALTER TABLE artifact_tasks DROP CONSTRAINT artifact_tasks_status_check;
ALTER TABLE artifact_tasks ALTER COLUMN status TYPE task_status USING status::task_status;
ALTER TABLE project_artifacts DROP CONSTRAINT project_artifacts_kind_check;
ALTER TABLE project_artifacts DROP CONSTRAINT project_artifacts_status_check;
ALTER TABLE project_artifacts ALTER COLUMN kind TYPE artifact_kind USING kind::artifact_kind;
ALTER TABLE project_artifacts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE project_artifacts ALTER COLUMN status TYPE artifact_status USING status::artifact_status;
ALTER TABLE project_artifacts ALTER COLUMN status SET DEFAULT 'in_progress';
ALTER TABLE artifact_files DROP CONSTRAINT artifact_files_media_type_check;
ALTER TABLE artifact_files ALTER COLUMN media_type TYPE artifact_media_type USING media_type::artifact_media_type;
ALTER TABLE project_flows DROP CONSTRAINT project_flows_project_state_check;
ALTER TABLE project_flows ALTER COLUMN project_state DROP DEFAULT;
ALTER TABLE project_flows ALTER COLUMN project_state TYPE project_state USING project_state::project_state;
ALTER TABLE project_flows ALTER COLUMN project_state SET DEFAULT 'active';
ALTER TABLE project_activity DROP CONSTRAINT project_activity_kind_check;
ALTER TABLE project_activity ALTER COLUMN kind TYPE activity_kind USING kind::activity_kind;

ALTER TABLE project_flows ADD CONSTRAINT nonnegative_content_revision CHECK (content_revision >= 0);
ALTER TABLE answer_revisions ADD CONSTRAINT positive_answer_revision CHECK (revision > 0);
ALTER TABLE answer_revisions ADD CONSTRAINT bounded_revision_content CHECK (length(content) <= 20000);
ALTER TABLE stage_review_history ADD CONSTRAINT nonnegative_review_revision CHECK (content_revision >= 0);
ALTER TABLE stage_review_history ADD CONSTRAINT bounded_review_rationale CHECK (length(btrim(rationale)) BETWEEN 1 AND 2000);
ALTER TABLE project_invitations ADD CONSTRAINT invitation_expiry_after_creation CHECK (expires_at > created_at);
ALTER TABLE project_tasks ADD CONSTRAINT task_not_own_parent CHECK (id IS DISTINCT FROM parent_id);
ALTER TABLE project_comments ADD CONSTRAINT project_comment_identity UNIQUE (project_id,id);
ALTER TABLE project_activity ADD CONSTRAINT activity_comment_same_project
  FOREIGN KEY (project_id,comment_id) REFERENCES project_comments(project_id,id) ON DELETE CASCADE;
CREATE INDEX activity_by_comment ON project_activity(project_id,comment_id) WHERE comment_id IS NOT NULL;
CREATE TYPE flow_id AS ENUM ('venture','creative','investigation','eshop','shirt-eshop','saas','importation','consultancy');
ALTER TABLE project_comments DROP CONSTRAINT project_comments_project_id_flow_id_fkey;
ALTER TABLE project_artifacts DROP CONSTRAINT project_artifacts_project_id_flow_id_fkey;
ALTER TABLE project_flows DROP CONSTRAINT project_flows_flow_id_check;
ALTER TABLE project_flows ALTER COLUMN flow_id TYPE flow_id USING flow_id::flow_id;
ALTER TABLE project_comments ALTER COLUMN flow_id TYPE flow_id USING flow_id::flow_id;
ALTER TABLE project_artifacts ALTER COLUMN flow_id TYPE flow_id USING flow_id::flow_id;
ALTER TABLE project_comments ADD FOREIGN KEY (project_id,flow_id) REFERENCES project_flows(project_id,flow_id) ON DELETE CASCADE;
ALTER TABLE project_artifacts ADD FOREIGN KEY (project_id,flow_id) REFERENCES project_flows(project_id,flow_id);
CREATE INDEX tasks_by_parent ON project_tasks(project_id,parent_id);
ALTER TABLE node_answers ADD CONSTRAINT answer_state_content CHECK (
  (status NOT IN ('answered','skipped','blocked') OR length(btrim(content))>0) AND
  (status<>'unanswered' OR content='')
);
ALTER TABLE answer_revisions ADD CONSTRAINT revision_state_content CHECK (
  (status NOT IN ('answered','skipped','blocked') OR length(btrim(content))>0) AND
  (status<>'unanswered' OR content='')
);
ALTER TABLE project_tasks ADD CONSTRAINT task_sibling_order UNIQUE(project_id,position);
