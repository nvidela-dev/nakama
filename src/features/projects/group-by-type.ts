import { flowCatalog } from "@/features/guidance/model/flow-catalog.generated";
export function groupProjectsByType<T extends { flow_id: string | null }>(
  projects: T[],
  t: (label: string) => string,
) {
  return [...flowCatalog, { id: null, name: "Project type pending" }]
    .map(({ id, name }) => ({
      id,
      name,
      projects: projects.filter((project) => project.flow_id === id),
    }))
    .filter((group) => group.projects.length)
    .sort((a, b) => t(a.name).localeCompare(t(b.name)));
}
