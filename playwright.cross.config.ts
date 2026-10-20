import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        launchOptions: process.env.THREAT_HUNTER_WEBKIT_ROOT
          ? {
              executablePath:
                process.env.THREAT_HUNTER_WEBKIT_ROOT + "/bin/MiniBrowser",
              env: {
                ...process.env,
                WEBKIT_EXEC_PATH:
                  process.env.THREAT_HUNTER_WEBKIT_ROOT + "/bin",
                WEBKIT_INJECTED_BUNDLE_PATH:
                  process.env.THREAT_HUNTER_WEBKIT_ROOT + "/lib",
                WEBKIT_INSPECTOR_RESOURCES_PATH:
                  process.env.THREAT_HUNTER_WEBKIT_ROOT + "/share",
                LD_LIBRARY_PATH: [
                  process.env.THREAT_HUNTER_WEBKIT_LIBS,
                  process.env.THREAT_HUNTER_WEBKIT_ROOT + "/lib",
                  process.env.THREAT_HUNTER_WEBKIT_ROOT + "/sys/lib",
                ]
                  .filter(Boolean)
                  .join(":"),
              },
            }
          : {},
      },
    },
  ],
});
