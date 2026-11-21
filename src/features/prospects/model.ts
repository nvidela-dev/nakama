import type { z } from "zod";
import type { ProspectEventKind } from "@/shared/contracts/database.generated";
import type { commandSchema, prospectSchema } from "./schemas";
export const outreachKinds = ["call", "message", "reply", "note"] as const;
export const kindLabel: Record<ProspectEventKind, string> = {
  profile: "Business profile updated",
  call: "Called",
  message: "Message sent",
  reply: "Reply received",
  note: "Note",
  assignment: "Assignment",
  membership_ended: "Membership ended",
};
export const statusLabel = {
  ready: "Ready",
  in_progress: "In progress",
  deal: "Deal reached",
  rejected: "Offer declined",
} as const;
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
