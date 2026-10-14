// A plain vertical menu, and the five settings rows the title and the pause screen share.
import type { Game } from '../core/scene.ts';
import { applySettings, saveSettings } from '../core/settings.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawText } from '../gfx/index.ts';
import { cycleShake, shakeLabel, stepVolume, volSegments } from './format.ts';
import { createControlsScene } from './controls.ts';
import { segments } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface MenuItem {
  label: string;
  /** Right-aligned text. */
  value?(): string;
  /** 0..1, drawn as ten segments. */
  level?(): number;
  /** Left and right. */
  adjust?(dir: -1 | 1): void;
  /** Confirm. */
  activate?(): void;
}
export interface Menu { items: MenuItem[]; sel: number }

export function updateMenu(m: Menu, g: Game): void {
  const n = m.items.length;
  if (n === 0) return;
  const i = g.input;
  if (i.pressed('up')) { m.sel = (m.sel + n - 1) % n; audio.sfx('select'); }
  if (i.pressed('down')) { m.sel = (m.sel + 1) % n; audio.sfx('select'); }
  const it = m.items[m.sel] as MenuItem;
  if (i.pressed('left')) it.adjust?.(-1);
  if (i.pressed('right')) it.adjust?.(1);
  if (i.pressed('confirm') && it.activate) { audio.sfx('confirm'); it.activate(); }
}

export function drawMenu(ctx: Ctx, m: Menu, x: number, y: number, w: number, t: number, rowH = 11): void {
  m.items.forEach((it, i) => {
    const ry = y + i * rowH;
    const on = i === m.sel;
    if (on) drawIcon(ctx, 'cursor', x, ry - 1, t);
    drawText(ctx, it.label, x + 10, ry, on ? 'yellow' : 'bone');
    if (it.level) segments(ctx, x + w - 49, ry + 1, volSegments(it.level()), on ? 'leaf' : 'pine3');
    else if (it.value) drawText(ctx, it.value(), x + w, ry, on ? 'white' : 'mist', { align: 'right' });
  });
}

/** Flips "skip story" and saves it. The title screen calls this on the skip key. */
export function toggleSkipStory(g: Game): void {
  g.settings.skipDialogue = !g.settings.skipDialogue;
  saveSettings();
  audio.sfx('select');
}

/** Music, sfx, scanlines, shake, reduce flashing and skip story. Every change is saved, applied and pushed to the mixer. */
export function settingItems(g: Game): MenuItem[] {
  const s = g.settings;
  const commit = (): void => {
    saveSettings();
    applySettings();
    audio.setVolumes(s.musicVol, s.sfxVol);
    audio.sfx('select');
  };
  const volume = (key: 'musicVol' | 'sfxVol') => (dir: -1 | 1): void => {
    const next = stepVolume(s[key], dir);
    if (next === s[key]) return;
    s[key] = next;
    commit();
  };
  const flip = (key: 'scanlines' | 'reduceFlashing') => (): void => { s[key] = !s[key]; commit(); };
  const shake = (dir: -1 | 1): void => { s.shake = cycleShake(s.shake, dir); commit(); };
  const onOff = (v: boolean): string => (v ? 'ON' : 'OFF');
  return [
    { label: 'MUSIC', level: () => s.musicVol, adjust: volume('musicVol') },
    { label: 'SFX', level: () => s.sfxVol, adjust: volume('sfxVol') },
    { label: 'SCANLINES', value: () => onOff(s.scanlines), adjust: flip('scanlines'), activate: flip('scanlines') },
    { label: 'SHAKE', value: () => shakeLabel(s.shake), adjust: shake, activate: () => shake(1) },
    { label: 'REDUCE FLASH', value: () => onOff(s.reduceFlashing), adjust: flip('reduceFlashing'), activate: flip('reduceFlashing') },
    { label: 'SKIP STORY', value: () => onOff(s.skipDialogue), adjust: () => toggleSkipStory(g), activate: () => toggleSkipStory(g) },
    { label: 'CONTROLS', value: () => 'EDIT', activate: () => g.scenes.push(createControlsScene({ onBack: () => g.scenes.pop() })) },
  ];
}
