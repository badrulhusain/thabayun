import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { retrieve } from '../../lib/claims/retrieval';
import type { Claim } from '../../lib/types';
test('bundled side panel reviews, retrieves, saves, exports, and reopens with mocked Chrome storage',async({page})=>{
 await page.addInitScript(()=>{
   let captures: unknown[]=[];
   Object.defineProperty(window,'chrome',{value:{runtime:{sendMessage:async(m:{type:string;capture?:{id:string};id?:string})=>{
     if(m.type==='put'&&m.capture){captures=captures.filter(x=>(x as {id:string}).id!==m.capture!.id);captures.push(structuredClone(m.capture));}
     if(m.type==='delete')captures=captures.filter(x=>(x as {id:string}).id!==m.id);
     return {captures:structuredClone(captures)};
   }},storage:{onChanged:{addListener:()=>{},removeListener:()=>{}}}}});
 });
 await page.route('**/extension-harness/**',async route=>{
   const filename=path.basename(new URL(route.request().url()).pathname);
   await route.fulfill({body:fs.readFileSync(path.resolve('extension/dist',filename)),contentType:filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':'text/html'});
 });
 await page.route('**/api/claims/retrieve',async route=>{
   const {claim}=route.request().postDataJSON() as {claim:Claim};await route.fulfill({json:{retrieval:retrieve(claim)},headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.goto('/extension-harness/sidepanel.html');
 await page.getByRole('button',{name:'New manual paste'}).click();await page.getByRole('textbox',{name:'Text',exact:true}).fill('Seek aid with patience and prayer');await page.getByLabel('Personal note',{exact:true}).fill('Keep this excerpt');
 await page.getByRole('button',{name:'Save excerpt',exact:true}).click();await expect(page.getByText('Excerpt saved on this device.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Investigation',exact:true}).click();await page.getByRole('button',{name:'Add claim manually'}).click();await page.getByLabel('statement',{exact:true}).fill('The passage asks for patience and prayer');await page.getByLabel('reference',{exact:true}).fill('palmer-b-3');await page.getByLabel('Select claim',{exact:true}).check();await page.getByRole('button',{name:'Retrieve evidence',exact:true}).click();await expect(page.getByRole('heading',{name:'Retrieved evidence',exact:true})).toBeVisible();
 await page.route('**/api/claims/analyze',async route=>{
   const {claim}=route.request().postDataJSON() as {claim:Claim};const retrieval=retrieve(claim);const p=retrieval.passages[0];
   await route.fulfill({json:{analysis:{id:'mock-finding',projectId:'extension',claimId:claim.id,claimRevision:claim.revision,materialId:claim.materialId,materialRevision:claim.materialRevision,claimSnapshot:claim,retrievalSnapshot:retrieval,quotation:'Not applicable',reference:'Resolved and matches the cited passage',support:'Supported by retrieved evidence',explanation:'MOCK AI: The passage asks for patience and prayer.',evidence:[{passageId:p.id,excerpt:'Seek aid with patience and prayer',relation:'supporting',passageSnapshot:p,citationSnapshot:p.source}],limitations:['One historical translation.'],unresolvedQuestions:[],nextStep:'Review the edition.',model:'mock',promptVersion:'test',collectionVersion:retrieval.collectionVersion,createdAt:new Date().toISOString(),status:'complete',personalNote:''}},headers:{'Access-Control-Allow-Origin':'*'}});
 });
 await page.getByRole('button',{name:'Run analysis',exact:true}).click();await expect(page.getByText('MOCK AI: The passage asks for patience and prayer.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save finding',exact:true}).click();await expect(page.getByText('Finding saved on this device.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Capture',exact:true}).click();await page.getByRole('textbox',{name:'Text',exact:true}).fill('Changed capture');await page.getByRole('button',{name:'Investigation',exact:true}).click();await expect(page.getByRole('heading',{name:'AI analysis — outdated',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Notebook',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();const downloaded=await download;const location=await downloaded.path();expect(location).toBeTruthy();const data=JSON.parse(fs.readFileSync(location!,'utf8'));expect(data.captures[0].analyses).toHaveLength(1);expect(data.captures[0].originalText).toBe('');
 await page.getByRole('button',{name:'Reopen',exact:true}).click();await expect(page.getByRole('textbox',{name:'Text',exact:true})).toHaveValue('Changed capture');
 let release = () => {};
 const gate = new Promise<void>(resolve => { release=resolve; });
 await page.route('**/api/claims/extract',async route=>{await gate;await route.fulfill({json:{claims:[],model:'mock',promptVersion:'test'},headers:{'Access-Control-Allow-Origin':'*'}}).catch(()=>{});});
 const started=page.waitForRequest('**/api/claims/extract');await page.getByRole('button',{name:'Extract claims',exact:true}).click();await started;
 await page.getByRole('textbox',{name:'Text',exact:true}).fill('Edit while extraction is running');release();
 await expect(page.getByRole('alert')).toContainText('Canceled');await page.getByRole('button',{name:'Investigation',exact:true}).click();await expect(page.getByRole('textbox',{name:'statement',exact:true})).toHaveValue('The passage asks for patience and prayer');
});
