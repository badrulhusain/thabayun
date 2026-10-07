import { test, expect } from '@playwright/test';
import type { Claim } from '../../lib/types';

test('missing approved sources blocks analysis and explains reference input', async ({ page, request }) => {
  const text = 'فَإِنَّ مَعَ الْعُسْرِ عُسْرًا';
  let claim: Claim;
  let analysisRequests = 0;
  await page.route('**/api/claims/extract', async route => {
    const body = route.request().postDataJSON();
    claim = { id: 'empty-evidence-fixture', projectId: body.projectId, materialId: body.materialId, materialRevision: body.materialRevision, revision: 1, excerpt: text, start: 0, end: text.length, statement: text, type: 'Historical or general factual claim', quotation: '', speaker: '', reference: '', validationIssue: '', coverageNote: 'Coverage is limited to ten historical English Quran translation excerpts.' };
    await route.fulfill({ json: { claims: [claim], model: 'fixture', promptVersion: 'fixture' } });
  });
  await page.route('**/api/claims/retrieve', async route => {
    await route.fulfill({ json: { retrieval: { id: 'empty-run', projectId: claim.projectId, claimId: claim.id, claimRevision: 1, materialRevision: 1, collectionVersion: 'approved-providers-v1', searchedAt: new Date().toISOString(), queries: [], coverage: 'No applicable approved resources.', sourcesSearched: [], passages: [], attempts: [{ provider: 'resources', outcome: 'not_configured', limitations: ['Resource approval required.'] }] } } });
  });
  await page.route('**/api/claims/analyze', async route => { analysisRequests++; await route.fulfill({ status: 500, body: '{}' }); });
  await page.goto('/projects');
  await page.getByLabel('Title', { exact: true }).fill('Empty evidence test');
  await page.getByLabel('Research question', { exact: true }).fill('Reference lookup prerequisites');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByLabel('Paste or edit text').fill(text);
  await page.getByRole('button', { name: 'Save material', exact: true }).click();
  await page.getByRole('button', { name: 'Extract claims', exact: true }).click();
  await page.getByRole('checkbox', { name: /Investigate:/ }).check();
  await page.getByRole('button', { name: 'Retrieve selected claims (up to 5)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run evidence-based analysis', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Run fresh analysis', exact: true })).toBeDisabled();
  await expect(page.getByText('Analysis needs at least one selected source passage.', { exact: false })).toBeVisible();
  await expect(page.getByText('Coverage is limited to ten historical English Quran translation excerpts.', { exact: true })).toHaveCount(0);
  expect(analysisRequests).toBe(0);
  const response = await request.post('/api/claims/analyze', { data: { claim: claim!, passageIds: [] } });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.code).toBe('NO_EVIDENCE');
  await page.getByRole('button', { name: 'Edit claim', exact: true }).click();
  await page.getByRole('combobox', { name: /^Claim type/ }).selectOption('Quran quotation or attribution');
  await page.getByLabel('Explicit quotation', { exact: true }).fill(text);
  await page.getByLabel('Cited reference', { exact: true }).fill('94:5');
  await page.getByRole('button', { name: 'Save claim', exact: true }).click();
  await expect(page.getByText('Reference: 94:5', { exact: false })).toBeVisible();
});
