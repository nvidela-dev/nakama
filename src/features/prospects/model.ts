import type { z } from "zod";
import type { ProspectEventKind, ProspectStatus } from "@/shared/contracts/database.generated";
import type { commandSchema, prospectSchema } from "./schemas";
export const outreachKinds = ["call", "message", "reply", "note"] as const;
export const kindLabel: Record<ProspectEventKind, string> = {
  stage: "Sales stage changed",
  profile: "Business profile updated",
  call: "Called",
  message: "Message sent",
  reply: "Reply received",
  note: "Note",
  assignment: "Assignment",
  membership_ended: "Membership ended",
};
export const salesStages = [
  "ready",
  "attempted_contact",
  "in_conversation",
  "proposal_sent",
  "negotiating",
  "deal",
  "rejected",
] as const satisfies readonly ProspectStatus[];

export type SalesStage = (typeof salesStages)[number];

export const statusLabel: Record<ProspectStatus, string> = {
  ready: "Ready to call",
  attempted_contact: "Attempted contact",
  in_conversation: "In conversation",
  proposal_sent: "Proposal sent",
  negotiating: "Negotiating",
  deal: "Won",
  rejected: "Lost",
  in_progress: "In progress (legacy)",
};
export function isProspectStatus(value: unknown): value is ProspectStatus {
  return typeof value === "string" && Object.hasOwn(statusLabel, value);
}
export type ProspectCommand = z.infer<typeof commandSchema>;
export type Prospect = z.infer<typeof prospectSchema>;
export type CatalogueMember = {
  user_id: string;
  display_name: string;
  full_access: boolean;
  shared: boolean;
};

export const importChunkSize = 1024 * 1024;
export const maxImportBytes = 384 * 1024 * 1024;
