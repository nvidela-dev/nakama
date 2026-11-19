/** Merge overlapping reads. Settled results (including failures) are never reused. */
export function pendingReads<Key, Value>(read: (key: Key) => Promise<Value>) {
  const pending = new Map<Key, Promise<Value>>();
  return {
    get(key: Key) {
      const existing = pending.get(key);
      if (existing) return existing;
      const request = read(key).finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    invalidate(key: Key) {
      pending.delete(key);
    },
  };
}
