// The top strip. Opaque, VIEW_TOP tall and as wide as the screen. Left: the active hero, with XP under the name and three
// columns beside it, each a tiny caption over its value: MP, coins, Crit. Right: the bench. On a wide screen the contents
// sit inside the clear band with room around them.
// There is no HP here: every hero's health is the bar over their head in the world, so a bench slot is just the key and
// the face. The strip is quiet, with no frames. MP is one blue segment per cast. Erica's stash, when the party carries any,
// is a mini Eggo and Coke with a count each on the MP caption's row (hudstash.ts). A boss hit in parts has a pip for each under its
// bar (bossLayout in hudlayout.ts). A hero alone (4.1) has no bench and no swap key. A cursed hero's slot shows the chimes sounded
// where the key is, and Max's slot carries her Walkman (hudcurse.ts).
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
import { drawStash } from './hudstash.ts';
import { ACTIVE_KEY_X, BOSS_BAR_H, BOSS_BAR_W, CAPTION_Y, COIN_X, CRIT_X, FACE_Y, INSPIRE_X, KEY_DX, LEFT_X, MP_BAR_W, MP_X, VALUE_H, VALUE_Y, XP_H, XP_W, XP_Y, bossLayout, cursePipsDx, hudBand, leftShift, levelDx, showsKeys, slotRects, tapeSpot } from './hudlayout.ts';
import type { BossLayout, SlotRect } from './hudlayout.ts';
import { CURSE_FRAME, drawCurse, drawTape } from './hudcurse.ts';

/** Shortcut keys are drawn a step under the names, so the names stay what you read first. Mist on the HUD's ink reads at 6:1; slate did not (2.9:1). */
const KEY_COLOR = 'mist';
/** The active hero's key offset, a bench slot's face and key: ACTIVE_KEY_X, FACE_Y and KEY_DX in hudlayout.ts. */
type Walkman = HudView['walkman'];
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
  /** The pointer is on the active hero's name and level, which open the character sheet. They light up as a link. */
  levelHot?: boolean;
  /** Which swap keys to print. Keyboard is the default, and only a keyboard has them. */
  device?: PromptDevice;
}
/** How long the new active hero's portrait flashes after a swap, in frames. */
const SWAP_FLASH = 20;

