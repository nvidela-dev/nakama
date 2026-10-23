export function required<T>(
  value: T | null | undefined,
  message = "Expected data is missing.",
): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
