import { actor } from "@/features/access/server/auth";
import { prospectService } from "@/features/prospects/server/catalogue";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
export async function GET(
  _request: Request,
  context: { params: Promise<{ prospectId: string; hash: string }> },
) {
  const { prospectId, hash } = await context.params;
  try {
    const image = await prospectService(database()).image(await actor(true), prospectId, hash);
    return new Response(new Uint8Array(image.content), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": image.media_type,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ProjectError) return new Response(null, { status: 404 });
    throw e;
  }
}
