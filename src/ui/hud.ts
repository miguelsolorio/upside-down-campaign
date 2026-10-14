// The top strip. 256 by 20 px, opaque. Left: the active hero. Middle: quarters and Inspiration. Right: the bench and the d20.
import type { HeroId, HudView, IconId, PartyHud } from '../core/types.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { labelOf, slotKeyLabel } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { drawBar, drawIcon, drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import { INSPIRATION_SECONDS } from '../progression/index.ts';
import { bulbCount, bulbDark, bulbFill, clamp01, isLowHp, pipCount } from './format.ts';
import { blinkOn, box, clipped, dither, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';
import { cycleHintX, slotRects } from './hudlayout.ts';
import type { SlotRect } from './hudlayout.ts';

const BULBS: IconId[] = ['bulbRed', 'bulbYellow', 'bulbGreen', 'bulbBlue'];
/** Text, bulbs and the XP line start here, right of the face and its shortcut key. */
const LEFT_X = 25;
const LEFT_W = 100;
const MID_X = 130;
/** The Inspiration bar's full width. Kept short so the bench can sit beside it. */
const INSPIRE_W = 28;
/** Shortcut keys are drawn in this low-contrast color, so the names stay what you read first. */
const KEY_COLOR = 'slate';
/** The row for a hero's key and name under a bench avatar. */
const TAG_Y = 11;
/** Where the name starts, past the 5 px key and a 2 px gap. */
const TAG_X = 7;
const METER_X = 246;
/** The strip is near black, so the lit die gets an orange outline instead of the usual ink one. */
const METER_LIT: DieScheme = { ...DIE_GOLD, edge: 'orange' };

/** What the play scene tells the strip beyond the party itself. Every field is optional. */
export interface HudOpts {
  /** A benched hero whose slot should pulse, for the puzzle hint. */
  focus?: HeroId;
  /** Heroes whose level-up effect is lit this frame: their level and portrait flash. */
  levelUp?: ReadonlySet<HeroId>;
  /** Frames since the last swap. The new active hero's portrait flashes while this is small. */
  swapAge?: number | null;
  /** Party index under the pointer, or -1, so that portrait can light up as a button. */
  hover?: number;
  /** Which swap keys to print. Keyboard is the default. */
  device?: 'keyboard' | 'gamepad';
}
/** How long the new active hero's portrait flashes after a swap, in frames. */
const SWAP_FLASH = 20;

function drawActive(ctx: Ctx, p: PartyHud, r: SlotRect, t: number, o: HudOpts): void {
  const low = isLowHp(p.hp, p.hpMax);
  const up = o.levelUp?.has(p.id) ?? false;
  const swapped = o.swapAge != null && o.swapAge < SWAP_FLASH && (settings.reduceFlashing || ((o.swapAge >> 2) & 1) === 0);
  outline(ctx, 1, 0, 16, 16, up || swapped ? 'yellow' : 'amber');
  clipped(ctx, 2, 1, 14, 14, () => drawPortrait(ctx, p.id, p.ko ? 'hurt' : low ? 'worried' : 'neutral', -3, -2));
  // The key that picks this hero sits just left of the name, quietly, like the ones on the bench.
  if (o.device !== 'gamepad') drawText(ctx, slotKeyLabel(r.n), LEFT_X - TAG_X, 1, KEY_COLOR);
  drawText(ctx, p.name, LEFT_X, 1, 'white');
  drawText(ctx, `LV${p.level}`, LEFT_X + p.name.length * 6 + 6, 1, up ? 'white' : 'yellow');

  // Level 12 Eleven is the longest name row, so the MP gem and bar sit at the right edge of the left panel.
  drawIcon(ctx, 'mpGem', 94, 0, t);
  outline(ctx, 103, 1, 22, 7, 'slate');
  drawBar(ctx, 104, 2, 20, 5, p.mpMax > 0 ? p.mp / p.mpMax : 0, 'blue', 'night');

  // One bulb per 10 HP. A damaged bulb is lit from the bottom up. Low HP makes the lit ones flicker.
  const n = bulbCount(p.hpMax);
  const pitch = Math.max(6, Math.min(8, Math.floor(LEFT_W / n)));
  for (let i = 0; i < n; i++) {
    const x = LEFT_X + i * pitch;
    const fill = bulbFill(p.hp, p.hpMax, i, n);
    const lit = BULBS[i % BULBS.length] as IconId;
    const dark = bulbDark(t, i, low, settings.reduceFlashing);
    if (fill >= 1 && !dark) { drawIcon(ctx, lit, x, 9, t); continue; }
    drawIcon(ctx, 'bulbOff', x, 9, t);
    if (fill > 0 && fill < 1 && !dark) {
      const rows = Math.max(1, Math.ceil(fill * 6));
      clipped(ctx, x, 17 - rows, 8, rows, () => drawIcon(ctx, lit, x, 9, t));
    }
  }

  const xp = p.xpNext > 0 ? clamp01(p.xp / p.xpNext) : 0;
  box(ctx, LEFT_X, 17, LEFT_W, 1, 'dusk');
  if (xp > 0) box(ctx, LEFT_X, 17, Math.max(1, Math.round(LEFT_W * xp)), 1, 'cyan');
}

function drawMiddle(ctx: Ctx, hud: HudView, t: number): void {
  drawIcon(ctx, 'quarter', MID_X, 1, t);
  drawText(ctx, `x${hud.quarters}`, MID_X + 10, 2, 'white');
  if (hud.inspiration <= 0) return;
  drawIcon(ctx, 'd20Glow', MID_X, 9, t);
  drawText(ctx, `${Math.ceil(hud.inspiration)}S`, MID_X + 10, 10, 'yellow');
  box(ctx, MID_X, 17, INSPIRE_W, 1, 'dusk');
  box(ctx, MID_X, 17, Math.max(1, Math.round(INSPIRE_W * clamp01(hud.inspiration / INSPIRATION_SECONDS))), 1, 'yellow');
}

/** A hero's three-letter tag. Three letters is what fits under an avatar, and it reads the same whoever is benched. */
const tagOf = (name: string): string => name.slice(0, 3).toUpperCase();

/** One benched hero: a small avatar, HP pips beside it, and under it the shortcut key (quiet) and the name tag.
 * The tag fills from dim to bright as the swap recharges, so it reads as ready when it is fully lit. */
function drawSlot(ctx: Ctx, p: PartyHud, r: SlotRect, t: number, ready: number, o: HudOpts): void {
  const x = r.px;
  const dead = p.ko;
  const hot = o.hover === r.index && !dead;
  const pulse = p.id === o.focus && blinkOn(t, 40, 28); // a puzzle hint names this hero
  const mark = pulse || (o.levelUp?.has(p.id) ?? false) ? 'yellow' : hot ? (ready >= 1 ? 'yellow' : 'cream') : null;
  if (mark) outline(ctx, x - 1, 0, r.w + 1, 19, mark);
  outline(ctx, x, 0, 11, 11, dead ? 'dusk' : 'slate');
  clipped(ctx, x + 1, 1, 9, 9, () => drawPortrait(ctx, p.id, dead ? 'hurt' : 'neutral', x - 7, -5));
  if (dead) dither(ctx, x + 1, 1, 9, 9, 'ink', 2);

  const ratio = p.hpMax > 0 ? p.hp / p.hpMax : 0;
  const lit = pipCount(p.hp, p.hpMax);
  const color = ratio > 0.5 ? 'leaf' : ratio > 0.25 ? 'yellow' : 'hot';
  for (let i = 0; i < 4; i++) box(ctx, x + 13, 9 - i * 3, 2, 2, i < lit ? color : dead ? 'blood0' : 'grey1');

  const keyed = o.device !== 'gamepad';
  if (keyed) drawText(ctx, slotKeyLabel(r.n), x, TAG_Y, dead ? 'dusk' : KEY_COLOR);
  const tag = tagOf(p.name);
  const tx = x + (keyed ? TAG_X : 0);
  if (dead) { drawText(ctx, tag, tx, TAG_Y, 'dusk'); return; }
  if (ready >= 1) { drawText(ctx, tag, tx, TAG_Y, hot ? 'yellow' : 'bone'); return; }
  drawText(ctx, tag, tx, TAG_Y, 'slate');
  clipped(ctx, tx, TAG_Y, Math.round(tag.length * 6 * ready), 7, () => drawText(ctx, tag, tx, TAG_Y, 'bone'));
}

/** The swap-back and swap-next keys, one on each side of the bench, so cycling reads at a glance. Only when the bench is short enough to leave room. */
function drawCycleHints(ctx: Ctx, benchCount: number, ready: number, o: HudOpts): void {
  const at = cycleHintX(benchCount);
  if (!at) return;
  const pad = o.device === 'gamepad';
  const prev = pad ? 'LB' : labelOf('swapPrev');
  const next = pad ? 'RB' : labelOf('swapNext');
  const color = ready >= 1 ? 'mist' : KEY_COLOR;
  if (prev.length <= 2) drawText(ctx, prev, at.prev, 5, color, { align: 'right' });
  if (next.length <= 2) drawText(ctx, next, at.next, 5, color);
}

/** The party meter: a d20 that fills with light from the bottom and glows gold, with sparks, once the burst is ready. */
function drawMeter(ctx: Ctx, hud: HudView, t: number): void {
  if (!hud.burstReady) {
    drawDie(ctx, METER_X, 9, 8, { scheme: DIE_DIM, lit: hud.burst, litScheme: METER_LIT });
    return;
  }
  drawDie(ctx, METER_X, 9, 8, { scheme: METER_LIT });
  if (settings.reduceFlashing) return;
  const s = (t >> 3) & 3;
  const hot = s === 1 ? 'white' : 'yellow';
  for (const [dx, dy] of [[-9, -6], [9, -6], [-9, 6], [9, 6]] as [number, number][]) {
    if (((dx + dy + s) & 1) === 0) box(ctx, METER_X + dx, 9 + dy, 1, 1, hot);
  }
}

function drawBoss(ctx: Ctx, boss: NonNullable<HudView['boss']>): void {
  const w = 176, x = (SCREEN_W - w) / 2, y = VIEW_TOP + 2;
  outline(ctx, x - 1, y - 1, w + 2, 11, 'ink');
  drawBar(ctx, x, y, w, 9, boss.hpMax > 0 ? boss.hp / boss.hpMax : 0, 'red', 'blood0');
  drawText(ctx, boss.name, SCREEN_W / 2, y + 1, 'white', { align: 'center', shadow: true });
}

/** Top strip (VIEW_TOP px tall): active hero bulbs, MP, XP, bench faces, d20 burst meter, quarters, boss bar.
 * Every portrait shows the key that picks it, and the bench shows how far the swap has recharged. The same
 * rectangles (`slotRects`) answer clicks, so a portrait is a button. */
export function drawHud(ctx: CanvasRenderingContext2D, hud: HudView, t: number, o: HudOpts = {}): void {
  drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
  const rects = slotRects(hud.party);
  for (const r of rects) {
    const p = hud.party[r.index];
    if (!p) continue;
    if (r.active) drawActive(ctx, p, r, t, o);
    else drawSlot(ctx, p, r, t, hud.swapReady, o);
  }
  drawCycleHints(ctx, rects.filter((r) => !r.active).length, hud.swapReady, o);
  drawMiddle(ctx, hud, t);
  drawMeter(ctx, hud, t);
  if (hud.boss) drawBoss(ctx, hud.boss);
}
