"use server";
import { revalidatePath } from "next/cache";
import { ownerJobs } from "./server/connection";
import { createPrivateJobIssue, linearJobsConfigured } from "./server/linear";
import { ProjectError } from "@/shared/contracts/errors";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";
import { commands, type JobCommand } from "./schemas";
import type { ActionState } from "@/shared/contracts/action-state";
import type { JobStage } from "./model";
export async function saveJob(form: FormData): Promise<ActionState & { id?: string }> {
  return observeAction("jobs.change", async () => {
    const jobs = await ownerJobs();
    const value = (k: string) => String(form.get(k) ?? "");
    try {
      const type = value("operation");
      const id = value("id");
      if (type === "linear") {
        if (!linearJobsConfigured())
          throw new ProjectError("Choose a private Linear team before creating a task.");
        const title = value("task_title").trim();
        if (!title || title.length > 160) throw new ProjectError("Enter a short task title.");
        const slot = await jobs.linearSlot(id);
        if (!slot.linear_url) {
          const url = await createPrivateJobIssue(
            slot.linear_id,
            title,
            process.env.JOBS_LINEAR_TEAM_ID!,
            process.env.JOBS_LINEAR_API_KEY!,
          );
          await jobs.link(id, url);
        }
      } else {
        let command: JobCommand;
        switch (type) {
          case "add":
            command = {
              type,
              token: value("token"),
              company: value("company"),
              listed_skills: value("listed_skills"),
              found_on: value("found_on") || undefined,
              title: value("title"),
              url: value("url"),
              relevance: value("relevance"),
            };
            break;
          case "plan":
            command = {
              type,
              id,
              revision: Number(value("revision")),
              stage: (value("stage") as JobStage) || null,
              previous_stage: (value("previous_stage") as JobStage) || null,
              next_action: value("next_action"),
              follow_up: value("follow_up") || null,
            };
            break;
          case "legacy_event":
          case "event": {
            const contactAt = value("contact_at");
            const parsed = commands.safeParse({
              type,
              id,
              token: value("token"),
              kind: value("kind"),
              occurred_on: contactAt ? contactAt.slice(0, 10) : value("occurred_on"),
              detail: value("detail"),
              practice: value("practice"),
              round_type: value("round_type"),
              round_outcome: value("round_outcome"),
              rating: Number(value("rating")),
              decision: value("decision") || undefined,
              revision: Number(value("revision")),
              contact_method: value("contact_method"),
              direction: value("direction"),
              response: value("response"),
              contact_at: contactAt,
              follow_up: value("contact_follow_up") || null,
            });
            if (!parsed.success) throw new ProjectError("Check the event details and dates.");
            command = parsed.data;
            break;
          }
          default:
            throw new ProjectError("Check the role details and dates.");
        }
        const saved = await jobs.change(command);
        revalidatePath("/jobs");
        return { success: "Saved.", id: saved };
      }
      revalidatePath("/jobs");
      return { success: "Saved.", id };
    } catch (e) {
      if (!(e instanceof ProjectError)) telemetry.reportError(e);
      return { error: e instanceof ProjectError ? e.message : "Unable to save. Please try again." };
    }
  });
}
