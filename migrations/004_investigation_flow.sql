ALTER TABLE project_flows DROP CONSTRAINT project_flows_flow_id_check;
ALTER TABLE project_flows ADD CONSTRAINT project_flows_flow_id_check
  CHECK (flow_id IN ('venture', 'creative', 'investigation'));
