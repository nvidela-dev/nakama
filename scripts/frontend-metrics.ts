import { chromium, type Page } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Only the public synthetic preview is measured; no project/authentication fixtures. */
export async function measureFrontend(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Measure a local production build.");
  const scripts = new Map<string, { bytes: number; gzip: number }>();
  const pending: Promise<void>[] = [];
  const collect = (response: import("@playwright/test").Response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || !url.pathname.endsWith(".js")) return;
    pending.push(
      response
        .body()
        .then((body) => {
          scripts.set(url.pathname, { bytes: body.length, gzip: gzipSync(body).length });
        })
        .catch(() => {}),
    );
  };
  page.on("response", collect);
  const started = Date.now();
  await page.goto(`${origin}/preview`);
  await page.getByRole("button", { name: "Show 3D mini-view" }).waitFor();
  await page.waitForTimeout(1500);
  await Promise.all(pending);
  const initial = {
    scripts: scripts.size,
    jsBytes: [...scripts.values()].reduce((sum, item) => sum + item.bytes, 0),
    jsGzip: [...scripts.values()].reduce((sum, item) => sum + item.gzip, 0),
  };
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  const navigationMs = Date.now() - started;
  page.off("response", collect);
  return { route: "/preview", ...layout, ...initial, navigationMs };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
  try {
    const results = [];
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      results.push(
        await measureFrontend(page, process.env.FRONTEND_BASE_URL ?? "http://localhost:3035"),
      );
      await page.close();
    }
    await mkdir(".nakama/performance", { recursive: true });
    await writeFile(".nakama/performance/latest.json", JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    const before = JSON.parse(
      await readFile(".nakama/performance/before.json", "utf8").catch(() => "null"),
    ) as { jsGzip: number } | null;
    if (before && results[0])
      console.log(
        `Initial gzip JS compared with local baseline: ${before.jsGzip} → ${results[0].jsGzip} bytes.`,
      );
  } finally {
    await browser.close();
  }
}
