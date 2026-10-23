-- task_sibling_order already supplies a unique btree on (project_id, position).
-- Keep the constraint and its index; remove only the older duplicate.
DROP INDEX project_tasks_order;
