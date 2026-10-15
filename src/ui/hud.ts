// The top strip. Opaque, VIEW_TOP tall and as wide as the screen. Left: the active hero. Middle: quarters and Inspiration.
// Right: the Crit meter and the bench. On a wide screen the contents sit inside the clear band with room around them.
// HP is a segmented bar under the active hero's name, with the XP notches under it. A bench slot is just the key and the
// face: every hero's health is also the bar over their head in the world. The strip is quiet, with no frames.
// MP is one blue segment per cast.
import type { HeroId, HudView, PartyHud } from '../core/types.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { slotKeyLabel } from '../core/bindings.ts';
import type { PromptDevice } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { drawBar, drawIcon, drawPanel, drawPortrait, drawText, drawTinyText, tinyWidth, TINY_H } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { INSPIRATION_SECONDS } from '../progression/index.ts';
import { XP_NOTCHES, bulbCount, bulbFill, clamp01, hpBarColor, isLowHp, mpBar, notchFill, notchSpans } from './format.ts';
import { blinkOn, box, clipped, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';
import { LEFT_W, LEFT_X, METER_LABEL_X, METER_X, MIDDLE_X, MP_BAR_W, MP_BAR_X, MP_LABEL_X, hudBand, leftShift, rightShift, slotRects } from './hudlayout.ts';
import type { SlotRect } from './hudlayout.ts';

/** The Inspiration bar's full width. Kept short so the bench can sit beside it. */
const INSPIRE_W = 28;
/** Shortcut keys are drawn in this low-contrast color, so the names stay what you read first. */
const KEY_COLOR = 'slate';
/** The active hero's shortcut key sits this far left of the name. */
const ACTIVE_KEY_X = LEFT_X - 7;
/** On a bench slot the face sits a little below the top, so the slot is centered in the strip like the active portrait.
 * The key is 2 px in from the slot's left edge. */
const FACE_Y = 2;
const KEY_DX = 2;
/** The Crit meter: a d20 of this radius, 8.7 px wide and 10 tall, centered this far down (level with the bench faces),
 * with the label to its right, centered on the die's height. */
const METER_R = 5;
const METER_CY = 7;
const METER_LABEL = 'CRIT';
const METER_LABEL_Y = 5;
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
  /** Which swap keys to print. Keyboard is the default, and only a keyboard has them. */
  device?: PromptDevice;
}
/** How long the new active hero's portrait flashes after a swap, in frames. */
const SWAP_FLASH = 20;

/** One color for the whole bar, so the HP over the heroes in the world and in the strip read the same, blink included. */
function barColor(p: PartyHud, t: number): ColorName {
  return hpBarColor(p.hp, p.hpMax, t, settings.reduceFlashing);
}

