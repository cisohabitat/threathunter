import { test, expect } from "@playwright/test";

test("cold home fetches only the selected responsive art and can begin offline", async ({
  page,
  context,
}) => {
  const artwork = new Set<string>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/\/art\/northstar-investigation-.*\.webp$/.test(path))
      artwork.add(path);
  });
  await page.goto("/");
  const begin = page.getByRole("button", { name: "Begin investigation" });
  await expect(begin).toBeEnabled();
  await expect(page.locator(".hero-art")).toHaveJSProperty("complete", true);
  const variant = page.viewportSize()!.width <= 767 ? "portrait" : "landscape";
  const selected = `/art/northstar-investigation-${variant}-v1.webp`;
  await expect(page.locator(".hero-art")).toHaveJSProperty(
    "naturalWidth",
    variant === "portrait" ? 720 : 1440,
  );
  expect([...artwork]).toEqual([selected]);
  await context.setOffline(true);
  await begin.click();
  await expect(
    page
      .getByRole("region", { name: "Save and readiness", exact: true })
      .getByRole("status"),
  ).toHaveText("Saved on this device");
  await expect(page.locator(".step-badge")).toContainText("STEP 0");
});
