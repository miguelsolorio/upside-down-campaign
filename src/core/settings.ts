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

/** The two the options offer: NORMAL and HARD. HARD is chief, the balance every stage was measured at. */
export const PLAYER_DIFFICULTIES: readonly Difficulty[] = ['normal', 'chief'];

/** The options row cycles NORMAL, HARD. */
export function cycleDifficulty(v: Difficulty, dir: -1 | 1): Difficulty {
  const n = PLAYER_DIFFICULTIES.length;
  return PLAYER_DIFFICULTIES[(Math.max(0, PLAYER_DIFFICULTIES.indexOf(v)) + dir + n) % n] as Difficulty;
}

export function difficultyLabel(d: Difficulty): string {
  return d === 'chief' ? 'HARD' : d === 'normal' ? 'NORMAL' : d.toUpperCase();
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
  /** Enemy HP and damage (DIFFICULTY_MULT). The options offer NORMAL and HARD. A change applies at once, mid-stage too. */
  difficulty: Difficulty;
  shell: ShellPref;
  /** Short pulses through a controller's motors on a hit, a KO, a level-up and a boss slam. Only matters with a controller. */
  rumble: boolean;
}

const KEY = 'upside-down:settings:v1';
/**
 * Bumped when a saved field changes meaning, and saved with the settings. 2: difficulty became a choice. Before it, every
 * save held chief, which nobody picked, so a save without a rev reads it as normal, once.
 */
const REV = 2;

export const settings: Settings = {
  musicVol: 0.7,
  sfxVol: 0.8,
  scanlines: true,
  shake: 1,
  reduceFlashing: false,
  skipDialogue: true,
  difficulty: 'normal',
  shell: 'auto',
  rumble: true,
};

/** True when the story should be skipped: the saved setting, or ?rush=1 for this page load only. */
export function skipsDialogue(): boolean {
  return settings.skipDialogue || flags.rush;
}

export function loadSettings(): void {
  const raw = storage.get(KEY);
  if (!raw) return;
  let rev = REV;
  try {
    const { rev: was = 1, ...saved } = JSON.parse(raw) as Partial<Settings> & { rev?: number };
    rev = was;
    if (rev < 2 && saved.difficulty === 'chief') saved.difficulty = 'normal';
    Object.assign(settings, saved);
  } catch { /* corrupt save: keep defaults */ }
  if (!SHELL_PREFS.includes(settings.shell)) settings.shell = 'auto';
  if (!PLAYER_DIFFICULTIES.includes(settings.difficulty)) settings.difficulty = 'normal';
  if (typeof settings.rumble !== 'boolean') settings.rumble = true;
  if (rev < REV) saveSettings();
}

export function saveSettings(): void {
  storage.set(KEY, JSON.stringify({ ...settings, rev: REV }));
}

/** Pushes settings into the page (scanline overlay). Call after any change. */
export function applySettings(): void {
  document.body.classList.toggle('scan', settings.scanlines);
}
