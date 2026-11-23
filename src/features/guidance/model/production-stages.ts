import type { FlowId } from "@/shared/contracts/database.generated";

export const productionStages: Record<FlowId, string[]> = {
  "video-game": ["prototype", "release"],
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

export function hasMilestoneBoard(flowId: FlowId, stageId: string) {
  return productionStages[flowId].includes(stageId);
}
