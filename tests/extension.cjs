/* eslint-disable @typescript-eslint/no-require-imports */
require('./search.cjs');
const assert=require('node:assert/strict');
const {capture,current,exportNotebook,importNotebook,safeURL}=require('../lib/notebook.ts');
const {jsonBody,extensionPreflight}=require('../lib/claims/http.ts');
global.BACKEND_ORIGIN='http://localhost:3000';
const {request}=require('../extension/api.ts');
async function main(){
 const c=capture('original','Page','https://example.org/page');c.saved=true;c.editedText='edited';c.revision=2;
 const exported=exportNotebook([c]);assert.deepEqual(importNotebook(exported),[c]);
 assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(safeURL('data:text/html,test'),'');
 assert.equal(importNotebook({...exported,captures:[{...c,url:'javascript:alert(1)'}]})[0].url,'');
 assert.throws(()=>importNotebook({...exported,version:2}));assert.throws(()=>importNotebook({...exported,captures:[c,c]}));assert.throws(()=>importNotebook({...exported,captures:[{...c,editedText:{html:'bad'}}]}));
 assert.throws(()=>importNotebook({...exported,captures:[{...c,analyses:[{id:'x'}]}]}));
 const claim={revision:2};assert.equal(current(c,claim,{materialRevision:2,claimRevision:2}),true);assert.equal(current({...c,revision:3},claim,{materialRevision:2,claimRevision:2}),false);
 process.env.NODE_ENV='development';process.env.TABAYYUN_EXTENSION_ORIGIN='chrome-extension://'+'a'.repeat(32);
 const req=(url='http://localhost:3000/api/claims/extract',origin=process.env.TABAYYUN_EXTENSION_ORIGIN)=>new Request(url,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});
 assert.deepEqual(await jsonBody(req()),{});assert.equal(extensionPreflight(req()).status,204);
 await assert.rejects(jsonBody(req(undefined,'https://evil.test')));assert.equal(extensionPreflight(req('https://public.test/api/claims/extract')).status,403);
 process.env.NODE_ENV='production';await assert.rejects(jsonBody(req()));process.env.NODE_ENV='development';
 const oldFetch=global.fetch;global.fetch=async()=>new Response(JSON.stringify({error:{message:'private'}}),{status:429,headers:{'Retry-After':'10'}});
 await assert.rejects(request('extract',{},new AbortController().signal,'test'),/Rate limit/);
 global.fetch=async()=>new Response('{}',{status:503});await assert.rejects(request('extract',{},new AbortController().signal,'test'),/unavailable/);
 global.fetch=async()=>{throw new TypeError('network')};await assert.rejects(request('extract',{},new AbortController().signal,'test'),/unreachable/);global.fetch=oldFetch;
 let storage={};let menuListener,messageListener;let opened=false;
 global.chrome={storage:{local:{get:async()=>structuredClone(storage),set:async v=>{storage=structuredClone(v)}}},runtime:{onInstalled:{addListener:()=>{}},onMessage:{addListener:fn=>{messageListener=fn}}},contextMenus:{onClicked:{addListener:fn=>{menuListener=fn}}},sidePanel:{open:()=>{opened=true;return Promise.resolve()}}};
 require('../extension/worker.ts');
 const send=m=>new Promise(resolve=>messageListener(m,{},resolve));
 menuListener({menuItemId:'investigate',selectionText:'first',pageUrl:'https://example.org/a'},{windowId:1,title:'A'});assert.equal(opened,true);
 const first=(await send({type:'read'})).captures[0];assert.equal(first.originalText,'first');
 first.editedText='draft in progress';await send({type:'put',capture:first});
 menuListener({menuItemId:'excerpt',selectionText:'second'},{windowId:1,title:'B'});
 const reopened=(await send({type:'read'})).captures;assert.equal(reopened.length,2);assert.equal(reopened[0].editedText,'draft in progress');assert.equal(reopened[1].originalText,'second');
 delete require.cache[require.resolve('../extension/worker.ts')];require('../extension/worker.ts');assert.equal((await send({type:'read'})).captures.length,2);
 await send({type:'delete',id:first.id});assert.equal((await send({type:'read'})).captures.length,1);
 console.log('Phase 3 tests passed: durable queue/restart, stale revisions, import validation, safe URLs, development access, API errors.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
