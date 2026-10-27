CREATE TABLE milestone_template_flows (template_id text NOT NULL, flow_id flow_id NOT NULL, PRIMARY KEY(template_id,flow_id));
CREATE TABLE milestone_columns (template_id text NOT NULL,column_id text NOT NULL,status task_status NOT NULL,position integer NOT NULL,PRIMARY KEY(template_id,column_id));
INSERT INTO milestone_template_flows VALUES ('build_sprint','venture'),('build_sprint','saas'),('build_sprint','platform');
INSERT INTO milestone_columns VALUES ('build_sprint','backlog','ready',0),('build_sprint','in_progress','in_progress',1),('build_sprint','review','in_progress',2),('build_sprint','done','done',3);
INSERT INTO milestone_template_flows VALUES ('release_rollout','venture'),('release_rollout','saas'),('release_rollout','eshop'),('release_rollout','platform');
INSERT INTO milestone_columns VALUES ('release_rollout','prep','ready',0),('release_rollout','staging','in_progress',1),('release_rollout','live_check','in_progress',2),('release_rollout','shipped','done',3);
INSERT INTO milestone_template_flows VALUES ('creative_session','creative');
INSERT INTO milestone_columns VALUES ('creative_session','ideas','ready',0),('creative_session','making','in_progress',1),('creative_session','polishing','in_progress',2),('creative_session','published','done',3);
INSERT INTO milestone_template_flows VALUES ('garment_run','shirt-eshop');
INSERT INTO milestone_columns VALUES ('garment_run','artwork','ready',0),('garment_run','sampling','in_progress',1),('garment_run','printing','in_progress',2),('garment_run','qc_packed','done',3);
INSERT INTO milestone_template_flows VALUES ('catalog_drop','eshop'),('catalog_drop','shirt-eshop');
INSERT INTO milestone_columns VALUES ('catalog_drop','sourcing','ready',0),('catalog_drop','listing_photo','in_progress',1),('catalog_drop','launch_ready','in_progress',2),('catalog_drop','live','done',3);
INSERT INTO milestone_template_flows VALUES ('shipment_pilot','importation');
INSERT INTO milestone_columns VALUES ('shipment_pilot','supplier_po','ready',0),('shipment_pilot','in_transit','in_progress',1),('shipment_pilot','customs_qc','in_progress',2),('shipment_pilot','landed','done',3);
INSERT INTO milestone_template_flows VALUES ('client_delivery','consultancy'),('client_delivery','investigation');
INSERT INTO milestone_columns VALUES ('client_delivery','scoped','ready',0),('client_delivery','drafting','in_progress',1),('client_delivery','client_review','in_progress',2),('client_delivery','delivered','done',3);
INSERT INTO milestone_template_flows VALUES ('practice_cycle','self-improvement');
INSERT INTO milestone_columns VALUES ('practice_cycle','planned','ready',0),('practice_cycle','practicing','in_progress',1),('practice_cycle','reflecting','in_progress',2),('practice_cycle','reviewed','done',3);
CREATE TYPE milestone_status AS ENUM ('active','completed','archived');
CREATE TABLE project_milestones (
 id uuid NOT NULL DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 flow_id flow_id NOT NULL, template_id text NOT NULL, title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160), description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 status milestone_status NOT NULL DEFAULT 'active', position integer NOT NULL CHECK(position>=0), created_by text NOT NULL, updated_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,id),
 FOREIGN KEY(template_id,flow_id) REFERENCES milestone_template_flows(template_id,flow_id)
);
ALTER TABLE project_tasks ADD COLUMN milestone_id uuid, ADD COLUMN column_id text, ADD COLUMN board_position integer NOT NULL DEFAULT 0 CHECK(board_position>=0),
 ADD CONSTRAINT task_board_membership CHECK((milestone_id IS NULL)=(column_id IS NULL)),
 ADD FOREIGN KEY(project_id,milestone_id) REFERENCES project_milestones(project_id,id);
CREATE INDEX task_board_order ON project_tasks(project_id,milestone_id,column_id,board_position);
CREATE TABLE task_artifacts (
 project_id uuid NOT NULL,task_id uuid NOT NULL,artifact_id uuid NOT NULL,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,task_id,artifact_id),
 FOREIGN KEY(project_id,task_id) REFERENCES project_tasks(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,artifact_id) REFERENCES project_artifacts(project_id,id) ON DELETE CASCADE
);
CREATE FUNCTION guard_task_milestone_column() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE template text; mapped task_status;
BEGIN
 IF NEW.milestone_id IS NULL THEN NEW.column_id:=NULL; RETURN NEW; END IF;
 SELECT template_id INTO template FROM project_milestones WHERE project_id=NEW.project_id AND id=NEW.milestone_id;
 IF TG_OP='UPDATE' AND NEW.milestone_id IS NOT DISTINCT FROM OLD.milestone_id AND NEW.column_id IS NOT DISTINCT FROM OLD.column_id AND NEW.status<>OLD.status THEN
   SELECT column_id INTO NEW.column_id FROM milestone_columns WHERE template_id=template AND status=NEW.status ORDER BY position LIMIT 1;
 END IF;
 SELECT status INTO mapped FROM milestone_columns WHERE template_id=template AND column_id=NEW.column_id;
 IF mapped IS NULL THEN RAISE EXCEPTION 'Invalid milestone column' USING ERRCODE='23514'; END IF;
 NEW.status:=mapped; RETURN NEW;
END $$;
CREATE TRIGGER task_milestone_column BEFORE INSERT OR UPDATE OF milestone_id,column_id,status ON project_tasks FOR EACH ROW EXECUTE FUNCTION guard_task_milestone_column();
CREATE FUNCTION guard_milestone_flow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM project_flows WHERE project_id=NEW.project_id AND flow_id=NEW.flow_id) THEN RAISE EXCEPTION 'Milestone flow mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER milestone_flow BEFORE INSERT OR UPDATE OF flow_id,project_id ON project_milestones FOR EACH ROW EXECUTE FUNCTION guard_milestone_flow();
