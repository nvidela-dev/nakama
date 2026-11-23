type WorkspaceQuery = Partial<
  Record<
    "view" | "stage" | "node" | "comment" | "commentsBefore" | "activityBefore" | "historyBefore",
    string | undefined
  >
>;
export function projectPageHref(
  base: string,
  query: WorkspaceQuery | URLSearchParams,
  anchor?: string,
) {
  const [path, search] = base.split("?", 2);
  const params = new URLSearchParams(search);
  const entries = query instanceof URLSearchParams ? query.entries() : Object.entries(query);
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `${path}${params.size ? `?${params}` : ""}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
}
