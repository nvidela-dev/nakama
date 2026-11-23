import { ProjectError } from "@/shared/contracts/errors";
import {
  callClerk,
  clerkResponse,
  usersPage,
  userIdsPage,
  clerkPages,
} from "@/server/observability/provider-diagnostics";
import { observeAction } from "@/server/observability/request-observability";
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import type { Actor } from "@/shared/contracts/actor";
import { database } from "@/server/database/db";
import { membership } from "@/server/database/membership";
import { projectService } from "@/features/projects/server/projects";
import { whitelistStore } from "@/features/access/server/whitelist";

import { type InviteAudience } from "./invite-audience";
/** Validate the one selected destination without enumerating every member's email addresses. */
export async function issueApprovedInvitation(person: Actor, projectId: string, input: string) {
  const db = database();
  await db.transaction((tx) => membership(tx, person, projectId, true));
  const email = input.trim().toLowerCase();
  const allowed = await whitelistStore.list();
  if (!allowed.some((entry) => entry.identifier.trim().toLowerCase() === email))
    throw new ProjectError("Choose an approved person who is not already a project member.");
  const client = await callClerk("client", () => clerkClient());
  const userIds: string[] = [];
  for await (const page of clerkPages("users.list", async (offset) =>
    clerkResponse(
      "users.list",
      userIdsPage,
      await callClerk("users.list", () =>
        client.users.getUserList({ emailAddress: [email], limit: 100, offset }),
      ),
    ),
  )) {
    for (const user of page) userIds.push(user.id);
  }
  return projectService(db).invite(person, projectId, email, userIds);
}
export async function approvedInvitees({ person, members }: InviteAudience) {
  return observeAction("identity.candidates", async () => {
    const memberEmails = new Set(person.verifiedEmails.map((email) => email.toLowerCase()));
    const client = await callClerk("client", () => clerkClient());
    for (let start = 0; start < members.length; start += 100) {
      const userId = members.slice(start, start + 100).map((member) => member.user_id);
      for await (const page of clerkPages("users.list", async (offset) =>
        clerkResponse(
          "users.list",
          usersPage,
          await callClerk("users.list", () =>
            client.users.getUserList({ userId, limit: 100, offset }),
          ),
        ),
      )) {
        for (const user of page)
          for (const email of user.emailAddresses)
            memberEmails.add(email.emailAddress.toLowerCase());
      }
    }
    return [
      ...new Set(
        (await whitelistStore.list()).map((entry) => entry.identifier.trim().toLowerCase()),
      ),
    ]
      .filter((email) => !memberEmails.has(email))
      .sort((a, b) => a.localeCompare(b));
  });
}
