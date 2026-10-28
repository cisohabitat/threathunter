import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ reducedMotion: "reduce", actionTimeout: 15000 });
test.setTimeout(90000);

async function unloadBlocked(page: Page) {
  return page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function holdNextCommit(page: Page) {
  await page.evaluate(() => {
    // Delay before any transaction begins, so IndexedDB cannot auto-commit
    // while a deliberately blocked put awaits an unrelated promise.
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: { op?: string }) {
      if (message?.op === "commit") {
        Worker.prototype.postMessage = post;
        Object.assign(globalThis, {
          releaseCommit: () => post.call(this, message),
        });
      } else post.call(this, message);
    };
  });
}

test("M01 warns for failed writes and clears the warning after retry saves the exact retained action", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Begin investigation/ }).click();
  const status = page
    .getByRole("region", { name: "Save and readiness", exact: true })
    .getByRole("status");
  await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
  expect(await unloadBlocked(page)).toBe(false);
  const original = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/persistence/browserStore.ts");
    const put = database.runs.put.bind(database.runs);
    Object.assign(globalThis, {
      restorePut: () => {
        database.runs.put = put;
      },
    });
    const row = await database.runs.get("active");
    database.runs.put = async () => {
      throw new DOMException("Injected quota failure", "QuotaExceededError");
    };
    return row;
  });
  await page
    .getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
      exact: true,
    })
    .click();
  await expect(status).toHaveText("Not saved");
  expect(await unloadBlocked(page)).toBe(true);
  const retained = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/persistence/browserStore.ts");
    return database.runs.get("active");
  });
  expect(retained).toEqual(original);
  await page.evaluate(() =>
    (globalThis as typeof globalThis & { restorePut: () => void }).restorePut(),
  );
  await page
    .getByRole("button", {
      name: "Retry saving retained progress",
      exact: true,
    })
    .click();
  await expect(status).toHaveText("Saved on this device");
  expect(await unloadBlocked(page)).toBe(false);
  const saved = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/persistence/browserStore.ts");
    return database.runs.get("active");
  });
  expect(saved.revision).toBe(1);
  expect(saved.current.commands).toHaveLength(1);
  expect(saved.previous).toEqual(original.current);
});

test("M01 warns for unfinished notes after leaving Case File and clears only after accepting them", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText(/^Play settings ·/).click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: /^Begin investigation/ }).click();
  const status = page
    .getByRole("region", { name: "Save and readiness", exact: true })
    .getByRole("status");
  await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await page
    .getByRole("navigation", { name: "Case File steps" })
    .getByRole("button", { name: /Next step/ })
    .click();
  await page
    .getByRole("textbox", { name: "Optional notes · not graded", exact: true })
    .fill("Keep this unfinished note");
  expect(await unloadBlocked(page)).toBe(true);
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Explore/ })
    .click();
  expect(await unloadBlocked(page)).toBe(true);
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Optional notes · not graded",
      exact: true,
    }),
  ).toHaveValue("Keep this unfinished note");
  await page
    .getByRole("button", { name: "Save notes · free", exact: true })
    .click();
  await expect(status).toHaveText("Saved on this device");
  expect(await unloadBlocked(page)).toBe(false);
});

test("M01 temporary actions warn before unloading without writing a durable case", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Play temporarily without saving",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /^Begin investigation/ }).click();
  const status = page
    .getByRole("region", { name: "Save and readiness", exact: true })
    .getByRole("status");
  await expect(status).toHaveText("Temporary session — not saved");
  expect(await unloadBlocked(page)).toBe(true);
  const rows = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/persistence/browserStore.ts");
    return database.runs.toArray();
  });
  expect(rows).toEqual([]);
});

for (const mission of ["M04", "M07"] as const) {
  test(`${mission} temporary replay requires a fresh export acknowledgement for each closed run`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "locks", {
        value: undefined,
        configurable: true,
      }),
    );
    await page.goto(`/case/${mission.toLowerCase()}`);
    const area = page.locator(`[data-mission="${mission}"]`);
    await area
      .getByRole("button", {
        name: "Play temporarily without saving",
        exact: true,
      })
      .click();
    const fixture = await page.evaluate(async (mission) => {
      // @ts-expect-error Vite test fixture.
      const e = await import("/src/campaign/engine.ts");
      // @ts-expect-error Vite test fixture.
      const f = await import("/src/campaign/format.ts");
      const initial = e.createRun(
        mission,
        "temporary-replay",
        mission === "M07" ? "U-B" : "B",
      );
      const closed = e.processCommand(initial, {
        kind: "CLOSE_CASE",
        finding: initial.view.finding,
        runId: initial.view.runId,
        commandId: "close",
        expectedRevision: 0,
      });
      if (closed.receipt.status !== "accepted")
        throw Error(closed.receipt.error);
      return JSON.stringify(f.exportSave(closed.state));
    }, mission);
    await area.locator('input[type="file"]').setInputFiles({
      name: "closed.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixture),
    });
    const replay = area.getByRole("button", {
      name: "Try another approach",
      exact: true,
    });
    await expect(replay).toBeDisabled();
    const download = page.waitForEvent("download");
    await area
      .getByRole("button", { name: "Export save", exact: true })
      .click();
    expect(
      JSON.parse(await readFile(await (await download).path(), "utf8")).runId,
    ).toBe("temporary-replay");
    const acknowledgement = area.getByRole("checkbox", {
      name: /I exported the temporary closed finding/,
    });
    await acknowledgement.check();
    await replay.click();
    await expect(area.getByRole("status")).toHaveText(
      "Temporary session — not saved",
    );
    await area
      .getByRole("navigation", {
        name: `${mission} investigation`,
        exact: true,
      })
      .getByRole("button", { name: "Case File", exact: true })
      .click();
    await area
      .getByRole("button", { name: "Review finding", exact: true })
      .click();
    await area
      .getByRole("button", { name: "Confirm and close case", exact: true })
      .click();
    await expect(replay).toBeDisabled();
    await expect(acknowledgement).not.toBeChecked();
    const rows = await page.evaluate(async () => {
      // @ts-expect-error Vite test fixture.
      const { database } = await import("/src/campaign/storage.ts");
      return database.rows.toArray();
    });
    expect(rows).toEqual([]);
  });
}

