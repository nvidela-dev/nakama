import { actor } from "@/features/access/server/auth";
import { projectContext } from "@/features/projects/server/context-export";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params,
    options = new URL(request.url).searchParams;
  const revision = options.get("snapshot");
  if (!revision || !/^[a-f0-9]{64}$/.test(revision))
    return new Response("Preview the project first.", { status: 400, headers });
  const person = await actor();
  try {
    const result = await projectContext(
      database(),
      person,
      projectId,
      Number(options.get("part") ?? 1),
      options.get("omit") ?? undefined,
    );
    if (result.revision !== revision)
      return new Response(
        "The project changed. Reopen the preview to download the current version.",
        { status: 409, headers },
      );
    return new Response(result.markdown, {
      headers: {
        ...headers,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="nakama-' +
          projectId +
          "-part-" +
          result.part +
          "-of-" +
          result.parts +
          '.md"',
      },
    });
  } catch (error) {
    if (error instanceof ProjectError)
      return new Response("Project or export part unavailable.", { status: 404, headers });
    throw error;
  }
}
