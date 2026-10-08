import { test, expect } from '@playwright/test';

test('production research guides guests to account sign-in', async ({ page }) => {
  await page.goto('/research');
  await page.getByRole('link', { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New here? Create account' }).click();
  await expect(page.getByText(/Password recovery is not available/)).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('explicit reference sample creates a reviewable claim without a model call', async ({ page }) => {
  let extractionCalls = 0;
  await page.route('**/api/claims/extract', route => { extractionCalls++; return route.abort(); });
  await page.goto('/');
  await page.getByRole('button', { name: /Quran · 1:1/ }).click();
  await expect(page.getByLabel('Known reference (optional)')).toHaveValue('1:1');
  await page.getByRole('button', { name: 'Investigate & Trace Sources →' }).click();
  await expect(page.getByText('Reference: 1:1', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open saved inquiry ↗' })).toBeVisible();
  expect(extractionCalls).toBe(0);
});

test('public status has only documented availability fields', async ({ request, page }) => {
  const result = await request.get('/api/status');
  expect(result.status()).toBe(200);
  expect(result.headers()['cache-control']).toContain('no-store');
  expect(Object.keys(await result.json()).sort()).toEqual(['database', 'modelConfigured', 'ocrConfigured', 'quranConfigured', 'quranEnvironment', 'sunnahConfigured', 'ummahConfigured', 'approvedResources'].sort());
  await page.goto('/sources');
  await expect(page.getByRole('heading', { name: 'Service availability' })).toBeVisible();
  await expect(page.getByText('UmmahAPI', { exact: true })).toBeVisible();
  await expect(page.getByText('Turath', { exact: true })).toBeVisible();
  await expect(page.getByText('OpenITI', { exact: true })).toBeVisible();
});
