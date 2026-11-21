import { actor } from "@/features/access/server/auth";
import { sourceImports } from "@/features/prospects/server/imports";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
export async function GET(_request: Request, context: { params: Promise<{ digest: string }> }) {
  const { digest } = await context.params;
  try {
    const parts = await sourceImports(database()).download(await actor(true), digest);
    const magic = Buffer.from(parts[0]!.subarray(0, 6)).toString("ascii");
    const ext = magic.startsWith("PK") ? "zip" : magic === "SQLite" ? "sqlite3" : "json";
    let part = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (part === parts.length) controller.close();
        else controller.enqueue(parts[part++]);
      },
    });
    return new Response(stream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="prospect-catalogue-${digest.slice(0, 12)}.${ext}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ProjectError) return new Response(null, { status: 404 });
    throw e;
  }
}
