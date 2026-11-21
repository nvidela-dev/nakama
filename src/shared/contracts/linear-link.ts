export function isLinearLink(value: string, projectOnly = false) {
  if (value.length > 2000 || !URL.canParse(value)) return false;
  const u = new URL(value);
  if (u.protocol !== "https:" || u.hostname !== "linear.app" || u.port || u.username || u.password)
    return false;
  const [, workspace, kind, target] = u.pathname.split("/");
  return Boolean(workspace && target && (kind === "project" || (!projectOnly && kind === "issue")));
}
