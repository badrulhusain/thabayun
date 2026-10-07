import { test, expect } from '@playwright/test';
test('notebook import is validated, idempotent, persists, and keeps page metadata',async({page})=>{
 await page.goto('/projects');await page.getByLabel('Title',{exact:true}).fill('Extension destination');await page.getByLabel('Research question',{exact:true}).fill('Review my selections');await page.getByRole('button',{name:'Create project',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Extension notebook',exact:true})).toBeVisible();
 const capture={id:'capture-fixture',originalText:'<script>alert(1)</script>',editedText:'Reviewed excerpt',title:'Original captured page',url:'https://example.org/source',createdAt:'2026-10-06T00:00:00.000Z',note:'Personal observation',revision:2,claims:[],retrievals:[],analyses:[],saved:true};
 const data={format:'tabayyun-extension',version:1,captures:[capture]};
 const upload=async(value:unknown)=>page.getByLabel('Versioned notebook JSON').setInputFiles({name:'notebook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 await upload(data);await expect(page.getByText('Reviewed excerpt',{exact:true})).toHaveCount(1);await upload(data);await expect(page.getByText('Reviewed excerpt',{exact:true})).toHaveCount(1);
 await page.reload();await expect(page.getByText('Reviewed excerpt',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Original page',exact:true})).toHaveAttribute('href',capture.url);
 await page.getByText('Original selection',{exact:true}).click();await expect(page.getByText(capture.originalText,{exact:true})).toBeVisible();
 await upload({...data,version:999});await expect(page.getByRole('status').filter({hasText:'Unsupported notebook'})).toBeVisible();await expect(page.getByText('Reviewed excerpt',{exact:true})).toHaveCount(1);
});
