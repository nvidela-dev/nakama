import { z } from "zod";
import { queryRows, required } from "../src/server/database/query";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../src/server/database/database";
import { projectService } from "../src/features/projects/server/projects";
import { collaborationService } from "../src/features/collaboration/server/collaboration";
import { notificationService } from "../src/features/notifications/server/notifications";
test("unread comments persist per person, paginate, deep link and respect current membership", async () => {
  const sql = new PGlite();
  try {
    for (const name of (await readdir("migrations")).filter((n) => n.endsWith(".sql")).sort())
      await sql.exec(await readFile(`migrations/${name}`, "utf8"));
    const db: Database = {
      query: (q, v) => sql.query(q, v),
      transaction: (work) => sql.transaction((tx) => work(tx)),
    };
    const projects = projectService(db),
      comments = collaborationService(db),
      notifications = notificationService(db);
    const owner = { userId: "owner", verifiedEmails: ["owner@example.com"] };
    const friend = { userId: "friend", verifiedEmails: ["friend@example.com"] };
    const outsider = { userId: "outsider", verifiedEmails: [] };
    const id = await projects.create(owner, {
      name: "Synthetic notifications",
      description: "Test fixture",
    });
    const invite = await projects.invite(owner, id, friend.verifiedEmails[0]);
    await projects.accept(friend, invite.token);
    await comments.post(owner, id, {}, "Own comment");
    const ids: string[] = [];
    for (let n = 0; n < 28; n++) ids.push(await comments.post(friend, id, {}, `Comment ${n}`));
    const first = await notifications.unread(owner);
    assert.equal(first.count, 28);
    assert.equal(first.items.length, 25);
    assert.ok(first.next);
    const older = await notifications.unread(owner, first.next);
    assert.equal(older.items.length, 3);
    assert.equal(new Set([...first.items, ...older.items].map((c) => c.id)).size, 28);
    assert.equal((await notifications.unread(outsider)).count, 0);
    await notifications.read(outsider, [ids[0]]);
    assert.equal(
      required(
        (
          await queryRows(
            db,
            z.object({ n: z.number().int() }),
            "SELECT count(*)::int AS n FROM comment_reads",
          )
        )[0],
      ).n,
      0,
    );
    await notifications.read(owner, [ids[0]]);
    await notifications.read(owner, [ids[0]]);
    assert.equal((await notifications.unread(owner)).count, 27);
    assert.equal((await notifications.unread(friend)).count, 1);
    const focused = await comments.comments(owner, id, {}, undefined, ids[0]);
    assert.ok(focused.items.some((c) => c.id === ids[0]));
    const other = await projects.create(owner, { name: "Other project", description: "Unrelated" });
    await assert.rejects(comments.comments(owner, other, {}, undefined, ids[0]));
    await comments.change(friend, id, required(ids[1]), 1, "delete");
    assert.equal((await notifications.unread(owner)).count, 26);
    await comments.change(friend, id, required(ids[0]), 1, "edit", "Edited read comment");
    assert.equal((await notifications.unread(owner)).count, 26);
    await projects.remove(owner, id, friend.userId);
    assert.equal((await notifications.unread(friend)).count, 0);
    await notifications.read(friend, [
      required((await comments.comments(owner, id, {})).items[0]).id,
    ]);
    await assert.rejects(notifications.unread(owner, "bad cursor"));
    await assert.rejects(notifications.read(owner, ["bad uuid"]));
    await projects.deleteProject(owner, id, "Synthetic notifications");
    assert.equal((await notifications.unread(owner)).count, 0);
    assert.equal(
      required(
        (
          await queryRows(
            db,
            z.object({ n: z.number().int() }),
            "SELECT count(*)::int AS n FROM comment_reads",
          )
        )[0],
      ).n,
      0,
    );
  } finally {
    await sql.close();
  }
});
