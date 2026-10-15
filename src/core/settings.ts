import { flags } from './flags.ts';
import { storage } from './storage.ts';
import type { Difficulty } from './types.ts';

/** Which Game Boy the touch screen wears: the one matching the phone's light or dark setting, or always one. */
export type ShellPref = 'auto' | 'light' | 'dark';
export const SHELL_PREFS: readonly ShellPref[] = ['auto', 'light', 'dark'];

/** The options row cycles AUTO, LIGHT, DARK. */
export function cycleShell(v: ShellPref, dir: -1 | 1): ShellPref {
  const n = SHELL_PREFS.length;
  return SHELL_PREFS[(Math.max(0, SHELL_PREFS.indexOf(v)) + dir + n) % n] as ShellPref;
}

export interface Settings {
  musicVol: number;
  sfxVol: number;
  scanlines: boolean;
  /** 0 = no shake, 1 = full. */
  shake: number;
  reduceFlashing: boolean;
  /** Skips every dialogue box, the prologue and the chapter card. On by default. The skip key (T) on the title screen flips it. */
  skipDialogue: boolean;
  difficulty: Difficulty;
  shell: ShellPref;
}

const KEY = 'upside-down:settings:v1';

export const settings: Settings = {
  musicVol: 0.7,
  sfxVol: 0.8,
  scanlines: true,
  shake: 1,
  reduceFlashing: false,
  skipDialogue: true,
  difficulty: 'chief',
  shell: 'auto',
};

/** True when the story should be skipped: the saved setting, or ?rush=1 for this page load only. */
export function skipsDialogue(): boolean {
  return settings.skipDialogue || flags.rush;
}

export function loadSettings(): void {
  const raw = storage.get(KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<Settings>;
    Object.assign(settings, saved);
  } catch { /* corrupt save: keep defaults */ }
  if (!SHELL_PREFS.includes(settings.shell)) settings.shell = 'auto';
}

export function saveSettings(): void {
  storage.set(KEY, JSON.stringify(settings));
}

/** Pushes settings into the page (scanline overlay). Call after any change. */
export function applySettings(): void {
  document.body.classList.toggle('scan', settings.scanlines);
}
