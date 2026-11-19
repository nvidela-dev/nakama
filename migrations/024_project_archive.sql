ALTER TABLE projects ADD COLUMN archived boolean NOT NULL DEFAULT false;

ALTER TYPE activity_kind ADD VALUE 'project_archived';
ALTER TYPE activity_kind ADD VALUE 'project_restored';
