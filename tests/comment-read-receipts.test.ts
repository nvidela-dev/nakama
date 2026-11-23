import { test } from "node:test";
import assert from "node:assert/strict";
import { observeCommentReads } from "../src/features/collaboration/components/observe-comment-reads";
test("one observer batches only continuously visible unread elements and retries a failed write", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  t.mock.method(performance, "now", () => Date.now());
  class Page extends EventTarget {
    hidden = false;
  }
  const page = new Page();
  const items = Array.from({ length: 27 }, (_, i) => ({ getAttribute: () => String(i) }));
  const target = { querySelectorAll: () => items };
  let change: (
    entries: { target: (typeof items)[number]; isIntersecting: boolean }[],
  ) => void = () => {};
  let observed = 0,
    disconnected = false;
  class Observer {
    constructor(callback: typeof change) {
      change = callback;
    }
    observe() {
      observed++;
    }
    unobserve() {}
    disconnect() {
      disconnected = true;
    }
  }
  const originals = new Map(
    ["document", "IntersectionObserver"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  Object.defineProperty(globalThis, "document", { configurable: true, value: page });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: Observer,
  });

  const batches: string[][] = [];
  let receipts = 0,
    fail = true;
  // This DOM fixture only implements the list and element methods used by the observer.
  const stop = observeCommentReads(
    target as unknown as HTMLOListElement,
    async (ids) => {
      batches.push(ids);
      if (fail) {
        fail = false;
        throw Error("offline");
      }
    },
    () => receipts++,
  );
  t.after(() => {
    stop();
    for (const [key, old] of originals)
      if (old) Object.defineProperty(globalThis, key, old);
      else Reflect.deleteProperty(globalThis, key);
  });
  assert.equal(observed, 27);
  change(items.map((target) => ({ target, isIntersecting: true })));
  change([{ target: items[26]!, isIntersecting: false }]);
  t.mock.timers.tick(800);
  page.hidden = true;
  page.dispatchEvent(new Event("visibilitychange"));
  t.mock.timers.tick(2000);
  assert.equal(batches.length, 0);
  page.hidden = false;
  page.dispatchEvent(new Event("visibilitychange"));
  t.mock.timers.tick(999);
  assert.equal(batches.length, 0);
  t.mock.timers.tick(1);
  await Promise.resolve();
  t.mock.timers.tick(1);
  await Promise.resolve();
  assert.equal(batches[0]?.length, 25);
  assert.deepEqual(batches[1], ["25"]);
  t.mock.timers.tick(5000);
  await Promise.resolve();
  assert.deepEqual(batches[2], batches[0]);
  assert.equal(receipts, 2);
  stop();
  assert.ok(disconnected);
});
