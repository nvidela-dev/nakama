// Only these fields can leave the project. Provider IDs are resolved to display names in memory.
export const contextSections = [
  [
    "Discussion",
    "SELECT id,stage_id,node_id,author_name,content,revision,created_at,edited_at FROM project_comments WHERE project_id=$1 AND deleted_at IS NULL ORDER BY created_at,id",
  ],
  [
    "Current stage reviews",
    "SELECT stage_id,reviewed,rationale,reviewed_by,reviewed_at FROM stage_reviews WHERE project_id=$1 ORDER BY stage_id",
  ],
  [
    "Stage review history",
    "SELECT id,stage_id,content_revision,rationale,author_id,created_at FROM stage_review_history WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Answer history",
    "SELECT node_id,revision,status,choice,content,origin,author_id,created_at FROM answer_revisions WHERE project_id=$1 ORDER BY node_id,revision",
  ],
  [
    "Iterations",
    "SELECT id,stage,revision,created_by,created_at FROM experiments WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Iteration plans",
    "SELECT id,experiment_id,version,definition->>'claim' AS claim,definition->>'method' AS method,definition->>'criteria' AS criteria,definition->>'scope' AS scope,definition->>'metric' AS metric,definition->>'baseline' AS baseline,definition->>'owner' AS responsible,definition->>'limits' AS limits,definition->>'milestone' AS milestone,definition->>'nodeId' AS node_id,author_id,created_at FROM experiment_plans WHERE project_id=$1 ORDER BY experiment_id,version",
  ],
  [
    "Runs",
    "SELECT id,experiment_id,plan_id,status,executor,context->>'nodeId' AS node_id,context->>'revision' AS answer_revision,context->>'content' AS frozen_answer,context->>'prompt' AS prompt,started_by,started_at,ended_at,effort_minutes,cost,deviations FROM experiment_runs WHERE project_id=$1 ORDER BY started_at,id",
  ],
  [
    "Evidence",
    "SELECT id,experiment_id,run_id,kind,content,source,measurement,unit,author_id,recorded_at FROM experiment_evidence WHERE project_id=$1 ORDER BY recorded_at,id",
  ],
  [
    "Assessments and decisions",
    "SELECT id,experiment_id,run_id,assessment,next_action,rationale,reconciliation,snapshot->'plan'->>'id' AS assessed_plan,snapshot->'plan'->>'version' AS assessed_version,snapshot->'currentContext'->>'revision' AS assessed_answer_revision,(SELECT string_agg(entry->>'id',', ' ORDER BY ord) FROM jsonb_array_elements(snapshot->'evidence') WITH ORDINALITY AS items(entry,ord)) AS assessed_evidence,author_id,created_at FROM experiment_reviews WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Agent proposals and human reviews",
    "SELECT id,experiment_id,run_id,agent,content,source,status,submitted_by,created_at,reviewer_id,reviewed_at,review_note,accepted_content FROM experiment_proposals WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Reflections",
    "SELECT experiment_id,prompt,revision,content,author_name,created_at FROM iteration_reflections WHERE project_id=$1 ORDER BY experiment_id,prompt,revision",
  ],
  [
    "Milestones",
    "SELECT id,template_id,title,description,status,position,created_by,created_at,updated_by,updated_at FROM project_milestones WHERE project_id=$1 ORDER BY position,id",
  ],
  [
    "Tasks",
    "SELECT id,parent_id,title,status,milestone_id,column_id,created_by,created_at,updated_by,updated_at FROM project_tasks WHERE project_id=$1 ORDER BY position,id",
  ],
  [
    "Artifacts",
    "SELECT id,stage_id,name,description,kind,status,github_url,revision,updated_by,updated_at FROM project_artifacts WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Artifact tasks",
    "SELECT id,artifact_id,position,title,status FROM artifact_tasks WHERE project_id=$1 ORDER BY artifact_id,position,id",
  ],
  [
    "Task artifact links",
    "SELECT task_id,artifact_id FROM task_artifacts WHERE project_id=$1 ORDER BY task_id,artifact_id",
  ],
  [
    "Artifact files (references)",
    "SELECT id,artifact_id,name,media_type,size,created_by,created_at FROM artifact_files WHERE project_id=$1 ORDER BY created_at,id",
  ],
  [
    "Project activity",
    "SELECT id,kind,actor_name,stage_id,node_id,created_at FROM project_activity WHERE project_id=$1 ORDER BY created_at,id",
  ],
] as const;
