"use strict";

const { defineConfig, devices } = require("playwright/test");

module.exports = defineConfig({
  testDir: "./tests/site",
  testMatch: "cross-browser.smoke.spec.cjs",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "test-results/playwright-smoke",
});
