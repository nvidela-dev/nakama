import { z } from "zod";
import { ProjectError } from "@/shared/contracts/errors";
const issue = z.object({
  id: z.uuid(),
  url: z.url().refine((value) => {
    const u = new URL(value);
    return (
      u.origin === "https://linear.app" &&
      !u.username &&
      !u.password &&
      u.pathname.includes("/issue/")
    );
  }),
  team: z.object({ id: z.uuid(), visibility: z.string() }),
});
export const linearJobsConfigured = () =>
  !!process.env.JOBS_LINEAR_API_KEY && !!process.env.JOBS_LINEAR_TEAM_ID;
export async function createPrivateJobIssue(
  id: string,
  title: string,
  teamId: string,
  key: string,
  send: typeof fetch = fetch,
) {
  async function graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    schema: z.ZodType<T>,
  ) {
    const response = await send("https://api.linear.app/graphql", {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new ProjectError("Linear could not confirm the task. Retry to check it.");
    const result = z
      .object({ data: schema, errors: z.undefined().optional() })
      .safeParse(await response.json());
    if (!result.success)
      throw new ProjectError("Linear could not confirm the task. Retry to check it.");
    return result.data.data;
  }
  const state = await graphql(
    "query JobDestination($team:String!,$id:ID!){team(id:$team){id visibility} issues(first:1,filter:{id:{eq:$id}}){nodes{id url team{id visibility}}}}",
    { team: teamId, id },
    z.object({
      team: z.object({ id: z.uuid(), visibility: z.string() }),
      issues: z.object({ nodes: z.array(issue) }),
    }),
  );
  if (state.team.id !== teamId || state.team.visibility !== "private")
    throw new ProjectError("Choose a private Linear team before creating a task.");
  const existing = state.issues.nodes[0];
  const linked =
    existing ??
    (
      await graphql(
        "mutation CreateJobTask($input:IssueCreateInput!){issueCreate(input:$input){success issue{id url team{id visibility}}}}",
        { input: { id, teamId, title } },
        z.object({ issueCreate: z.object({ success: z.literal(true), issue }) }),
      )
    ).issueCreate.issue;
  if (linked.id !== id || linked.team.id !== teamId || linked.team.visibility !== "private")
    throw new ProjectError("Linear could not confirm the private destination.");
  return linked.url;
}
