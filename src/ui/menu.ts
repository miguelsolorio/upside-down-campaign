// A plain vertical menu, and the five settings rows the title and the pause screen share.
// The keys move the selection and the mouse can too: a row takes it when the mouse moves onto it, and a click picks it.
import type { Game } from '../core/scene.ts';
import type { InputState } from '../core/input.ts';
import { applySettings, saveSettings } from '../core/settings.ts';
import { hitIndex, inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawText } from '../gfx/index.ts';
import { clickSegments, cycleShake, shakeLabel, stepVolume, volSegments } from './format.ts';
import { createControlsScene } from './controls.ts';
import { segments } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface MenuItem {
  label: string;
  /** Right-aligned text. */
  value?(): string;
  /** 0..1, drawn as ten segments. */
  level?(): number;
  /** Sets a level row straight to a value, for a click on its bar. */
  set?(level: number): void;
  /** Left and right. */
  adjust?(dir: -1 | 1): void;
  /** Confirm. */
  activate?(): void;
}
/** Where a row was last drawn, for the mouse: the whole row, and the bar of a level row. */
export interface RowBox extends Rect { bar?: Rect }
export interface Menu {
  items: MenuItem[];
  sel: number;
  /** Filled in by whoever draws the menu. Empty until the first draw, so nothing is under the mouse before then. */
  boxes?: RowBox[];
  /** Runs whenever the selection moves, by key or by mouse, so a row waiting on a second press can let go. */
  onMove?(): void;
}

/** Each segment of a level bar is 4 px and a 1 px gap. */
const SEG = 5;
const BAR_W = 10 * SEG - 1;

function select(m: Menu, idx: number, sound = true): void {
  if (idx === m.sel) return;
  m.sel = idx;
  if (sound) audio.sfx('select');
  m.onMove?.();
}

/** True when a click at p on this row would do something: anything with a confirm, or the bar of a level row. */
function clickable(it: MenuItem, b: RowBox, p: { x: number; y: number }): boolean {
  if (it.set && b.bar) return inRect(p, b.bar);
  return !!it.activate;
}

/** The mouse's share of a menu tick. A click on a level bar sets it to that segment, and on the top lit one turns it down one. */
function mouseMenu(m: Menu, i: InputState): void {
  const boxes = m.boxes ?? [];
  const p = i.hover();
  const over = hitIndex(boxes, p);
  if (p && over >= 0) {
    if (i.moved()) select(m, over);
    if (clickable(m.items[over] as MenuItem, boxes[over] as RowBox, p)) i.point();
  }
  const c = i.clicked();
  const at = hitIndex(boxes, c);
  if (!c || at < 0) return;
  select(m, at, false);
  const it = m.items[at] as MenuItem;
  const bar = (boxes[at] as RowBox).bar;
  if (it.set && it.level && bar) {
    if (inRect(c, bar)) it.set(clickSegments(volSegments(it.level()), Math.floor((c.x - bar.x) / SEG)) / 10);
    return;
  }
  if (it.activate) { audio.sfx('confirm'); it.activate(); }
}

export function updateMenu(m: Menu, g: Game): void {
  const n = m.items.length;
  if (n === 0) return;
  const i = g.input;
  if (i.pressed('up')) select(m, (m.sel + n - 1) % n);
  if (i.pressed('down')) select(m, (m.sel + 1) % n);
  mouseMenu(m, i);
  const it = m.items[m.sel] as MenuItem;
  if (i.pressed('left')) it.adjust?.(-1);
  if (i.pressed('right')) it.adjust?.(1);
  if (i.pressed('confirm') && it.activate) { audio.sfx('confirm'); it.activate(); }
}

export function drawMenu(ctx: Ctx, m: Menu, x: number, y: number, w: number, t: number, rowH = 11): void {
  // Rows meet with no gap, so the mouse is always over one of them. The 7 px text sits in the middle of its row.
  const pad = (rowH - 7) >> 1;
  m.boxes = m.items.map((it, i): RowBox => {
    const top = y + i * rowH - pad;
    const row: RowBox = { x: x - 2, y: top, w: w + 4, h: rowH };
    if (it.level) row.bar = { x: x + w - BAR_W, y: top, w: BAR_W, h: rowH };
    return row;
  });
  m.items.forEach((it, i) => {
    const ry = y + i * rowH;
    const on = i === m.sel;
    if (on) drawIcon(ctx, 'cursor', x, ry - 1, t);
    drawText(ctx, it.label, x + 10, ry, on ? 'yellow' : 'bone');
    if (it.level) segments(ctx, x + w - BAR_W, ry + 1, volSegments(it.level()), on ? 'leaf' : 'pine3');
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
  const setVolume = (key: 'musicVol' | 'sfxVol') => (v: number): void => {
    if (v === s[key]) return;
    s[key] = v;
    commit();
  };
  const volume = (key: 'musicVol' | 'sfxVol') => (dir: -1 | 1): void => setVolume(key)(stepVolume(s[key], dir));
  const flip = (key: 'scanlines' | 'reduceFlashing') => (): void => { s[key] = !s[key]; commit(); };
  const shake = (dir: -1 | 1): void => { s.shake = cycleShake(s.shake, dir); commit(); };
  const onOff = (v: boolean): string => (v ? 'ON' : 'OFF');
  return [
    { label: 'MUSIC', level: () => s.musicVol, set: setVolume('musicVol'), adjust: volume('musicVol') },
    { label: 'SFX', level: () => s.sfxVol, set: setVolume('sfxVol'), adjust: volume('sfxVol') },
    { label: 'SCANLINES', value: () => onOff(s.scanlines), adjust: flip('scanlines'), activate: flip('scanlines') },
    { label: 'SHAKE', value: () => shakeLabel(s.shake), adjust: shake, activate: () => shake(1) },
    { label: 'REDUCE FLASH', value: () => onOff(s.reduceFlashing), adjust: flip('reduceFlashing'), activate: flip('reduceFlashing') },
    { label: 'SKIP STORY', value: () => onOff(s.skipDialogue), adjust: () => toggleSkipStory(g), activate: () => toggleSkipStory(g) },
    // Key rebinding means nothing on a touch screen.
    ...(g.input.device() === 'touch' ? [] : [
      { label: 'CONTROLS', value: () => 'EDIT', activate: () => g.scenes.push(createControlsScene({ onBack: () => g.scenes.pop() })) },
    ]),
  ];
}
