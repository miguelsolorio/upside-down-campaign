import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHELL_PREFS, cycleShell, loadSettings, saveSettings, settings } from '../src/core/settings.ts';
import { DARK, LIGHT, alpha, shellTheme } from '../src/ui/touchtheme.ts';
import type { ShellTheme } from '../src/ui/touchtheme.ts';
import { SHELLS } from '../src/ui/var/shells.ts';

const COLOR = /^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, (0|1|0?\.\d+)\))$/i;
const THEMES: ShellTheme[] = [LIGHT, DARK, ...SHELLS.map((s) => s.theme)];

test('touch shell: every theme fills every colour with a colour the canvas reads', () => {
  for (const t of THEMES) {
    for (const [k, v] of Object.entries(t)) {
      if (k === 'name' || k === 'bare' || k === 'keys' || k === 'decor') continue;
      if (k === 'logoGlow' && v === null) continue;
      if (k === 'die') {
        for (const [f, c] of Object.entries(v as object)) assert.match(c as string, COLOR, `${t.name}.die.${f}`);
        continue;
      }
      assert.match(v as string, COLOR, `${t.name}.${k}`);
    }
  }
  assert.equal(new Set(THEMES.map((t) => t.name)).size, THEMES.length - 1, 'names are unique, and design 1 is DARK itself');
});

test('touch shell: AUTO follows the phone, LIGHT and DARK force a shell', () => {
  assert.equal(shellTheme('auto', false), LIGHT);
  assert.equal(shellTheme('auto', true), DARK);
  assert.equal(shellTheme('light', true), LIGHT);
  assert.equal(shellTheme('dark', false), DARK);
  assert.equal(SHELLS[0]?.theme, DARK, 'the picked design is the one that ships');
});

test('touch shell: the option cycles both ways and wraps', () => {
  assert.deepEqual(SHELL_PREFS.map((p) => cycleShell(p, 1)), ['light', 'dark', 'auto']);
  assert.deepEqual(SHELL_PREFS.map((p) => cycleShell(p, -1)), ['dark', 'auto', 'light']);
});

test('touch shell: alpha turns a hex colour see-through', () => {
  assert.equal(alpha('#b3b0ab', 0), 'rgba(179, 176, 171, 0)');
});

test('touch shell: the choice is saved, and a bad saved value falls back to AUTO', () => {
  const store = new Map<string, string>();
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    assert.equal(settings.shell, 'auto', 'AUTO by default');
    settings.shell = 'dark';
    saveSettings();
    settings.shell = 'auto';
    loadSettings();
    assert.equal(settings.shell, 'dark');
    const [key, raw] = [...store.entries()][0] as [string, string];
    store.set(key, JSON.stringify({ ...JSON.parse(raw), shell: 'purple' }));
    loadSettings();
    assert.equal(settings.shell, 'auto');
  } finally {
    settings.shell = 'auto';
    if (was) Object.defineProperty(globalThis, 'localStorage', was);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