function drawActive(ctx: Ctx, p: PartyHud, r: SlotRect, t: number, o: HudOpts): void {
  const low = isLowHp(p.hp, p.hpMax);
  const up = o.levelUp?.has(p.id) ?? false;
  const swapped = o.swapAge != null && o.swapAge < SWAP_FLASH && (settings.reduceFlashing || ((o.swapAge >> 2) & 1) === 0);
  outline(ctx, 1, 0, 16, 16, up || swapped ? 'yellow' : 'amber');
  clipped(ctx, 2, 1, 14, 14, () => drawPortrait(ctx, p.id, p.ko ? 'hurt' : low ? 'worried' : 'neutral', -3, -2));
  // The key that picks this hero sits just left of the name, quietly, like the ones on the bench.
  if ((o.device ?? 'keyboard') === 'keyboard') drawText(ctx, slotKeyLabel(r.n), ACTIVE_KEY_X, 1, KEY_COLOR);
  drawText(ctx, p.name, LEFT_X, 1, 'white');
  drawText(ctx, `LV${p.level}`, LEFT_X + p.name.length * 6 + 6, 1, up ? 'white' : 'yellow');

  // MP is one segment per cast of the special. A bright segment holds a whole cast and can be used now, a dim one is still
  // charging. A hero with more casts than the bar has room for gets one bar with a tick at every cast.
  drawTinyText(ctx, 'MP', MP_LABEL_X, 2, 'mist');
  const mp = mpBar(MP_BAR_W, p.mp, p.mpMax, p.mpCost);
  for (const c of mp.cells) drawBar(ctx, MP_BAR_X + c.x, 2, c.w, 5, c.fill, c.ready ? 'blue' : 'slate', 'shadow');
  for (const x of mp.ticks) box(ctx, MP_BAR_X + x, 2, 1, 5, 'ink');

  // One segment per 10 HP, 7 px of bar and a 1 px tick. The color is health: green above half, then yellow, then a red that blinks.
  const n = bulbCount(p.hpMax);
  const pitch = Math.max(6, Math.min(8, Math.floor(LEFT_W / n)));
  const color = barColor(p, t);
  // No frame, so the empty part of each segment is a shade lighter than the strip to keep the bar's length readable.
  box(ctx, LEFT_X, 10, n * pitch - 1, 5, 'ink');
  for (let i = 0; i < n; i++) drawBar(ctx, LEFT_X + i * pitch, 10, pitch - 1, 5, bulbFill(p.hp, p.hpMax, i, n), color, p.ko ? 'night' : 'shadow');

  // XP is ten yellow notches under HP, as wide as the HP bar. Yellow like the level. An empty notch is a step lighter than an
  // empty HP segment, because at 2 px tall it would not read otherwise.
  const xp = p.xpNext > 0 ? clamp01(p.xp / p.xpNext) : 0;
  const notches = notchSpans(n * pitch - 1, XP_NOTCHES);
  notches.forEach((s, i) => drawBar(ctx, LEFT_X + s.x, 16, s.w, 2, notchFill(xp, i, notches.length), 'yellow', 'dusk'));
}

function drawMiddle(ctx: Ctx, hud: HudView, t: number): void {
  drawIcon(ctx, 'quarter', MIDDLE_X, 1, t);
  drawText(ctx, `x${hud.quarters}`, MIDDLE_X + 9, 1, 'white');
  if (hud.inspiration <= 0) return;
  drawIcon(ctx, 'd20Glow', MIDDLE_X, 9, t);
  drawText(ctx, `${Math.ceil(hud.inspiration)}S`, MIDDLE_X + 10, 10, 'yellow');
  box(ctx, MIDDLE_X, 17, INSPIRE_W, 1, 'dusk');
  box(ctx, MIDDLE_X, 17, Math.max(1, Math.round(INSPIRE_W * clamp01(hud.inspiration / INSPIRATION_SECONDS))), 1, 'yellow');
}

/** One benched hero: the shortcut key and a small face, left to right.
 * The key fills from the bottom as the swap recharges, so it reads as ready once it is fully lit. */
function drawSlot(ctx: Ctx, p: PartyHud, r: SlotRect, t: number, ready: number, o: HudOpts): void {
  const x = r.px, y = FACE_Y;
  const dead = p.ko;
  const hot = o.hover === r.index && !dead;
  const pulse = p.id === o.focus && blinkOn(t, 40, 28); // a puzzle hint names this hero
  const mark = pulse || (o.levelUp?.has(p.id) ?? false) ? 'yellow' : hot ? (ready >= 1 ? 'yellow' : 'cream') : null;
  if (mark) outline(ctx, r.x, 0, r.w - 1, 15, mark);
  outline(ctx, x, y, 11, 11, dead ? 'dusk' : 'slate');
  // A hero who is down keeps the neutral face, in greys.
  clipped(ctx, x + 1, y + 1, 9, 9, () => drawPortrait(ctx, p.id, 'neutral', x - 7, y - 5, dead));

  if ((o.device ?? 'keyboard') !== 'keyboard') return;
  const key = slotKeyLabel(r.n);
  const kx = r.x + KEY_DX, ky = y + 3;
  if (dead) { drawTinyText(ctx, key, kx, ky, 'dusk'); return; }
  if (ready >= 1) { drawTinyText(ctx, key, kx, ky, hot ? 'yellow' : 'mist'); return; }
  drawTinyText(ctx, key, kx, ky, KEY_COLOR);
  const rows = Math.round(TINY_H * ready);
  if (rows > 0) clipped(ctx, kx, ky + TINY_H - rows, tinyWidth(key), rows, () => drawTinyText(ctx, key, kx, ky, 'mist'));
}

