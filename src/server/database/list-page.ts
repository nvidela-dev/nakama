import { encodeCursor, decodeCursor } from "./cursor";
import { z } from "zod";

export const listPageSize = 24;
export function readListCursor(value?: string): [string | null, string | null] {
  if (value === undefined) return [null, null];
  return decodeCursor(value, z.uuid(), "Invalid page link.");
}
export function listPage<T extends { id: string; cursor_time: string }>(
  rows: T[],
  size = listPageSize,
): { items: Omit<T, "cursor_time">[]; next: string | null } {
  let next: string | null = null;
  const items = rows.slice(0, size).map(({ cursor_time, ...item }, index) => {
    if (index === size - 1 && rows.length > size) {
      next = encodeCursor(cursor_time, item.id);
    }
    return item;
  });
  return { items, next };
}
