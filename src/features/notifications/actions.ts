"use server";
import { observeAction } from "@/server/observability/request-observability";

import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { notificationService } from "@/features/notifications/server/notifications";
export async function unreadComments(before?: string) {
  return observeAction("notification.unread", async () => {
    const person = await actor();
    return notificationService(database()).unread(person, before);
  });
}
export async function readComments(ids: string[]) {
  return observeAction("notification.read", async () => {
    const person = await actor();
    await notificationService(database()).read(person, ids);
  });
}
