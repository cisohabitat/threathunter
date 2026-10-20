import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("keyboard investigation, source limits, retained notes, world reconstruction and axe checks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const audit = async () => {
    const result = await new AxeBuilder({ page })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22a",
        "wcag22aa",
      ])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  };
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("button", { name: "Begin investigation" }),
  ).toBeEnabled();
  await audit();
  await page.getByRole("button", { name: /Independent investigation/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Begin investigation" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page
    .getByText("Field guide · terms, scope and authority", { exact: true })
    .click();
  await expect(
    page.getByText("A relevant comparison with usual activity", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByText("Field guide · terms, scope and authority", { exact: true })
    .click();
  await page
    .getByText("What this source can establish", { exact: true })
    .first()
    .click();
  await expect(
    page.getByText(
      "A baseline does not prove that a legitimate exception is impossible.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await page
    .getByRole("navigation", { name: "Case File steps" })
    .getByRole("button", { name: /Next step/ })
    .click();
  await page
    .getByRole("textbox", { name: "Optional notes · not graded" })
    .fill("Retain this unfinished note between destinations.");
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Explore/ })
    .click();
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Optional notes · not graded" }),
  ).toHaveValue("Retain this unfinished note between destinations.");
  await audit();
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await page
    .getByText("Reveal world, collection and acquisition timeline", {
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "What happened in the simulation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What reached you before closure" }),
  ).toBeVisible();
  await audit();
});

test("200% text, reduced motion, rotation and slow/failed art preserve the full text case", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/art/*.webp", (route) => route.abort());
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(page.locator(".hero-art")).toHaveAttribute(
    "src",
    "/art/northstar-night.svg",
  );
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page.evaluate(() => {
    const metrics = [...document.querySelectorAll<HTMLElement>("*")].map(
      (element) => ({
        element,
        size: parseFloat(getComputedStyle(element).fontSize),
      }),
    );
    for (const { element, size } of metrics)
      element.style.fontSize = `${size * 2}px`;
  });
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 320, height: 740 },
    { width: 740, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    for (const name of ["Explore", "Case File", "Timeline", "Leads"]) {
      await page
        .getByRole("navigation", { name: "Investigation", exact: true })
        .getByRole("button", { name: new RegExp(name) })
        .click();
      const reflow = await page.evaluate(() => ({
        width: innerWidth,
        scrollX,
        focus: document.activeElement?.outerHTML.slice(0, 160),
        overflowing: [...document.querySelectorAll<HTMLElement>("*")]
          .filter(
            (e) =>
              e.scrollWidth > e.clientWidth + 1 &&
              getComputedStyle(e).overflowX === "visible",
          )
          .slice(-15)
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            scroll: e.scrollWidth,
            client: e.clientWidth,
            text: e.textContent?.slice(0, 35),
          })),
        documentWidth: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll<HTMLElement>("*")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.right + scrollX > innerWidth + 1;
          })
          .slice(-12)
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            text: e.textContent?.slice(0, 45),
            right: e.getBoundingClientRect().right,
          })),
      }));
      expect(
        reflow.documentWidth,
        JSON.stringify({ viewport, name, reflow }),
      ).toBeLessThanOrEqual(reflow.width);
    }
  }
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
  await page
    .getByRole("navigation", { name: "Investigation", exact: true })
    .getByRole("button", { name: /Case File/ })
    .click();
  await page
    .getByRole("button", { name: "Review finding →", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Confirm and close case" }).click();
  await expect(
    page.getByRole("heading", { name: "After your handoff" }),
  ).toBeVisible();
});

test("a browser without Web Locks plays only explicitly in memory and never writes the active save", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Begin investigation" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Autosave is read-only in this browser.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue explicitly without saving" })
    .click();
  await page.getByRole("button", { name: /Independent investigation/ }).click();
  await page.getByRole("button", { name: "Begin investigation" }).click();
  await page
    .getByRole("button", { name: "Collect through step 0 · 1 step" })
    .first()
    .click();
  await expect(page.locator(".step-badge")).toContainText("STEP 1");
  await expect(page.getByRole("status")).toHaveText(
    "Temporary session — not saved",
  );
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Browser import.
      const { database } = await import("/src/persistence/saves.ts");
      return await database.runs.get("active");
    }),
  ).toBeUndefined();
  await expect(
    page.getByRole("button", { name: "Try saving this session" }),
  ).toHaveCount(0);
});
