// Calendar arithmetic on ISO date-only values. The caller chooses today's date in Montevideo.
const dayMs = 86_400_000;
function monday(date: string) {
  const midnight = Date.parse(date + "T00:00:00Z");
  return midnight - ((new Date(midnight).getUTCDay() + 6) % 7) * dayMs;
}
export function weeksSinceFound(found: string | null, today: string) {
  return found === null ? null : (monday(today) - monday(found)) / (7 * dayMs);
}
export const foundFilters = {
  "0": "This week",
  "1": "Last week",
  "2": "2 weeks ago",
  "3": "3 weeks ago",
  "4+": "4 or more weeks ago",
  unknown: "Unknown date",
};
export function foundRange(filter: string, today: string) {
  if (!Object.hasOwn(foundFilters, filter) || filter === "unknown") return null;
  const weeks = filter === "4+" ? 4 : Number(filter);
  const start = monday(today) - weeks * 7 * dayMs;
  const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
  return { since: filter === "4+" ? null : iso(start), until: iso(start + 7 * dayMs) };
}
export function weekLabel(weeks: number | null) {
  if (weeks === null) return "Unknown date";
  if (weeks === 0) return "This week";
  if (weeks === 1) return "Last week";
  return "{count} weeks ago";
}
export function weekColors(weeks: number | null) {
  if (weeks === null) return "bg-panel text-muted";
  if (weeks <= 1) return "bg-green-100 text-green-950";
  if (weeks === 2) return "bg-yellow-100 text-yellow-950";
  if (weeks === 3) return "bg-orange-100 text-orange-950";
  return "bg-red-100 text-red-950";
}
