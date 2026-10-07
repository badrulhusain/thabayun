import { test, expect } from '@playwright/test';

test('public policy pages, logo and production headers', async ({ page, request }) => {
  for (const [path, heading] of [['/privacy', 'Privacy policy'], ['/terms', 'Terms of service'], ['/data', 'Manage my data']]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Legal and privacy' })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const logo = await request.get('/logo.svg');
  expect(logo.status()).toBe(200);
  expect(logo.headers()['content-type']).toContain('image/svg+xml');
  const response = await request.get('/privacy');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-powered-by']).toBeUndefined();
  const api = await request.get('/api/claims/config');
  expect(api.headers()['cache-control']).toContain('no-store');
});

test('data deletion requires confirmation and surfaces retryable errors', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/data', async route => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ confirm: true });
    await route.fulfill({ status: requests === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(requests === 1 ? { error: { message: 'Deletion was not completed. Please retry.' } } : { deleted: true }) });
  });
  await page.goto('/data');
  const button = page.getByRole('button', { name: 'Delete my data', exact: true });
  await expect(button).toBeDisabled();
  await page.getByLabel('I understand that deleting these records cannot be undone.').check();
  await button.click();
  await expect(page.getByRole('status')).toContainText('Please retry');
  await button.click();
  await expect(page.getByRole('status')).toContainText('Server records for this session were deleted.');
  await expect(button).toBeDisabled();
  expect(requests).toBe(2);
});
