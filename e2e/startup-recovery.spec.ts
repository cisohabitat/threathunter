import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const slot of ["M02", "M04", "free"] as const) {
  test(`${slot} retries unavailable validation before its first durable save`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const campaign = slot === "M04";
    await page.addInitScript(
      ({ campaign }) => {
        const NativeWorker = Worker;
        const marker = campaign ? "p1Worker" : "expansionWorker";
        Object.assign(window, {
          restoreStartupWorker: () => {
            window.Worker = NativeWorker;
          },
        });
        window.Worker = class extends NativeWorker {
          constructor(url: string | URL, options?: WorkerOptions) {
            if (String(url).includes(marker))
              throw new Error("Injected first-load validator failure");
            super(url, options);
          }
        };
      },
      { campaign },
    );
    await page.goto(
      slot === "free" ? "/hunt/free" : `/case/${slot.toLowerCase()}`,
    );
    const area = page.locator(
      campaign ? `[data-mission="${slot}"]` : `[data-expansion="${slot}"]`,
    );
    const begin = area.getByRole("button", {
      name: campaign ? "Begin investigation" : "Begin investigation",
      exact: true,
    });
    await expect(area.getByRole("alert")).toContainText(
      "validation is unavailable",
    );
    await expect(begin).toBeDisabled();
    const rows = () =>
      page.evaluate(async (campaign) => {
        const { database } = campaign
          ? // @ts-expect-error Vite browser fixture module.
            await import("/src/campaign/storage.ts")
          : // @ts-expect-error Vite browser fixture module.
            await import("/src/expansion/storage.ts");
        return database.rows.toArray();
      }, campaign);
    expect(await rows()).toEqual([]);
    await page.evaluate(() => {
      (
        window as typeof window & { restoreStartupWorker: () => void }
      ).restoreStartupWorker();
    });
    await area
      .getByRole("button", { name: "Retry saved-case inspection", exact: true })
      .click();
    await expect(area.getByRole("alert")).toHaveCount(0);
    if (slot === "free")
      await area
        .getByRole("textbox", { name: "Free-hunt seed", exact: true })
        .fill("first-load-retry");
    await expect(begin).toBeEnabled();
    expect(await rows()).toEqual([]);
    await begin.click();
    await expect(
      area.getByRole("status").filter({ hasText: "Saved on this device" }),
    ).toBeVisible();
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(`active:${slot}`);
    expect(stored[0].revision).toBe(0);
    const pending = page.waitForEvent("download");
    await area
      .getByRole("button", {
        name: campaign ? "Export save" : "Export save",
        exact: true,
      })
      .click();
    expect(
      JSON.parse(await readFile(await (await pending).path(), "utf8")),
    ).toEqual(stored[0].current);
    await page.reload();
    await expect(area.getByRole("alert")).toContainText(
      "validation is unavailable",
    );
    expect(await rows()).toEqual(stored);
    await page.evaluate(() => {
      (
        window as typeof window & { restoreStartupWorker: () => void }
      ).restoreStartupWorker();
    });
    await area
      .getByRole("button", { name: "Retry saved-case inspection", exact: true })
      .click();
    await expect(
      area.getByRole("status").filter({ hasText: "Saved on this device" }),
    ).toBeVisible();
    expect(await rows()).toEqual(stored);
  });
}
