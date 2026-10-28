import { defineConfig, devices } from "@playwright/test";
// Optional local override when preinstalled Chromium differs from the pinned build.
const chromium = process.env.THREAT_HUNTER_CHROMIUM_PATH
  ? {
      launchOptions: {
        executablePath: process.env.THREAT_HUNTER_CHROMIUM_PATH,
      },
    }
  : {};
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...chromium } },
    {
      name: "phone",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        ...chromium,
      },
    },
  ],
});
