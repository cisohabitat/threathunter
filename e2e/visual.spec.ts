import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const saved = (page: Page) =>
  expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device", { timeout: 30000 });
async function portable(page: Page) {
  await saved(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  return JSON.parse(await readFile(await (await download).path(), "utf8"));
}
// A sticky header must never sit over a heading or record scrolled into view.
async function clearOfHeader(target: Locator) {
  const [top, headerBottom] = await target.evaluate((e) => {
    const header = document.querySelector(".utility-header")!;
    return [
      e.getBoundingClientRect().top,
      getComputedStyle(header).position === "sticky"
        ? header.getBoundingClientRect().bottom
        : -Infinity,
    ];
  });
  expect(top).toBeGreaterThanOrEqual(headerBottom - 1);
}
async function uncovered(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  expect(
    await control.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return [
        [r.left + 4, r.top + 4],
        [r.right - 4, r.bottom - 4],
      ].every(([x, y]) => e.contains(document.elementFromPoint(x, y)));
    }),
  ).toBe(true);
}
for (const width of [320, 390, 1440]) {
  test(`visual hierarchy and reserved utilities remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width,
      height: width === 320 ? 740 : width === 390 ? 844 : 1000,
    });
    await page.goto("/");
    const begin = page.getByRole("button", { name: /^Begin investigation/ });
    await expect(begin).toBeEnabled({ timeout: 30000 });
    if (width < 740)
      expect(
        (await page.locator(".utility-header").boundingBox())!.height,
      ).toBeLessThanOrEqual(140);
    await begin.click();
    await saved(page);
    await page
      .getByRole("button", {
        name: "Compare usual sign-ins · 1 step →",
        exact: true,
      })
      .click();
    await saved(page);
    await page
      .getByRole("button", { name: "Choose what to check next →", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Was overnight work approved? · 1 step",
        exact: true,
      })
      .click();
    await saved(page);
    await clearOfHeader(page.locator(".guided-case h1"));
    await expect(
      page
        .getByRole("region", { name: "Save and readiness", exact: true })
        .getByText(/^(Case|Text) ready/),
    ).toHaveCount(1);
    const before = await portable(page);
    const record = page.locator(".flow-beat .flow-observation");
    await expect(record.locator(".record-heading")).toContainText(
      "Approved work",
    );
    await expect(record.locator(".record-coverage")).toContainText(
      "Through step 1",
    );
    await record.getByText("Record details", { exact: true }).click();
    await expect(
      record.getByText("Source lineage", { exact: true }),
    ).toBeVisible();
    await uncovered(
      page.getByRole("button", {
        name: "Choose what to check next →",
        exact: true,
      }),
    );
    const mute = page.getByRole("button", { name: "Mute all", exact: true });
    await expect(mute).toBeInViewport();
    await uncovered(mute);
    expect(await mute.evaluate((e) => getComputedStyle(e).position)).toBe(
      "static",
    );
    await page
      .getByRole("button", { name: "Voice & sound", exact: true })
      .click();
    expect(
      await page
        .locator(".utility-header")
        .evaluate((e) => getComputedStyle(e).position),
    ).toBe("relative");
    await expect(
      page.getByRole("button", { name: "Enable voice and sound", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Voice & sound", exact: true })
      .click();
    expect(await portable(page)).toEqual(before);
    await page
      .getByRole("button", { name: "Review finding →", exact: true })
      .click();
    const edit = page.getByRole("button", {
      name: "Edit unknowns",
      exact: true,
    });
    expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await edit.evaluate((e) => getComputedStyle(e).textDecorationLine),
    ).toContain("underline");
    await uncovered(edit);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Confirm and close case", exact: true })
      .click();
    await saved(page);
    await expect(page.locator(".debrief-next")).toBeVisible();
    await expect(page.locator(".debrief > h1")).toBeFocused();
    const evidence = page.locator(".evidence-reconstruction");
    await expect(evidence).not.toHaveAttribute("open");
    const closed = await portable(page);
    await page
      .getByRole("button", { name: "Review the evidence ↓", exact: true })
      .click();
    await expect(evidence).toHaveAttribute("open", "");
    await expect(
      page.getByRole("combobox", { name: /^What I knew then/ }),
    ).toBeVisible();
    await expect(
      evidence.locator(".record").first().locator(".record-coverage"),
    ).toHaveCount(1);
    await expect(evidence.getByText(/^Collected through step/)).toHaveCount(0);
    expect(await portable(page)).toEqual(closed);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("case screens add no investigation-art fetch after the home art fails", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/art/northstar-investigation-"))
      requested.push(request.url());
  });
  await page.route("**/art/northstar-investigation-*", (route) =>
    route.abort(),
  );
  await page.goto("/");
  const begin = page.getByRole("button", { name: /^Begin investigation/ });
  await expect(begin).toBeEnabled({ timeout: 30000 });
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByText("Case ready · optional sound below", { exact: true }),
  ).toHaveCount(1, { timeout: 30000 });
  const homeRequests = requested.length;
  await begin.click();
  await saved(page);
  await page
    .getByRole("button", {
      name: "Compare usual sign-ins · 1 step →",
      exact: true,
    })
    .click();
  await saved(page);
  expect(
    await page
      .locator(".m01-shell")
      .evaluate((e) => getComputedStyle(e, "::before").backgroundImage),
  ).not.toContain("northstar-investigation");
  expect(requested).toHaveLength(homeRequests);
});

for (const [path, mission] of [
  ["/case/m04", "M04"],
  ["/case/m02", "M02"],
] as const)
  for (const width of [390, 1280])
    test(`${mission} uses the shared utility header with measured clearance at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      const shell = page.locator(
        `[data-mission="${mission}"], [data-expansion="${mission}"]`,
      );
      const header = shell.locator(".utility-header");
      await expect(header).toHaveCount(1);
      await expect(shell.getByRole("button", { name: /^Begin/ })).toBeEnabled({
        timeout: 30000,
      });
      // Sticky headers publish their height; tall ones scroll away and publish 0.
      const [height, sticky, published] = await header.evaluate((e) => [
        Math.ceil(e.getBoundingClientRect().height),
        getComputedStyle(e).position === "sticky",
        getComputedStyle(document.documentElement)
          .getPropertyValue("--utility-header-sticky")
          .trim(),
      ]);
      expect(published).toBe(sticky ? `${height}px` : "0px");
      if (width === 1280) expect(sticky).toBe(true);
      const mute = shell.getByRole("button", { name: "Mute all", exact: true });
      if (sticky) {
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await expect(mute).toBeInViewport();
      }
      await uncovered(mute);
      // Switching to M01 republishes the visible header's own clearance.
      await shell
        .getByRole("button", {
          name: "New here? Learn with The Midnight Login →",
        })
        .click();
      await expect(page).toHaveURL(/\/case\/m01$/);
      const m01 = page.locator(".m01-shell .utility-header");
      await expect(m01).toBeVisible();
      await expect
        .poll(() =>
          m01.evaluate((e) => {
            const own =
              getComputedStyle(e).position === "sticky"
                ? `${Math.ceil(e.getBoundingClientRect().height)}px`
                : "0px";
            return (
              getComputedStyle(document.documentElement)
                .getPropertyValue("--utility-header-sticky")
                .trim() === own
            );
          }),
        )
        .toBe(true);
    });
