import { test, expect } from '@playwright/test';

test('repair an older Arabic extraction with incorrect character positions', async ({ page }) => {
  const excerpt = 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا';
  await page.route('**/api/claims/extract', async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ model: 'synthetic', promptVersion: 'legacy-fixture', claims: [{
      id: 'legacy-claim', projectId: body.projectId, materialId: body.materialId, materialRevision: 1, revision: 1,
      excerpt, start: 1, end: 26, statement: 'SYNTHETIC legacy claim', type: 'Quran quotation or attribution', quotation: excerpt,
      speaker: '', reference: '94:5', validationIssue: 'Excerpt and offsets do not match saved material. Correct the excerpt before investigating.', coverageNote: 'Synthetic test',
    }] }) });
  });
  await page.goto('/');
  await page.getByLabel('Your quotation or research claim').fill(excerpt);
  await page.getByRole('button', { name: 'Investigate & Trace Sources →' }).click();
  await page.getByRole('button', { name: 'Extract claims', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'Investigate: SYNTHETIC legacy claim' });
  await expect(checkbox).toBeDisabled();
  await page.getByRole('button', { name: 'Edit claim', exact: true }).click();
  await page.getByRole('button', { name: 'Save claim', exact: true }).click();
  await expect(checkbox).toBeEnabled();
  await checkbox.check();
  await expect(page.getByRole('button', { name: 'Retrieve selected claims (up to 5)' })).toBeEnabled();
  await page.getByRole('button', { name: 'Inspect claim', exact: true }).click();
  await expect(page.getByText(`Material excerpt · characters 0–${excerpt.length}`, { exact: true })).toBeVisible();
});
