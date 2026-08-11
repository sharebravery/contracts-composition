import { expect, test } from '@playwright/test';

const labs = [
  { slug: 'airdrop', writeButtons: ['Claim tokens'] },
  { slug: 'reward-pool', writeButtons: ['Approve', 'Stake'] },
  { slug: 'vault', writeButtons: ['Approve', 'Deposit'] },
  {
    slug: 'upgradeable',
    writeButtons: ['Send payment', 'Allow', 'Send batch'],
  },
] as const;

test.describe('Phase 1 live labs', () => {
  for (const lab of labs) {
    test(`${lab.slug} exposes verified registry state without a wallet`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));

      await page.goto(`/labs/${lab.slug}`);
      await expect(
        page.getByRole('button', {
          name: /Developer Panel verified deployment/i,
        }),
      ).toBeVisible();
      await expect(
        page.getByText('Live', { exact: true }).first(),
      ).toBeVisible();

      for (const buttonName of lab.writeButtons) {
        await expect(
          page.getByRole('button', { name: buttonName, exact: true }),
        ).toBeDisabled();
      }

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth).toBe(layout.clientWidth);
      expect(consoleErrors).toEqual([]);
    });
  }
});
