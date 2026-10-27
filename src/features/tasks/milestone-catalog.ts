import type { FlowId, TaskStatus } from "@/shared/contracts/database.generated";
export type BoardColumn = { id: string; name: string; status: TaskStatus };
const columns = (values: [string, string][]): BoardColumn[] =>
  values.map(([id, name], index) => ({
    id,
    name,
    status: index === 0 ? "ready" : index === 3 ? "done" : "in_progress",
  }));
export const milestoneTemplates = {
  build_sprint: {
    name: "Build sprint",
    flows: ["venture", "saas", "platform"],
    columns: columns([
      ["backlog", "Backlog"],
      ["in_progress", "In progress"],
      ["review", "Review"],
      ["done", "Done"],
    ]),
  },
  release_rollout: {
    name: "Launch and rollout",
    flows: ["venture", "saas", "eshop", "platform"],
    columns: columns([
      ["prep", "Preparation"],
      ["staging", "Staging"],
      ["live_check", "Live check"],
      ["shipped", "Shipped"],
    ]),
  },
  creative_session: {
    name: "Creative production",
    flows: ["creative"],
    columns: columns([
      ["ideas", "Ideas"],
      ["making", "Making"],
      ["polishing", "Polishing"],
      ["published", "Published"],
    ]),
  },
  garment_run: {
    name: "Garment and print run",
    flows: ["shirt-eshop"],
    columns: columns([
      ["artwork", "Artwork"],
      ["sampling", "Sampling"],
      ["printing", "Printing"],
      ["qc_packed", "Checked and packed"],
    ]),
  },
  catalog_drop: {
    name: "Catalog drop",
    flows: ["eshop", "shirt-eshop"],
    columns: columns([
      ["sourcing", "Sourcing"],
      ["listing_photo", "Listings and photos"],
      ["launch_ready", "Launch ready"],
      ["live", "Live"],
    ]),
  },
  shipment_pilot: {
    name: "Shipment pilot",
    flows: ["importation"],
    columns: columns([
      ["supplier_po", "Supplier order"],
      ["in_transit", "In transit"],
      ["customs_qc", "Customs and checks"],
      ["landed", "Landed"],
    ]),
  },
  client_delivery: {
    name: "Client delivery",
    flows: ["consultancy", "investigation"],
    columns: columns([
      ["scoped", "Scoped"],
      ["drafting", "Drafting"],
      ["client_review", "Client review"],
      ["delivered", "Delivered"],
    ]),
  },
  practice_cycle: {
    name: "Practice cycle",
    flows: ["self-improvement"],
    columns: columns([
      ["planned", "Planned"],
      ["practicing", "Practicing"],
      ["reflecting", "Reflecting"],
      ["reviewed", "Reviewed"],
    ]),
  },
} satisfies Record<string, { name: string; flows: FlowId[]; columns: BoardColumn[] }>;
export type MilestoneTemplateId = keyof typeof milestoneTemplates;
export function allowedTemplates(flow: FlowId | null) {
  return Object.entries(milestoneTemplates)
    .filter(([, template]) => (template.flows as readonly string[]).includes(flow ?? ""))
    .map(([id, template]) => ({ id: id as MilestoneTemplateId, ...template }));
}
export const productionStages: Record<FlowId, string[]> = {
  venture: ["building"],
  creative: ["create"],
  investigation: ["deliver"],
  platform: ["production"],
  eshop: ["eshop-5"],
  "shirt-eshop": ["shirt-eshop-3", "shirt-eshop-4"],
  saas: ["saas-3", "saas-4"],
  importation: ["importation-4"],
  consultancy: ["consultancy-4"],
  "self-improvement": ["practice"],
};
