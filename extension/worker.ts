import { capture, type Capture } from '../lib/notebook';
let queue = Promise.resolve();
function serial<T>(fn: () => Promise<T>) { const next = queue.then(fn); queue = next.then(() => {}, () => {}); return next; }
async function read(): Promise<Capture[]> { return (await chrome.storage.local.get('captures')).captures as Capture[] ?? []; }
chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus.removeAll().then(() => {
    chrome.contextMenus.create({ id: 'investigate', title: 'Investigate with Tabayyun', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'excerpt', title: 'Save research excerpt', contexts: ['selection'] });
  });
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Invoke immediately in the gesture stack, independently of the durable write.
  if (tab) void chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  const c = capture(info.selectionText ?? '', (tab?.title ?? '').slice(0,1000), info.pageUrl ?? tab?.url ?? '');
  void serial(async () => { const captures = await read(); captures.push(c); await chrome.storage.local.set({ captures }); }).catch(() => {});
});
chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  void serial(async () => {
    let captures = await read();
    if (m.type === 'put' && m.capture) { const i = captures.findIndex(c => c.id === m.capture!.id); if (i < 0) captures.push(m.capture); else captures[i] = m.capture; }
    if (m.type === 'delete') captures = captures.filter(c => c.id !== m.id);
    if (m.type !== 'read') await chrome.storage.local.set({ captures });
    reply({ captures });
  }).catch(() => reply({ error: 'Device storage unavailable. Your changes were not saved.' }));
  return true;
});
