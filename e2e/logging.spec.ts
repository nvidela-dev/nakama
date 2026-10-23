import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { randomUUID } from "node:crypto";
import { defaultLogFile } from "../src/server/observability/log-file";
import { logArchives, readLogFiles } from "../src/server/observability/log-reader";

test("request traces reject forged context and private 404s retain safe diagnostic outcomes", async ({
  page,
}) => {
  test.skip(
    !!process.env.E2E_BASE_URL &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(process.env.E2E_BASE_URL),
    "Local file verification only; hosted events use logs:pull.",
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  const forged = randomUUID(),
    secret = "PRIVATE_LOG_QUERY_" + randomUUID();
  const response = await page.request.get(
    `/projects/${randomUUID()}/artifacts/${randomUUID()}/files/${randomUUID()}?private=${secret}`,
    {
      headers: { "x-nakama-request-id": forged, "x-nakama-route": "/PRIVATE_FORGED_ROUTE" },
    },
  );
  expect(response.status()).toBe(404);
  const trace = response.headers()["x-nakama-request-id"];
  expect(trace).toMatch(/^[a-f0-9-]{36}$/i);
  expect(trace).not.toBe(forged);
  const file = process.env.NAKAMA_LOG_FILE || defaultLogFile();
  await expect
    .poll(
      () =>
        readLogFiles(logArchives(file)).records.filter(
          (r) =>
            r.traceId === trace &&
            r.event === "operation.finish" &&
            r.operation === "artifact.file",
        ).length,
    )
    .toBe(1);
  const records = readLogFiles(logArchives(file)).records.filter((r) => r.traceId === trace);
  const finished = records.find(
    (r) => r.event === "operation.finish" && r.operation === "artifact.file",
  );
  expect(finished?.outcome).toBe("rejected");
  expect(finished?.queryCount).toBeGreaterThan(0);
  expect(finished?.error?.type).toBe("ProjectError");
  expect(finished?.error?.diagnostic?.code).toBe("REQUEST_REJECTED");
  expect(finished?.error?.diagnostic?.family).toBe("backend");
  expect(finished?.buildId).toMatch(/^[a-f0-9]{32}$/);
  expect(
    records.every((r) => r.route === "/projects/[projectId]/artifacts/[artifactId]/files/[fileId]"),
  ).toBe(true);
  expect(records.some((r) => r.level === "error")).toBe(false);
  expect(JSON.stringify(records)).not.toContain(secret);
  expect(JSON.stringify(records)).not.toContain("PRIVATE_FORGED_ROUTE");
});
