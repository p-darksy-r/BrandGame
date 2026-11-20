// Copyright (c) 2026 p-darksy-r. BrandGame.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    workers: 1,
    retries: 0,
    reporter: 'list',
    use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, viewport: { width: 1024, height: 768 }, trace: 'retain-on-failure' },
    webServer: { command: 'node scripts/serve-web.mjs 8766', url: 'http://127.0.0.1:8766', reuseExistingServer: false }
});
