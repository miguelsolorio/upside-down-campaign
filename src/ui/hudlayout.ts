// Where each hero sits in the top strip. The HUD draws from these rectangles and the play scene hit-tests clicks
// against the same ones, so what you see is what you can press. Pure, so Node can test it.
// The constants below place things in a strip STRIP_W wide and CELL_H tall. On a wider screen the strip runs edge to
// edge and is taller, and its contents follow the clear band with some room around them: the active hero and the columns
// beside it (MP, coins, Crit) stay against the band's left edge (leftShift), the bench against its right edge
// (rightShift), and everything is moved down by the band's `top` so it sits centered in the strip.
import { HUD_PAD_X, STRIP_H, VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import type { PartyHud, Stash, StashItem } from '../core/types.ts';
import type { PromptDevice } from '../core/bindings.ts';
import type { Rect } from '../core/pointer.ts';

/** The width the constants below are laid out for. */
export const STRIP_W = 256;

/** A bench slot is a shortcut key and an 11 px face side by side, with room before the next slot. */
export const BENCH_PITCH = 21;
/** In a bench slot, from its left edge to the face: 2 px of padding, the 3 px key and a 2 px gap. */
export const BENCH_FACE_DX = 7;
/** Room for three benched heroes. */
export const BENCH_W = 63;
/** The strip is 20 px tall on a 256 px screen and a slot's click cell spans all of it. The last two rows are its border. */
export const CELL_H = STRIP_H;
/** The bench ends at the strip's edge (a slot has 3 px of its own past the face), and its first slot starts BENCH_W before
 * that. The slots sit in fixed places from the first one on, so a hero joining the party fills the next one and nothing
 * else moves. */
export const BENCH_END = STRIP_W;
export const BENCH_START = BENCH_END - BENCH_W;
/** The active hero's name and level, and the XP notches under them, start here, right of the portrait and its shortcut
 * key. */
export const LEFT_X = 25;
/** The active hero's shortcut key sits this far left of the name. On a bench slot the face frame starts FACE_Y down, which centers
 * it in the strip like the active portrait, and the key is KEY_DX in from the slot's left edge. */
export const ACTIVE_KEY_X = LEFT_X - 7;
export const FACE_Y = 2;
export const KEY_DX = 2;
/** XP is ten notches, 5 px thick, under the name. The widest name and level, DUSTIN LV12, ends at 90, so the notches and
 * the columns beside them never meet it. */
export const XP_Y = 10;
export const XP_H = 5;
export const XP_W = 62;
/** Three columns follow, each a tiny caption over a 7 px value row: MP, then the coins, then Crit. CAPTION_Y is the top of
 * the caption and VALUE_Y the top of the value under it. */
export const CAPTION_Y = 1;
export const VALUE_Y = 8;
export const VALUE_H = 7;
/** MP: the caption over one segment per cast. */
export const MP_X = 100;
export const MP_BAR_W = 28;
/** Erica's stash (docs/level-7.md, "Erica and the stash"): the Eggos and Cokes the party carries, a mini icon and a tiny count each.
 * The strip has no room for a fourth column at 256 wide (the columns leave 8 px before the bench), so it rides the MP column's
 * caption row, in the 19 px right of the "MP" caption: 2 px past the caption, ending where the MP bar ends. Nothing shows
 * when there is none. A Coke is the thing that refills MP, so it sits where it is read. */
export const STASH_X = MP_X + 9;
export const STASH_Y = CAPTION_Y;
/** The mini icons are 5 px tall, the height of the caption row. An Eggo is 5 wide, a Coke 3, each followed by a 1 px gap and a
 * 3 px digit, and a 3 px gap before the next. */
export const STASH_ICON_W: Record<StashItem, number> = { eggo: 5, coke: 3 };
export const STASH_CELL_GAP = 3;
export interface StashCell { item: StashItem; /** Left edge, in strip px. */ x: number; count: number }
/** The cells to draw, left to right, Eggo first. An item with none left has no cell, and the next slides left. */
export function stashCells(stash: Stash | undefined): StashCell[] {
  const out: StashCell[] = [];
  let x = STASH_X;
  for (const item of ['eggo', 'coke'] as const) {
    const count = Math.max(0, Math.min(9, Math.floor(stash?.[item] ?? 0)));
    if (count === 0) continue;
    out.push({ item, x, count });
    x += STASH_ICON_W[item] + 1 + 3 + STASH_CELL_GAP;
  }
  return out;
}

/** Coins: the caption over the 7 px coin, a 2 px gap and "x99" in 6 px glyphs. The Inspiration timer takes the caption's
 * place while a natural 20 has it running. */
export const COIN_X = 137;
export const COIN_W = 9 + 'x99'.length * 6 - 1;
export const INSPIRE_X = COIN_X - 3;
/** Crit: the caption over a small d20, 8 px wide, under the caption's left end. */
export const CRIT_X = 170;
export const CRIT_W = 'CRIT'.length * 4 - 1;
/** The columns end here, and the bench starts after them. */
export const CLUSTER_END = CRIT_X + CRIT_W;
/** The least room between the coin count and the Crit column. */
export const CRIT_GAP = 5;
/** The coin count as drawn: "x156" up to 999, then whole thousands as "x1K" to "x99K", so it never runs past four glyphs. */
export function coinText(quarters: number): string {
  const q = Math.max(0, Math.floor(quarters));
  if (q < 1000) return `x${q}`;
  return `x${Math.min(99, Math.floor(q / 1000))}K`;
}
/** The coin column's width for a count: the coin, a 2 px gap and the count in 6 px glyphs. */
export const coinW = (quarters: number): number => 9 + coinText(quarters).length * 6 - 1;
/** Where the Crit column starts: CRIT_X, or further right when the coin count is wider than two digits. */
export const critX = (quarters: number): number => Math.max(CRIT_X, COIN_X + coinW(quarters) + CRIT_GAP);
/** The active hero's portrait box and its click cell. */
export const ACTIVE_CELL = { x: 0, y: 0, w: 20, h: CELL_H };
/** The name row: the name, a 6 px gap, then LVn, all in 6 px glyphs. The level starts this far right of LEFT_X. */
export const levelDx = (name: string): number => name.length * 6 + 6;

export interface SlotRect {
  /** Position in the party, 0..3. This is what a click sends as `swapTo`. */
  index: number;
  /** The key number, 1..4. */
  n: 1 | 2 | 3 | 4;
  active: boolean;
  ko: boolean;
  /** Under the clock curse (docs/level-11.md): the slot shows the chimes where the key is, and it is no swap target. */
  cursed: boolean;
  /** On a mark in the final fight's channel (docs/level-16.md): the slot shows the held mark where the key is, and it is no swap target. */
  held: boolean;
  /** The click cell. It covers the portrait and its key label. */
  x: number; y: number; w: number; h: number;
  /** Left edge of the face frame: 11 px wide for a bench slot, 16 px for the active hero. */
  px: number;
}

/** Pitch between bench slots. It stays 21 for any bench size, so a hero's tag looks the same whoever else is out. */
export function benchPitch(count: number): number {
  return Math.min(BENCH_PITCH, Math.floor(BENCH_W / Math.max(1, count)));
}

/** Where the strip's contents go, in screen px: across from x for w, moved down by top, in a strip h tall. */
export interface HudBand { x: number; w: number; top: number; h: number }
/** The contents ink rows 0 to 15 of the 18 above the border, so they move down one row to sit centered. */
export const CONTENT_DY = 1;
/** The clear band, inset at the sides on a wider screen, and the strip's height. Read when called, so the strip and
 * its clicks always use the current screen. The inset shrinks when the band is barely wider than the strip. */
export function hudBand(): HudBand {
  const pad = Math.max(0, Math.min(HUD_PAD_X, Math.floor((VIEW_W - STRIP_W) / 2)));
  return { x: VIEW_X + pad, w: VIEW_W - pad * 2, top: (VIEW_TOP - STRIP_H) / 2 + CONTENT_DY, h: VIEW_TOP };
}
/** How far the left-hand contents (active hero, middle) move from where the constants put them. */
export const leftShift = (b: HudBand): number => b.x;
/** How far the right-hand contents (the bench) move from where the constants put them. */
export const rightShift = (b: HudBand): number => b.x + b.w - STRIP_W;

/** Left edge of bench slot `k`. */
export function benchX(k: number, count: number, band: HudBand = hudBand()): number {
  return BENCH_START + rightShift(band) + k * benchPitch(count);
}

const isCursed = (p: PartyHud): boolean => (p.curse ?? 0) > 0;
const isHeld = (p: PartyHud): boolean => p.channeling === true;

/** The shortcut keys are printed on a keyboard, and only where a swap can happen: a party of one has nobody to swap to, and its
 * one portrait is no button (4.1 is Hopper alone, docs/level-10.md). */
export const showsKeys = (party: readonly PartyHud[], device: PromptDevice = 'keyboard'): boolean => device === 'keyboard' && party.length > 1;

/** One rectangle per hero, the active one first and then the bench left to right in party order. */
export function slotRects(party: readonly PartyHud[], band: HudBand = hudBand()): SlotRect[] {
  const out: SlotRect[] = [];
  const bench = party.map((p, i) => ({ p, i })).filter((b) => !b.p.active);
  const lx = leftShift(band);
  party.forEach((p, i) => {
    if (!p.active) return;
    out.push({ index: i, n: (i + 1) as SlotRect['n'], active: true, ko: p.ko, cursed: isCursed(p), held: isHeld(p), ...ACTIVE_CELL, x: ACTIVE_CELL.x + lx, h: band.h, px: 1 + lx });
  });
  const pitch = benchPitch(bench.length);
  bench.forEach((b, k) => {
    const x = benchX(k, bench.length, band);
    out.push({ index: b.i, n: (b.i + 1) as SlotRect['n'], active: false, ko: b.p.ko, cursed: isCursed(b.p), held: isHeld(b.p), x, y: 0, w: pitch, h: band.h, px: x + BENCH_FACE_DX });
  });
  return out;
}

/** Party index under a point in game px, or -1. Only a swappable hero is a target: the active hero, a KO'd hero, a cursed one and a channeler are not. */
export function slotAt(party: readonly PartyHud[], x: number, y: number, band: HudBand = hudBand()): number {
  for (const r of slotRects(party, band)) {
    if (!swappable(party[r.index])) continue;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.index;
  }
  return -1;
}

/** The active hero's name and level, which together are the button that opens the character sheet. The box runs 2 px
 * past the text on each side and stops above the XP notches. Null with no active hero. */
export function levelRect(party: readonly PartyHud[], band: HudBand = hudBand()): Rect | null {
  const p = party.find((m) => m.active);
  if (!p) return null;
  const ink = levelDx(p.name) + `LV${p.level}`.length * 6 - 1;
  return { x: leftShift(band) + LEFT_X - 2, y: band.top, w: ink + 4, h: 9 };
}

/** True when a point in game px is on the active hero's name and level. */
export function onLevel(party: readonly PartyHud[], x: number, y: number, band: HudBand = hudBand()): boolean {
  const r = levelRect(party, band);
  return !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** The Crit column's click cell, screen px: the CRIT caption and the d20 under it, the strip's full height, 2 px of slack each side. */
export function critRect(quarters: number, band: HudBand = hudBand()): Rect {
  return { x: leftShift(band) + critX(quarters) - 2, y: 0, w: CRIT_W + 4, h: band.h };
}
/** True when (x, y), screen px, is on the Crit column. The play scene fires the Crit on a click there once the die is full. */
export function onCrit(quarters: number, x: number, y: number, band: HudBand = hudBand()): boolean {
  const r = critRect(quarters, band);
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
/** A hero a click may swap to: on the bench, standing, not hanging under a curse and not on a mark in the channel. The rule slotAt applies. */
export function swappable(p: PartyHud): boolean {
  return !p.active && !p.ko && !isCursed(p) && !isHeld(p);
}

// ---------------------------------------------------------------- the boss bar and its leg pips
/** The boss bar, and the defense's ward bar that takes its place, is this wide and 9 tall, with a 1 px frame, 2 px under the
 * strip. */
export const BOSS_BAR_W = 176;
export const BOSS_BAR_H = 9;
/** A boss hit in parts (the Mind Flayer's four legs) gets one pip per part under the bar: 22 by 5, 4 px apart, centered, in a
 * 1 px frame. The frame's top row is 1 px under the bar's frame, like the ward bar's. More parts than fit are narrowed to stay
 * under the bar, and parts past MAX_PIPS are not shown. */
export const PIP_W = 22;
export const PIP_H = 5;
export const PIP_GAP = 4;
export const MAX_PIPS = 8;
/** From the bar's top to a pip's top, and to the top of whatever stacks under the pips (the ward's bar, which the level
 * doesn't ask for beside a boss). Without pips the next bar is 12 px down, as it always was. */
export const PIP_DY = 12;
export const NEXT_DY = 12;
export const NEXT_DY_PIPS = PIP_DY + PIP_H + 3;

export interface Pip {
  x: number; y: number; w: number; h: number;
  /** The part's share of HP, 0 to 1. */
  share: number;
  /** Filled px of w: round(w * share), at least 1 while any is left (what drawBar fills), 0 when severed. */
  fill: number;
  /** 0 share: the part is severed, and its pip is empty and dim. */
  severed: boolean;
}
export interface BossLayout {
  /** The bar's top-left, and its top row: bars and pips are placed from here. */
  x: number; y: number;
  pips: Pip[];
  /** The top of a bar stacked under this one and its pips. */
  nextY: number;
}

/** Where the boss bar and its pips go on a screen `screenW` wide with the strip `viewTop` tall. `parts` is `hud.boss.parts`:
 * each part's share of HP, 0 when severed. None (or an empty list) means no pips. A share that isn't a number counts as 0. */
export function bossLayout(screenW: number, viewTop: number, parts?: readonly number[]): BossLayout {
  const x = (screenW - BOSS_BAR_W) / 2, y = viewTop + 2;
  const shares = (parts ?? []).slice(0, MAX_PIPS);
  const n = shares.length;
  if (n === 0) return { x, y, pips: [], nextY: y + NEXT_DY };
  const w = Math.max(1, Math.min(PIP_W, Math.floor((BOSS_BAR_W - (n - 1) * PIP_GAP) / n)));
  const x0 = Math.floor((screenW - (n * w + (n - 1) * PIP_GAP)) / 2);
  const pips = shares.map((v, i): Pip => {
    const share = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    return { x: x0 + i * (w + PIP_GAP), y: y + PIP_DY, w, h: PIP_H, share, fill: share > 0 ? Math.max(1, Math.round(w * share)) : 0, severed: share <= 0 };
  });
  return { x, y, pips, nextY: y + NEXT_DY_PIPS };
}

// ---------------------------------------------------------------- the channel's bars
// Phase three of the final fight (docs/level-16.md) keeps the boss bar, which reads THE CHANNEL with the seconds left, and puts the two
// channelers' bars under it, side by side across the same width, one row down. The party band marks a held hero where the key would be.
/** The gap between two channeler bars. */
export const CHANNEL_GAP = 4;
export interface ChannelBar { x: number; y: number; w: number; h: number }
/** `n` bars side by side across the boss bar's width, centered on a screen `screenW` wide, their tops at `y` (the boss bar's `nextY`). */
export function channelBars(screenW: number, y: number, n: number): ChannelBar[] {
  const count = Math.max(1, n);
  const w = Math.floor((BOSS_BAR_W - (count - 1) * CHANNEL_GAP) / count);
  const x0 = Math.floor((screenW - (count * w + (count - 1) * CHANNEL_GAP)) / 2);
  return Array.from({ length: n }, (_, i): ChannelBar => ({ x: x0 + i * (w + CHANNEL_GAP), y, w, h: BOSS_BAR_H }));
}
/** The held mark is a 3 by 5 ring, where a cursed hero's pips and a hero's key are. */
export const HELD_W = 3;
export const HELD_H = 5;
export const heldDx = (active: boolean): number => (active ? ACTIVE_KEY_X : KEY_DX);

// ---------------------------------------------------------------- the curse and the Walkman
// Both are drawn from a slot's own left edge: a bench slot's x, and for the active hero the strip's origin once it is shifted to the
// band, which is where its key sits at ACTIVE_KEY_X.
/** A cursed hero's slot shows four pips where its key is, a column as tall as the face: each 3 by 2, a pixel apart, from the face's top.
 * The chimes sounded are lit, red (ui/hudcurse.ts). It sits where the key does, so it never meets the face. */
export const CURSE_PIPS = 4;
export const CURSE_PIP_W = 3;
export const CURSE_PIP_H = 2;
export const CURSE_PIP_GAP = 1;
export const CURSE_H = CURSE_PIPS * CURSE_PIP_H + (CURSE_PIPS - 1) * CURSE_PIP_GAP;
export const cursePipsDx = (active: boolean): number => (active ? ACTIVE_KEY_X : KEY_DX);

/** Max's Walkman is a 6 by 5 tape on her slot, a gap under the key, so it never meets the face or the XP notches. A bench slot's sits
 * left of the face, flush with the slot's edge; the active hero's under the key, level with the XP notches. The mark it shows while
 * it protects is a line TAPE_W wide, a pixel under it. */
export const TAPE_W = 6;
export const TAPE_H = 5;
export const TAPE_BENCH_Y = 11;
export const TAPE_ACTIVE_Y = XP_Y;
export const TAPE_MARK_DY = TAPE_H + 1;
export const tapeSpot = (active: boolean): { dx: number; y: number } => (active ? { dx: ACTIVE_KEY_X, y: TAPE_ACTIVE_Y } : { dx: 0, y: TAPE_BENCH_Y });
