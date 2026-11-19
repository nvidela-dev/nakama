import { z } from "zod";
import { ProjectError } from "@/shared/contracts/errors";

export const listPageSize = 24;
const cursor = z.tuple([z.iso.datetime(), z.uuid()]);

export function readListCursor(value?: string): [string | null, string | null] {
  if (value === undefined) return [null, null];
  if (typeof value === "string" && value.length <= 200) {
    try {
      return cursor.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    } catch {
      /* Malformed navigation is a domain error. */
    }
  }
  throw new ProjectError("Invalid page link.");
}
export function listPage<T extends { id: string; cursor_time: string }>(
  rows: T[],
  size = listPageSize,
): { items: Omit<T, "cursor_time">[]; next: string | null } {
  let next: string | null = null;
  const items = rows.slice(0, size).map(({ cursor_time, ...item }, index) => {
    if (index === size - 1 && rows.length > size) {
      next = Buffer.from(JSON.stringify([cursor_time, item.id])).toString("base64url");
    }
    return item;
  });
  return { items, next };
}
