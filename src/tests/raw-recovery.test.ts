import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { readStoredRow } from "../persistence/rawRecovery";
import { database } from "../expansion/storage";
import { createRun } from "../expansion/engine";
import { exportSave } from "../expansion/format";
it("exports exact stored bytes and backup fields without trusting an invalid envelope", async () => {
  await database.rows.clear();
  const envelope = exportSave(createRun("M03", "raw", "B")),
    row = {
      id: "active:M03",
      revision: 0,
      current: { ...envelope, hash: "00000000" },
      previous: envelope,
    };
  await database.rows.put(row);
  const before = JSON.stringify(await database.rows.toArray());
  expect(
    await readStoredRow("threat-hunter-expansion-v1", "rows", "active:M03"),
  ).toEqual(row);
  expect(JSON.stringify(await database.rows.toArray())).toBe(before);
});
it("does not create a missing database or inspect an unrelated namespace", async () => {
  await database.delete();
  expect(
    await readStoredRow("threat-hunter-expansion-v1", "rows", "active:M03"),
  ).toBeNull();
  expect(
    (await indexedDB.databases()).some(
      (db) => db.name === "threat-hunter-expansion-v1",
    ),
  ).toBe(false);
  await expect(readStoredRow("unrelated", "rows", "active")).rejects.toThrow(
    "Unsupported",
  );
});
