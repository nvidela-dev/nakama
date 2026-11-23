import { z } from "zod";
import { ProjectError } from "@/shared/contracts/errors";
const timestamp = z.iso.datetime({ offset: true });
export function encodeCursor(time: string, key: string) {
  return Buffer.from(JSON.stringify([time, key])).toString("base64url");
}
export function decodeCursor(
  input: string,
  key: z.ZodType<string>,
  message: string,
  legacyJson = false,
): [string, string] {
  try {
    if (input.length > 512) throw new Error();
    const value =
      legacyJson && input.startsWith("[")
        ? input
        : Buffer.from(input, "base64url").toString("utf8");
    return z.tuple([timestamp, key]).parse(JSON.parse(value));
  } catch {
    throw new ProjectError(message);
  }
}
