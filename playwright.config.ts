import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const publicRpcUrl =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ??
  'https://sepolia-rollup.arbitrum.io/rpc';
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const browserLaunchOptions = browserChannel ? { channel: browserChannel } : {};

export default defineConfig({
  testDir: './apps/web/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...browserLaunchOptions },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], ...browserLaunchOptions },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm --filter @onchain-contract-lab/web dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL: publicRpcUrl,
        },
      },
});