/** `keys`: this strip prints the shortcut keys. `walk`: Max's Walkman, passed only to her slot. */
function drawActive(ctx: Ctx, p: PartyHud, r: SlotRect, o: HudOpts, keys: boolean, walk: Walkman): void {
  const low = isLowHp(p.hp, p.hpMax);
  const up = o.levelUp?.has(p.id) ?? false;
  const swapped = o.swapAge != null && o.swapAge < SWAP_FLASH && (settings.reduceFlashing || ((o.swapAge >> 2) & 1) === 0);
  outline(ctx, 1, 0, 16, 16, r.cursed ? CURSE_FRAME : up || swapped ? 'yellow' : 'amber');
  clipped(ctx, 2, 1, 14, 14, () => drawPortrait(ctx, p.id, p.ko ? 'hurt' : low ? 'worried' : 'neutral', -3, -2));
  // The key that picks this hero sits just left of the name, quietly, like the ones on the bench. A cursed hero has the chimes there
  // instead, and a hero alone has no key at all: there is nobody to swap to.
  if (r.cursed) drawCurse(ctx, cursePipsDx(true), FACE_Y, p.curse);
  else if (keys) drawText(ctx, slotKeyLabel(r.n), ACTIVE_KEY_X, 1, KEY_COLOR);
  if (walk) { const at = tapeSpot(true); drawTape(ctx, at.dx, at.y, walk, p.ko); }
  drawText(ctx, p.name, LEFT_X, 1, 'white');
  const lv = `LV${p.level}`;
  drawText(ctx, lv, LEFT_X + levelDx(p.name), 1, up || o.levelHot ? 'white' : 'yellow');
  // The name and level open the character sheet. Under the mouse they get an underline, like a link.
  if (o.levelHot) box(ctx, LEFT_X, 8, levelDx(p.name) + lv.length * 6 - 1, 1, 'yellow');

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
 * The key fills from the bottom as the swap recharges, so it reads as ready once it is fully lit. A cursed hero is framed in red, with the
 * chimes sounded where the key is: they can't be swapped to, so nothing hints at it. */
function drawSlot(ctx: Ctx, p: PartyHud, r: SlotRect, t: number, ready: number, o: HudOpts, keys: boolean, walk: Walkman): void {
  const x = r.px, y = FACE_Y;
  const dead = p.ko;
  const hot = o.hover === r.index && !dead && !r.cursed;
  const pulse = p.id === o.focus && blinkOn(t, 40, 28); // a puzzle hint names this hero
  const mark = pulse || (o.levelUp?.has(p.id) ?? false) ? 'yellow' : hot ? (ready >= 1 ? 'yellow' : 'cream') : null;
  if (mark) outline(ctx, r.x, 0, r.w - 1, 15, mark);
  outline(ctx, x, y, 11, 11, dead ? 'dusk' : r.cursed ? CURSE_FRAME : 'slate');
  // A hero who is down keeps the neutral face, in greys.
  clipped(ctx, x + 1, y + 1, 9, 9, () => drawPortrait(ctx, p.id, 'neutral', x - 7, y - 5, dead));
  if (walk) { const at = tapeSpot(false); drawTape(ctx, r.x + at.dx, at.y, walk, dead); }
  if (r.cursed) { drawCurse(ctx, r.x + cursePipsDx(false), y, p.curse); return; }
  if (!keys) return;
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

function drawBoss(ctx: Ctx, boss: NonNullable<HudView['boss']>, lay: BossLayout): void {
  const { x, y } = lay;
  outline(ctx, x - 1, y - 1, BOSS_BAR_W + 2, BOSS_BAR_H + 2, 'ink');
  drawBar(ctx, x, y, BOSS_BAR_W, BOSS_BAR_H, boss.hpMax > 0 ? boss.hp / boss.hpMax : 0, 'red', 'blood0');
  drawText(ctx, boss.name, SCREEN_W / 2, y + 1, 'white', { align: 'center', shadow: true });
  // A boss hit in parts has a pip under the bar for each: the part's share of HP, or empty and dim once it is severed.
  for (const p of lay.pips) {
    box(ctx, p.x - 1, p.y - 1, p.w + 2, p.h + 2, 'ink');
    if (p.severed) box(ctx, p.x, p.y, p.w, p.h, 'night');
    else drawBar(ctx, p.x, p.y, p.w, p.h, p.share, 'red', 'blood0');
  }
}

/** The defense (docs/level-6.md): the ward's bar where the boss bar goes, in the same style and as still. Her name on the left,
 * the seconds left on the right. `y` is its top: under the boss bar (and its pips) if both are up, which the level doesn't ask for. */
function drawWard(ctx: Ctx, ward: NonNullable<HudView['ward']>, y: number): void {
  const w = BOSS_BAR_W, x = (SCREEN_W - w) / 2;
  outline(ctx, x - 1, y - 1, w + 2, BOSS_BAR_H + 2, 'ink');
  drawBar(ctx, x, y, w, BOSS_BAR_H, ward.hpMax > 0 ? ward.hp / ward.hpMax : 0, 'red', 'blood0');
  drawText(ctx, ward.name, x + 3, y + 1, 'white', { shadow: true });
  drawText(ctx, `${Math.max(0, Math.ceil(ward.left / 60))}S`, x + w - 3, y + 1, 'white', { align: 'right', shadow: true });
}

/** Top strip (VIEW_TOP px tall): active hero, XP, then the MP, coin (or Inspiration) and Crit columns, bench faces, boss bar (with a
 * pip per part under it, for the Mind Flayer's legs), and the defense's ward bar.
 * Every portrait shows the key that picks it, and the bench shows how far the swap has recharged. The same
 * rectangles (`slotRects`) answer clicks, so a portrait is a button. */
export function drawHud(ctx: CanvasRenderingContext2D, hud: HudView, t: number, o: HudOpts = {}): void {
  drawPanel(ctx, 0, 0, SCREEN_W, VIEW_TOP, 'hud');
  const band = hudBand();
  const lx = leftShift(band);
  const rects = slotRects(hud.party, band);
  const keys = showsKeys(hud.party, o.device);
  // On a wider screen the strip is taller, and everything in it moves down to sit centered.
  ctx.save();
  ctx.translate(0, band.top);
  for (const r of rects) {
    const p = hud.party[r.index];
    if (!p) continue;
    // Max's slot carries the Walkman, when the party has it.
    const walk = p.id === 'max' ? hud.walkman : null;
    // The active hero and the middle are drawn from the constants, so they move with the band's left edge.
    if (r.active) {
      ctx.save();
      ctx.translate(lx, 0);
      drawActive(ctx, p, r, o, keys, walk);
      ctx.restore();
    } else drawSlot(ctx, p, r, t, hud.swapReady, o, keys, walk);
  }
  ctx.save();
  ctx.translate(lx, 0);
  drawCoins(ctx, hud, t);
  drawMeter(ctx, hud, t);
  drawStash(ctx, hud.stash);
  ctx.restore();
  ctx.restore();
  const lay = bossLayout(SCREEN_W, VIEW_TOP, hud.boss?.parts);
  if (hud.boss) drawBoss(ctx, hud.boss, lay);
  if (hud.ward) drawWard(ctx, hud.ward, hud.boss ? lay.nextY : lay.y);
}
