import { ProspectMigrationPending } from "@/features/prospects/server/access";
import { actor } from "@/features/access/server/auth";
import { prospectService, ProspectConflict } from "@/features/prospects/server/catalogue";
import { commandSchema } from "@/features/prospects/schemas";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { z } from "zod";

type Context = { params: Promise<{ prospectId: string }> };
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  if (error instanceof ProspectMigrationPending)
    return new Response(null, { status: 503, headers });
  if (error instanceof ProspectConflict) return new Response(null, { status: 409, headers });
  if (error instanceof ProjectError) return new Response(null, { status: 404, headers });
  throw error;
}
export async function GET(_request: Request, { params }: Context) {
  const { prospectId } = await params;
  try {
    const { prospect, research, sources, timeline, images } = await prospectService(
      database(),
    ).read(await actor(true), prospectId);
    return Response.json({ prospect, research, sources, timeline, images }, { headers });
  } catch (e) {
    return failure(e);
  }
}
async function write(request: Request, { params }: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403, headers });
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    return new Response(null, { status: 415, headers });
  const person = await actor(true),
    { prospectId } = await params;
  const body = await request.text();
  if (Buffer.byteLength(body) > 256 * 1024) return new Response(null, { status: 413, headers });
  let data;
  try {
    data = z.record(z.string(), z.unknown()).parse(JSON.parse(body));
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const create = request.method === "PUT";
  const command = commandSchema.safeParse(
    create
      ? { type: "add", record: { ...data, id: prospectId } }
      : { ...data, type: "profile", id: prospectId },
  );
  if (
    !command.success ||
    Object.keys(data).some(
      (k) =>
        !(create ? ["name", "details"] : ["name", "details", "research", "revision"]).includes(k),
    )
  )
    return new Response(null, { status: 400, headers });
  try {
    const result = await prospectService(database()).change(person, command.data);
    return new Response(null, { status: result?.added ? 201 : 204, headers });
  } catch (e) {
    return failure(e);
  }
}
export const PUT = write;
export const PATCH = write;
