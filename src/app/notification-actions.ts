"use server";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { notificationService } from "@/lib/notifications";
export async function unreadComments(before?: string) {
  const person = await actor();
  return notificationService(database()).unread(person, before);
}
export async function readComments(ids: string[]) {
  const person = await actor();
  await notificationService(database()).read(person, ids);
}
