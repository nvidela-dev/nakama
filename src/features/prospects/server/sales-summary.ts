// Both lookups are constrained to one authorized prospect. In browse, apply them after pagination.
export const salesSummaryFields = `nullif(btrim(last_call.note),'') AS latest_call_note,
  last_call.outcome AS latest_call_outcome, follow_up.title AS next_follow_up`;

export function salesSummaryJoins(catalogue: "p.catalogue_id" | "$1", id: "p.id" | "r.id") {
  return `LEFT JOIN LATERAL (
    SELECT e.note,e.outcome FROM prospect_events e
    WHERE e.catalogue_id=${catalogue} AND e.prospect_id=${id} AND e.kind='call'
    ORDER BY e.id DESC LIMIT 1
  ) last_call ON true LEFT JOIN LATERAL (
    SELECT t.title FROM prospect_todos t
    WHERE t.catalogue_id=${catalogue} AND t.prospect_id=${id} AND NOT t.done
    ORDER BY t.created_at,t.id LIMIT 1
  ) follow_up ON true`;
}
