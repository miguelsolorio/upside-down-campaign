import { flags } from './flags.ts';
import { storage } from './storage.ts';
import type { Difficulty } from './types.ts';

export interface Settings {
  musicVol: number;
  sfxVol: number;
  scanlines: boolean;
  /** 0 = no shake, 1 = full. */
  shake: number;
  reduceFlashing: boolean;
  /** Skips every dialogue box, the prologue and the chapter card. Tab on the title screen flips it. */
  skipDialogue: boolean;
  difficulty: Difficulty;
}

const KEY = 'upside-down:settings:v1';

export const settings: Settings = {
  musicVol: 0.7,
  sfxVol: 0.8,
  scanlines: true,
  shake: 1,
  reduceFlashing: false,
  skipDialogue: false,
  difficulty: 'chief',
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
}

export function saveSettings(): void {
  storage.set(KEY, JSON.stringify(settings));
}

/** Pushes settings into the page (scanline overlay). Call after any change. */
export function applySettings(): void {
  document.body.classList.toggle('scan', settings.scanlines);
}
