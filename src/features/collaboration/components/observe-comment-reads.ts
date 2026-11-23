/** A receipt requires one continuous second of visibility in a foreground document. */
export function observeCommentReads(
  list: HTMLOListElement,
  save: (ids: string[]) => Promise<void>,
  onRead: () => void,
) {
  const visible = new Map<Element, number>();
  const acknowledged = new Set<Element>();
  let timer: ReturnType<typeof setTimeout>;
  let active = true;
  let saving = false;
  function schedule() {
    clearTimeout(timer);
    if (!active || saving || document.hidden || !visible.size) return;
    const due = Math.min(...visible.values());
    timer = setTimeout(flush, Math.max(0, due - performance.now()));
  }
  async function flush() {
    if (!active || document.hidden) return;
    const ready = [...visible].filter(([, due]) => due <= performance.now()).slice(0, 25);
    if (ready.length) {
      saving = true;
      try {
        await save(ready.map(([element]) => element.getAttribute("data-unread-comment")!));
        for (const [element] of ready) {
          acknowledged.add(element);
          visible.delete(element);
          observer.unobserve(element);
        }
        onRead();
      } catch {
        for (const [element] of ready)
          if (visible.has(element)) visible.set(element, performance.now() + 5000);
      } finally {
        saving = false;
      }
    }
    schedule();
  }
  const observer = new IntersectionObserver((entries) => {
    const due = performance.now() + 1000;
    for (const entry of entries) {
      if (entry.isIntersecting && !acknowledged.has(entry.target)) {
        if (!visible.has(entry.target)) visible.set(entry.target, due);
      } else visible.delete(entry.target);
    }
    schedule();
  });
  function visibilityChanged() {
    for (const element of visible.keys()) visible.set(element, performance.now() + 1000);
    schedule();
  }
  for (const element of list.querySelectorAll("[data-unread-comment]")) observer.observe(element);
  document.addEventListener("visibilitychange", visibilityChanged);
  return () => {
    active = false;
    clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener("visibilitychange", visibilityChanged);
  };
}
