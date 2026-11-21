"use server";
import { revalidatePath } from "next/cache";
import { ownerJobs } from "./server/connection";
import { createPrivateJobIssue, linearJobsConfigured } from "./server/linear";
import { ProjectError } from "@/shared/contracts/errors";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";
import type { JobCommand } from "./schemas";
import type { ActionState } from "@/shared/contracts/action-state";
import type { JobStage, JobEvent } from "./model";
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
              next_action: value("next_action"),
              follow_up: value("follow_up") || null,
            };
            break;
          case "event":
            command = {
              type,
              id,
              token: value("token"),
              kind: value("kind") as JobEvent,
              occurred_on: value("occurred_on"),
              detail: value("detail"),
              practice: value("practice"),
            };
            break;
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
