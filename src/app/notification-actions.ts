"use server";
import { observeAction } from "@/lib/request-observability";

import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { notificationService } from "@/lib/notifications";
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
