// The top strip. Opaque, VIEW_TOP tall and as wide as the screen. Left: the active hero, with XP under the name and three
// columns beside it, each a tiny caption over its value: MP, coins, Crit. Right: the bench. On a wide screen the contents
// sit inside the clear band with room around them.
// There is no HP here: every hero's health is the bar over their head in the world, so a bench slot is just the key and
// the face. The strip is quiet, with no frames. MP is one blue segment per cast.
import type { HeroId, HudView, PartyHud } from '../core/types.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { slotKeyLabel } from '../core/bindings.ts';
import type { PromptDevice } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { drawBar, drawIcon, drawPanel, drawPortrait, drawText, drawTinyText, tinyWidth, TINY_H } from '../gfx/index.ts';
import { XP_NOTCHES, clamp01, isLowHp, mpBar, notchFill, notchSpans } from './format.ts';
import { blinkOn, box, clipped, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';
import { CAPTION_Y, COIN_X, CRIT_X, INSPIRE_X, LEFT_X, MP_BAR_W, MP_X, VALUE_H, VALUE_Y, XP_H, XP_W, XP_Y, hudBand, leftShift, slotRects } from './hudlayout.ts';
import type { SlotRect } from './hudlayout.ts';

/** Shortcut keys are drawn in this low-contrast color, so the names stay what you read first. */
const KEY_COLOR = 'slate';
/** The active hero's shortcut key sits this far left of the name. */
const ACTIVE_KEY_X = LEFT_X - 7;
/** On a bench slot the face sits a little below the top, so the slot is centered in the strip like the active portrait.
 * The key is 2 px in from the slot's left edge. */
const FACE_Y = 2;
const KEY_DX = 2;
/** A caption is tiny and quiet, so the value under it is what you read first. */
const CAPTION_COLOR = 'mist';
/** The Crit die: a d20 of this radius, 7 px wide and 8 tall, centered on the value row, under the caption's left end. */
const CRIT_R = 4;
const CRIT_CY = VALUE_Y + 3;
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

function drawActive(ctx: Ctx, p: PartyHud, r: SlotRect, o: HudOpts): void {
  const low = isLowHp(p.hp, p.hpMax);
  const up = o.levelUp?.has(p.id) ?? false;
  const swapped = o.swapAge != null && o.swapAge < SWAP_FLASH && (settings.reduceFlashing || ((o.swapAge >> 2) & 1) === 0);
  outline(ctx, 1, 0, 16, 16, up || swapped ? 'yellow' : 'amber');
  clipped(ctx, 2, 1, 14, 14, () => drawPortrait(ctx, p.id, p.ko ? 'hurt' : low ? 'worried' : 'neutral', -3, -2));
  // The key that picks this hero sits just left of the name, quietly, like the ones on the bench.
  if ((o.device ?? 'keyboard') === 'keyboard') drawText(ctx, slotKeyLabel(r.n), ACTIVE_KEY_X, 1, KEY_COLOR);
  drawText(ctx, p.name, LEFT_X, 1, 'white');
  drawText(ctx, `LV${p.level}`, LEFT_X + p.name.length * 6 + 6, 1, up ? 'white' : 'yellow');

  // XP is ten yellow notches, 5 px thick, under the name: as yellow as the level beside it. An empty notch is a step
  // lighter than the strip, because with no frame it would not read otherwise.
  const xp = p.xpNext > 0 ? clamp01(p.xp / p.xpNext) : 0;
  const notches = notchSpans(XP_W, XP_NOTCHES);
  notches.forEach((s, i) => drawBar(ctx, LEFT_X + s.x, XP_Y, s.w, XP_H, notchFill(xp, i, notches.length), 'yellow', 'dusk'));

  // MP is one segment per cast of the special. A bright segment holds a whole cast and can be used now, a dim one is still
  // charging. A hero with more casts than the bar has room for gets one bar with a tick at every cast.
  drawTinyText(ctx, 'MP', MP_X, CAPTION_Y, CAPTION_COLOR);
  const mp = mpBar(MP_BAR_W, p.mp, p.mpMax, p.mpCost);
  for (const c of mp.cells) drawBar(ctx, MP_X + c.x, VALUE_Y, c.w, VALUE_H, c.fill, c.ready ? 'blue' : 'slate', 'shadow');
  for (const x of mp.ticks) box(ctx, MP_X + x, VALUE_Y, 1, VALUE_H, 'ink');
}

/** The coin column: a COINS caption over the coin and its count. While a natural 20 has Inspiration running, the timer
 * takes the caption's place: a lit d20 and the seconds left. */
function drawCoins(ctx: Ctx, hud: HudView, t: number): void {
  if (hud.inspiration > 0) {
    drawIcon(ctx, 'd20Glow', INSPIRE_X, 0, t);
    drawText(ctx, `${Math.ceil(hud.inspiration)}S`, INSPIRE_X + 10, 1, 'yellow');
  } else drawTinyText(ctx, 'COINS', COIN_X, CAPTION_Y, CAPTION_COLOR);
  drawIcon(ctx, 'quarter', COIN_X, VALUE_Y, t);
  drawText(ctx, `x${hud.quarters}`, COIN_X + 9, VALUE_Y, 'white');
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

/** The Crit column: a CRIT caption over a small d20 that fills with light from the bottom, and glows gold with sparks once
 * the Crit is ready. The caption lights up with it. */
function drawMeter(ctx: Ctx, hud: HudView, t: number): void {
  drawTinyText(ctx, 'CRIT', CRIT_X, CAPTION_Y, hud.burstReady ? 'yellow' : CAPTION_COLOR);
  const cx = CRIT_X + CRIT_R;
  if (!hud.burstReady) {
    drawDie(ctx, cx, CRIT_CY, CRIT_R, { scheme: DIE_DIM, lit: hud.burst, litScheme: METER_LIT });
    return;
  }
  drawDie(ctx, cx, CRIT_CY, CRIT_R, { scheme: METER_LIT });
  if (settings.reduceFlashing) return;
  const s = (t >> 3) & 3;
  const hot = s === 1 ? 'white' : 'yellow';
  for (const [dx, dy] of [[-CRIT_R - 2, -2], [-CRIT_R - 2, 3]] as [number, number][]) {
    if (((dx + dy + s) & 1) === 0) box(ctx, cx + dx, CRIT_CY + dy, 1, 1, hot);
  }
}

function drawBoss(ctx: Ctx, boss: NonNullable<HudView['boss']>): void {
  const w = 176, x = (SCREEN_W - w) / 2, y = VIEW_TOP + 2;
  outline(ctx, x - 1, y - 1, w + 2, 11, 'ink');
  drawBar(ctx, x, y, w, 9, boss.hpMax > 0 ? boss.hp / boss.hpMax : 0, 'red', 'blood0');
  drawText(ctx, boss.name, SCREEN_W / 2, y + 1, 'white', { align: 'center', shadow: true });
}

/** Top strip (VIEW_TOP px tall): active hero, XP, then the MP, coin (or Inspiration) and Crit columns, bench faces, boss bar.
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
      drawActive(ctx, p, r, o);
      ctx.restore();
    } else drawSlot(ctx, p, r, t, hud.swapReady, o);
  }
  ctx.save();
  ctx.translate(lx, 0);
  drawCoins(ctx, hud, t);
  drawMeter(ctx, hud, t);
  ctx.restore();
  ctx.restore();
  if (hud.boss) drawBoss(ctx, hud.boss);
}
