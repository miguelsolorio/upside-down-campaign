// localStorage can be blocked or throw (private windows, previews). Every access is wrapped.
export const storage = {
  get(key: string): string | null {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  set(key: string, value: string): void {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* storage blocked: settings just won't persist */ }
  },
  remove(key: string): void {
    try { globalThis.localStorage?.removeItem(key); } catch { /* storage blocked: nothing to remove */ }
  },
};
