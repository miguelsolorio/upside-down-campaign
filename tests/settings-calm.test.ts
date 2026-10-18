// A phone or computer set to reduce motion starts the game calm (REDUCE FLASH on, SHAKE off) when nothing is saved, and never
// overrides what the player saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(globalThis, { addEventListener: () => {} });
(globalThis as unknown as { document: unknown }).document = { body: { classList: { toggle: () => {} } } };
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
  configurable: true,
});
const media = (reduce: boolean): void => {
  Object.defineProperty(globalThis, 'matchMedia', { value: (q: string) => ({ matches: reduce && q.includes('prefers-reduced-motion') }), configurable: true });
};
const { loadSettings, settings } = await import('../src/core/settings.ts');

const reset = (): void => { settings.reduceFlashing = false; settings.shake = 1; store.clear(); };

test('calm from the system: reduce motion with nothing saved turns REDUCE FLASH on and SHAKE off', () => {
  reset(); media(true);
  loadSettings();
  assert.equal(settings.reduceFlashing, true);
  assert.equal(settings.shake, 0);
});

test('calm from the system: no preference, or no matchMedia at all, leaves the defaults alone', () => {
  reset(); media(false);
  loadSettings();
  assert.equal(settings.reduceFlashing, false);
  assert.equal(settings.shake, 1);
  reset();
  Object.defineProperty(globalThis, 'matchMedia', { value: undefined, configurable: true });
  loadSettings();
  assert.equal(settings.reduceFlashing, false);
  assert.equal(settings.shake, 1);
});

test('calm from the system: a saved setting wins, so turning the flashes back up sticks', () => {
  reset(); media(true);
  store.set('upside-down:settings:v1', JSON.stringify({ reduceFlashing: false, shake: 1, rev: 2 }));
  loadSettings();
  assert.equal(settings.reduceFlashing, false);
  assert.equal(settings.shake, 1);
});
