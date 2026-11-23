"use server";
import { runAction } from "@/features/access/server/action-runner";

import { database } from "@/server/database/db";
import { notificationService } from "@/features/notifications/server/notifications";
export async function unreadComments(before?: string) {
  return runAction("notification.unread", async (person) => {
    return notificationService(database()).unread(person, before);
  });
}
export async function readComments(ids: string[]) {
  return runAction("notification.read", async (person) => {
    await notificationService(database()).read(person, ids);
  });
}
