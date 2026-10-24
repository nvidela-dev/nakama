// Next gives a rendering error an opaque `digest`; the server log records the same value. Return it
// only when it has the logged shape, so nothing but a framework-made identifier is ever displayed.
export function errorReference(error: unknown): string | undefined {
  const digest = error && typeof error === "object" && "digest" in error ? error.digest : undefined;
  return typeof digest === "string" && /^[A-Za-z0-9_-]{4,40}$/.test(digest) ? digest : undefined;
}
