declare const chrome: {
  runtime: { onInstalled: { addListener(fn: () => void): void }; onMessage: { addListener(fn: (message: { type: string; capture?: import('../lib/notebook').Capture; id?: string }, sender: unknown, reply: (v: unknown) => void) => boolean): void }; sendMessage(message: unknown): Promise<{ captures: import('../lib/notebook').Capture[]; error?: string }> };
  storage: { local: { get(key: string): Promise<Record<string, unknown>>; set(data: Record<string, unknown>): Promise<void> }; onChanged: { addListener(fn: () => void): void; removeListener(fn: () => void): void } };
  contextMenus: { create(options: unknown): void; removeAll(): Promise<void>; onClicked: { addListener(fn: (info: { menuItemId: string | number; selectionText?: string; pageUrl?: string }, tab?: { id?: number; windowId: number; title?: string; url?: string }) => void): void } };
  sidePanel: { open(options: { windowId: number }): Promise<void>; setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void> };
};