test("expansion Review preserves notes during a pending command and a rejected edit", async ({
  page,
}) => {
  await page.goto("/case/m02");
  const area = page.locator('[data-expansion="M02"]');
  await area.getByRole("button", { name: /^Begin investigation/ }).click();
  const status = area
    .getByRole("region", { name: "M02 save and readiness", exact: true })
    .getByRole("status");
  await expect(status).toHaveText("Saved on this device", { timeout: 30000 });
  await area
    .getByRole("navigation", { name: "M02 investigation", exact: true })
    .getByRole("button", { name: "Case File", exact: true })
    .click();
  await area
    .getByRole("navigation", { name: "M02 Case File steps", exact: true })
    .getByRole("button", { name: "Next step", exact: true })
    .click();
  await area
    .getByRole("textbox", { name: "Optional case notes", exact: true })
    .fill("Do not discard while busy");
  await holdNextCommit(page);
  await area
    .getByRole("combobox", { name: "Next action", exact: true })
    .selectOption("restrict_access");
  await expect(status).toHaveText("Working…");
  const review = area
    .getByRole("button", { name: "Review finding", exact: true })
    .last();
  await expect(review).toBeDisabled();
  expect(await unloadBlocked(page)).toBe(true);
  await page.evaluate(() =>
    (
      globalThis as typeof globalThis & { releaseCommit: () => void }
    ).releaseCommit(),
  );
  await expect(status).toHaveText("Saved on this device");
  await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/expansion/storage.ts");
    const row = await database.rows.get("active:M02");
    const uuid = crypto.randomUUID.bind(crypto);
    crypto.randomUUID = () => row.current.commands[0].commandId;
    Object.assign(globalThis, {
      restoreUUID: () => {
        crypto.randomUUID = uuid;
      },
    });
  });
  await review.click();
  await expect(area.getByRole("alert")).toContainText("Request not accepted");
  await expect(
    area.getByRole("region", { name: "Finding confirmation", exact: true }),
  ).toHaveCount(0);
  const controls = area.locator(".backup-import");
  await controls.locator("summary").first().click();
  await expect(controls.getByRole("checkbox")).toBeDisabled();
  expect(await unloadBlocked(page)).toBe(true);
  await expect(
    area.getByRole("textbox", { name: "Optional case notes", exact: true }),
  ).toHaveValue("Do not discard while busy");
  await page.evaluate(() =>
    (
      globalThis as typeof globalThis & { restoreUUID: () => void }
    ).restoreUUID(),
  );
  await review.click();
  await expect(
    area.getByRole("region", { name: "Finding confirmation", exact: true }),
  ).toBeVisible();
  await expect(status).toHaveText("Saved on this device");
  expect(await unloadBlocked(page)).toBe(false);
  const saved = await page.evaluate(async () => {
    // @ts-expect-error Vite test fixture.
    const { database } = await import("/src/expansion/storage.ts");
    return database.rows.get("active:M02");
  });
  expect(saved.current.snapshot.state.view.finding.notes).toBe(
    "Do not discard while busy",
  );
  expect(saved.current.commands).toHaveLength(2);

  await area
    .getByRole("button", { name: "Return to investigation", exact: true })
    .click();
  const notes = area.getByRole("textbox", {
    name: "Optional case notes",
    exact: true,
  });
  await notes.fill("Snapshot being saved");
  await holdNextCommit(page);
  await area
    .getByRole("button", { name: "Save optional notes · free", exact: true })
    .click();
  await expect(status).toHaveText("Working…");
  await notes.fill("New typing during the pending save");
  await page.evaluate(() =>
    (
      globalThis as typeof globalThis & { releaseCommit: () => void }
    ).releaseCommit(),
  );
  await expect(status).toHaveText("Saved on this device");
  await expect(controls.getByRole("checkbox")).toBeDisabled();
  expect(await unloadBlocked(page)).toBe(true);
  await expect(notes).toHaveValue("New typing during the pending save");
  await area
    .getByRole("button", { name: "Save optional notes · free", exact: true })
    .click();
  await expect(status).toHaveText("Saved on this device");
  expect(await unloadBlocked(page)).toBe(false);
});