/** The party meter: a small d20 that fills with light from the bottom and glows gold, with sparks, once the burst is ready,
 * and a CRIT label to its right that lights up with it. */
function drawMeter(ctx: Ctx, hud: HudView, t: number, mx: number): void {
  drawTinyText(ctx, METER_LABEL, mx + METER_LABEL_X - METER_X, METER_LABEL_Y, hud.burstReady ? 'yellow' : 'mist');
  if (!hud.burstReady) {
    drawDie(ctx, mx, METER_CY, METER_R, { scheme: DIE_DIM, lit: hud.burst, litScheme: METER_LIT });
    return;
  }
  drawDie(ctx, mx, METER_CY, METER_R, { scheme: METER_LIT });
  if (settings.reduceFlashing) return;
  const s = (t >> 3) & 3;
  const hot = s === 1 ? 'white' : 'yellow';
  for (const [dx, dy] of [[-6, -5], [6, -5], [-6, 5], [6, 5]] as [number, number][]) {
    if (((dx + dy + s) & 1) === 0) box(ctx, mx + dx, METER_CY + dy, 1, 1, hot);
  }
}

const BAR_W = 176;

function drawBoss(ctx: Ctx, boss: NonNullable<HudView['boss']>): void {
  const w = BAR_W, x = (SCREEN_W - w) / 2, y = VIEW_TOP + 2;
  outline(ctx, x - 1, y - 1, w + 2, 11, 'ink');
  drawBar(ctx, x, y, w, 9, boss.hpMax > 0 ? boss.hp / boss.hpMax : 0, 'red', 'blood0');
  drawText(ctx, boss.name, SCREEN_W / 2, y + 1, 'white', { align: 'center', shadow: true });
}

/** The defense (docs/level-6.md): the ward's bar where the boss bar goes, in the same style and as still. Her name on the left,
 * the seconds left on the right. Under the boss bar if both are up, which the level doesn't ask for. */
function drawWard(ctx: Ctx, ward: NonNullable<HudView['ward']>, below: boolean): void {
  const w = BAR_W, x = (SCREEN_W - w) / 2, y = VIEW_TOP + 2 + (below ? 12 : 0);
  outline(ctx, x - 1, y - 1, w + 2, 11, 'ink');
  drawBar(ctx, x, y, w, 9, ward.hpMax > 0 ? ward.hp / ward.hpMax : 0, 'red', 'blood0');
  drawText(ctx, ward.name, x + 3, y + 1, 'white', { shadow: true });
  drawText(ctx, `${Math.max(0, Math.ceil(ward.left / 60))}S`, x + w - 3, y + 1, 'white', { align: 'right', shadow: true });
}

/** Top strip (VIEW_TOP px tall): active hero HP bar, MP, XP, quarters, d20 Crit meter, bench faces, boss bar, and the defense's ward bar.
 * Every portrait shows the key that picks it, and the bench shows how far the swap has recharged. The same
 * rectangles (`slotRects`) answer clicks, so a portrait is a button. */
export function drawHud(ctx: CanvasRenderingContext2D, hud: HudView, t: number, o: HudOpts = {}): void {
  drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
  const band = hudBand();
  const lx = leftShift(band);
  const rects = slotRects(hud.party, band);
  // On a wider screen the strip is taller, and everything in it moves down to sit centered.
  ctx.save();
  ctx.translate(0, band.top);
  for (const r of rects) {
    const p = hud.party[r.index];
    if (!p) continue;
    // The active hero and the middle are drawn from the constants, so they move with the band's left edge.
    if (r.active) {
      ctx.save();
      ctx.translate(lx, 0);
      drawActive(ctx, p, r, t, o);
      ctx.restore();
    } else drawSlot(ctx, p, r, t, hud.swapReady, o);
  }
  ctx.save();
  ctx.translate(lx, 0);
  drawMiddle(ctx, hud, t);
  ctx.restore();
  drawMeter(ctx, hud, t, METER_X + rightShift(band));
  ctx.restore();
  if (hud.boss) drawBoss(ctx, hud.boss);
  if (hud.ward) drawWard(ctx, hud.ward, !!hud.boss);
}
