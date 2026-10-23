import {
  callClerk,
  clerkResponse,
  usersPage,
  incompleteClerkPage,
} from "@/server/observability/provider-diagnostics";
import { observeAction } from "@/server/observability/request-observability";
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import type { Actor } from "@/features/projects/server/projects";
import { database } from "@/server/database/db";
import { ProjectError, projectService } from "@/features/projects/server/projects";
import { whitelistStore } from "@/features/access/server/whitelist";

/** Owners may discover approved invitees, not administer the allowlist. */
export async function invitationCandidates(person: Actor, projectId: string) {
  return observeAction("identity.candidates", async () => {
    const service = projectService(database());
    const project = await service.get(person, projectId);
    if (project.role !== "owner")
      throw new ProjectError("Only the project owner can invite members.");
    const { members } = await service.people(person, projectId);
    const memberEmails = new Set(person.verifiedEmails.map((email) => email.toLowerCase()));
    const client = await callClerk("client", () => clerkClient());
    for (let start = 0; start < members.length; start += 100) {
      const userId = members.slice(start, start + 100).map((member) => member.user_id);
      let offset = 0;
      while (true) {
        const page = clerkResponse(
          "users.list",
          usersPage,
          await callClerk("users.list", () =>
            client.users.getUserList({ userId, limit: 100, offset }),
          ),
        );
        for (const user of page.data)
          for (const email of user.emailAddresses)
            memberEmails.add(email.emailAddress.toLowerCase());
        offset += page.data.length;
        if (offset >= page.totalCount) break;
        if (!page.data.length) incompleteClerkPage("users.list");
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
