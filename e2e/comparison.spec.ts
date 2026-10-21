import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function seed(page: Page, mission: string, closed: boolean) {
  await page.goto("/");
  await page.evaluate(
    async ({ mission, closed }) => {
      if (mission === "M01") {
        localStorage.setItem("threat-hunter-guidance-v1", "independent");
        // @ts-expect-error Vite fixture module.
        const e = await import("/src/engine/engine.ts");
        // @ts-expect-error Vite fixture module.
        const f = await import("/src/persistence/format.ts");
        // @ts-expect-error Vite fixture module.
        const { database } = await import("/src/persistence/saves.ts");
        let s = e.createRun("compare-m01", "M");
        const act = (a: object) => {
          const r = e.processCommand(s, {
            ...a,
            commandId: `c${s.view.revision}`,
            runId: s.view.runId,
            expectedRevision: s.view.revision,
          });
          if (r.receipt.status !== "accepted") throw Error(r.receipt.error);
          s = r.state;
        };
        for (const queryId of ["Q-F", "Q-H", "Q-F"])
          act({ kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
        if (closed) act({ kind: "CLOSE_CASE", draft: s.view.draft });
        await database.runs.put({
          id: "active",
          revision: s.view.revision,
          current: f.exportSave(s),
          previous: null,
        });
      } else {
        // @ts-expect-error Vite fixture module.
        const e = await import("/src/campaign/engine.ts");
        // @ts-expect-error Vite fixture module.
        const f = await import("/src/campaign/format.ts");
        // @ts-expect-error Vite fixture module.
        const { database } = await import("/src/campaign/storage.ts");
        let s = e.createRun(mission, "compare-" + mission, "U-M");
        const act = (a: object) => {
          const r = e.processCommand(s, {
            ...a,
            commandId: `c${s.view.revision}`,
            runId: s.view.runId,
            expectedRevision: s.view.revision,
          });
          if (r.receipt.status !== "accepted") throw Error(r.receipt.error);
          s = r.state;
        };
        for (const queryId of mission === "M04"
          ? ["account_hosts", "dependency"]
          : ["coverage", "health"]) {
          if (queryId === "dependency")
            act({ kind: "SCOPE", targetId: "LEGACY-01" });
          act({ kind: "ACQUIRE", queryId, cutoffTick: s.view.tick });
        }
        if (closed) act({ kind: "CLOSE_CASE", finding: s.view.finding });
        await database.rows.put({
          id: "active:" + mission,
          revision: s.view.revision,
          current: f.exportSave(s),
          previous: null,
        });
      }
    },
    { mission, closed },
  );
  await page.reload();
  if (mission === "M01")
    await page
      .getByRole("button", { name: "Resume investigation" })
      .click({ timeout: 30000 });
  else {
    await page
      .getByRole("button", { name: new RegExp(`${mission} ·`) })
      .click();
  }
  await expect(
    page.getByRole("region", {
      name: "Compare acquired observations",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 });
}
async function rows(page: Page) {
  return page.evaluate(async () => {
    // @ts-expect-error Vite fixture module.
    const { database: a } = await import("/src/persistence/saves.ts");
    // @ts-expect-error Vite fixture module.
    const { database: b } = await import("/src/campaign/storage.ts");
    return JSON.stringify([await a.runs.toArray(), await b.rows.toArray()]);
  });
}
for (const mission of ["M01", "M04", "M07"]) {
  test(`${mission} comparison is free, immutable and usable at 320px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await seed(page, mission, false);
    const before = await rows(page),
      panel = page.getByRole("region", {
        name: "Compare acquired observations",
        exact: true,
      });
    await panel
      .getByRole("button", {
        name: "Compare acquired observations · free",
        exact: true,
      })
      .click();
    const first = panel.getByRole("combobox", {
        name: "First observation",
        exact: true,
      }),
      second = panel.getByRole("combobox", {
        name: "Second observation",
        exact: true,
      });
    await first.selectOption({ index: 1 });
    await second.selectOption({ index: 2 });
    const snapshot = await panel
      .getByRole("article", { name: "First compared observation", exact: true })
      .innerText();
    await second.selectOption({ index: 3 });
    await expect(
      panel.getByRole("article", {
        name: "First compared observation",
        exact: true,
      }),
    ).toHaveText(snapshot, { useInnerText: true });
    await second.selectOption(await first.inputValue());
    await expect(panel).toContainText(
      "same acquired observation is selected twice",
    );
    await panel
      .getByRole("button", { name: "Hide observation comparison" })
      .click();
    await panel
      .getByRole("button", {
        name: "Compare acquired observations · free",
        exact: true,
      })
      .click();
    expect(await first.inputValue()).not.toBe("");
    const navigation = page.getByRole("navigation", {
      name: mission === "M01" ? "Investigation" : `${mission} investigation`,
      exact: true,
    });
    await navigation.getByRole("button", { name: /Timeline/ }).click();
    await expect(first).not.toHaveValue("");
    await navigation
      .getByRole("button", {
        name: mission === "M01" ? /Explore/ : "Investigate",
        exact: mission !== "M01",
      })
      .click();
    await panel.getByRole("button", { name: "Clear comparison" }).click();
    await page
      .getByRole("button", { name: "Compare observation · free", exact: true })
      .first()
      .click();
    await expect(
      panel.getByRole("heading", {
        name: "Compare two acquired snapshots",
        exact: true,
      }),
    ).toBeFocused();
    await page.setViewportSize({ width: 320, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".comparison")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await rows(page)).toBe(before);
    await panel.getByRole("button", { name: "Clear comparison" }).click();
    await expect(first).toHaveValue("");
    await expect(second).toHaveValue("");
    expect(await rows(page)).toBe(before);
  });
  test(`${mission} debrief comparison hides later deliveries without changing the closed save`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await seed(page, mission, true);
    const before = await rows(page),
      panel = page.getByRole("region", {
        name: "Compare acquired observations",
        exact: true,
      });
    await panel
      .getByRole("button", {
        name: "Compare acquired observations · free",
        exact: true,
      })
      .click();
    const second = panel.getByRole("combobox", {
      name: "Second observation",
      exact: true,
    });
    const values = await second
      .locator("option")
      .evaluateAll((es) => es.map((e) => (e as HTMLOptionElement).value));
    await second.selectOption(values.at(-1)!);
    const snapshot = await panel
      .getByRole("article", {
        name: "Second compared observation",
        exact: true,
      })
      .innerText();
    const time = page.getByRole(mission === "M01" ? "combobox" : "spinbutton", {
      name: "What I knew then",
      exact: true,
    });
    if (mission === "M01") await time.selectOption("0");
    else await time.fill("0");
    await expect(second).toHaveValue("");
    await expect(
      second.locator(`option[value='${values.at(-1)}']`),
    ).toHaveCount(0);
    await expect(panel).toContainText(
      "outside the currently shown observations",
    );
    await expect(
      panel.getByRole("article", {
        name: "Second compared observation",
        exact: true,
      }),
    ).toContainText("No snapshot selected");
    if (mission === "M01") await time.selectOption("3");
    else await time.fill("2");
    await expect(
      panel.getByRole("article", {
        name: "Second compared observation",
        exact: true,
      }),
    ).toHaveText(snapshot, { useInnerText: true });
    expect(await rows(page)).toBe(before);
  });
}
