// The Demogorgon pit (stage 4.1), the owner's pick: Mine shaft (gfx/var/pit_b.ts, docs/level-10.md). An old shaft under the camp: a rim of rough
// grey rock round it, walls of brown rock held up by timber posts with a lantern on a hook every few steps, a plank barricade nailed over the
// beast's tunnel, and a dirt floor with pebbles. The floor carries what the sheet laid on it by hand, here by position: stains of dried blood,
// bones, and in the open floor a drain and a chain, each rare enough that no two pits look alike. A wall is a pitcap row over a pitwall row (or
// two: the first is the upper face, under the rim) and the floor shades under it. The lantern is the one light, amber and cream, which the night
// pass leaves alone, and its hook is where night.ts finds a pool of light for it (lanternAt). Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2, px32 } from './canvas.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';

export const PIT_TILES: TileName[] = ['pitcap', 'pitwall', 'pitfloor', 'pitbar'];

const isWall = (n: TileName): boolean => n === 'pitwall' || n === 'pitbar';
const isRock = (n: TileName): boolean => n === 'pitcap' || isWall(n);
const variant = (c: TileCtx): number => hash2(c.tx, c.ty, 11) & 3;

/** The rim of the pit: rough grey rock with stones, a lit lip where it drops to a wall face below, and its edges where the floor is open. */
function cap(c: TileCtx): Px {
  const v = variant(c), { n, e, s, w } = c.near;
  const px = new Px(16).fill('grey2');
  const stones = [[[4, 4], [11, 10]], [[10, 4], [4, 10]], [[6, 7], [12, 3]], [[3, 11], [11, 6]]][v] as [number, number][];
  for (const [x, y] of stones) px.ellipse(x, y, 2.5, 2, 'grey3').ellipse(x + 0.5, y + 0.8, 2, 1.2, 'grey1').set(x - 1, y - 1, 'bone');
  px.rect((v * 5) % 10 + 3, 13, 3, 1, 'soil1');
  if (isWall(s)) px.rect(0, 12, 16, 1, 'grey3').rect(0, 13, 16, 3, 'soil0');
  if (!isRock(e)) px.rect(15, 0, 1, 16, 'soil0').rect(14, 0, 1, 16, 'grey3');
  if (!isRock(w)) px.rect(0, 0, 1, 16, 'soil0').rect(1, 0, 1, 16, 'grey3');
  if (!isRock(n)) px.rect(0, 0, 16, 1, 'grey3');
  return px;
}

/** A lantern on a hook, 8 by 16: amber glass in a dark frame with a cream core. */
function lantern(): Px {
  const p = new Px(8, 16);
  p.rect(3, 0, 1, 4, 'grey2').rect(2, 4, 4, 1, 'grey1').rect(1, 5, 6, 7, 'grey1').rect(2, 6, 4, 5, 'amber');
  p.rect(3, 6, 2, 5, 'cream').rect(1, 12, 6, 1, 'grey2');
  return p.outline('ink');
}
/** A lantern hangs from the upper face at every sixth tile along it, so a wall has one every few steps and never two side by side. */
const hangs = (tx: number): boolean => tx % 6 === 3;
/** Where night.ts looks for a lantern's light: its cream core, which no rock has. */
export const LANTERN_SPOT = { x: 7, y: 8 } as const;

/** A wall face of rough brown rock with a lit top edge on the upper row, and timber posts at every other tile. */
function face(c: TileCtx, upper: boolean): Px {
  const v = variant(c);
  const px = new Px(16).fill('soil1');
  const rocks = [[[3, 4], [10, 9], [5, 13]], [[8, 3], [3, 10], [12, 13]], [[12, 5], [6, 8], [2, 13]], [[5, 6], [12, 10], [8, 14]]][v] as [number, number][];
  for (const [x, y] of rocks) px.ellipse(x, y, 3, 2.2, 'soil2').set(x - 1, y - 1, 'sand').rect(x - 2, y + 2, 4, 1, 'soil0');
  const post = (c.tx & 1) === 0;
  if (post) px.rect(0, 0, 3, 16, 'soil2').rect(0, 0, 1, 16, 'sand').rect(2, 0, 1, 16, 'soil0');
  if (upper) px.rect(0, 0, 16, 3, 'soil2').rect(0, 0, 16, 1, 'sand').rect(0, 3, 16, 1, 'soil0');
  if (upper && c.near.w === 'pitwall' && c.near.e === 'pitwall' && hangs(c.tx)) px.blit(lantern(), 4, 0);
  return px;
}

/** The plank barricade over the beast's tunnel: dark behind boards nailed across, and a brace along the diagonal. The two tiles of a pair are its left and right halves. */
function gate(c: TileCtx, upper: boolean): Px {
  const left = c.near.e === 'pitbar';
  const px = new Px(16).fill('ink');
  for (let y = upper ? 2 : 1; y < 16; y += 5) px.rect(0, y, 16, 3, 'soil2').rect(0, y, 16, 1, 'soil3').set(left ? 2 : 13, y + 1, 'grey3');
  px.line(left ? 0 : 15, upper ? 2 : 0, left ? 15 : 0, 15, 'soil3');
  return px;
}

/** The dirt floor: pebbles and a scuff by variant, the shade of the rock round it, and the stains, bones, drain and chain that fall by position. */
function floor(c: TileCtx): Px {
  const v = variant(c), { n, e, s, w } = c.near;
  const px = new Px(16).fill('soil1');
  const peb = [[[3, 3], [11, 7], [6, 12]], [[9, 2], [2, 9], [13, 13]], [[5, 6], [12, 11], [2, 14]], [[12, 3], [7, 9], [3, 5]]][v] as [number, number][];
  for (const [x, y] of peb) px.rect(x, y, 2, 1, 'grey2').set(x, y + 1, 'soil0');
  px.rect((v * 4) % 11 + 2, 8, 4, 1, 'soil2');
  if (isWall(n)) px.rect(0, 0, 16, 2, 'soil0').rect(0, 2, 16, 1, 'ink');
  if (isRock(w)) px.rect(0, 0, 2, 16, 'soil0');
  if (isRock(e)) px.rect(14, 0, 2, 16, 'soil0');
  const roll = hash2(c.tx, c.ty, 301) % 64, openAll = [n, e, s, w].every((k) => k === 'pitfloor');
  if (roll < 3) px.ellipse(8, 9, 5, 3, 'blood0').ellipse(11, 6, 2, 1.5, 'blood0').set(4, 12, 'blood0');
  else if (roll < 5) {
    px.ellipse(5.5, 6.5, 2.6, 2.4, 'bone').rect(4, 8, 3, 2, 'bone').set(4, 6, 'ink').set(6, 6, 'ink').set(5, 9, 'grey3');
    for (let i = 0; i < 4; i++) px.rect(9 + (i & 1), 7 + i * 2, 5, 1, 'bone');
    px.rect(9, 7, 1, 7, 'grey3');
  } else if (roll === 5 && openAll) {
    px.ellipse(8, 8, 6, 4.5, 'ink').ellipse(8, 8, 5, 3.6, 'grey2');
    for (const x of [5, 7, 9, 11]) px.rect(x, 6, 1, 5, 'ink');
    px.rect(4, 5, 8, 1, 'grey3');
  } else if (roll === 6 && openAll) {
    for (let i = 0; i < 5; i++) {
      const x = 2 + i * 3, y = 3 + i * 2;
      px.rect(x, y, 3, 2, i & 1 ? 'grey2' : 'grey3').set(x + 1, y + (i & 1), 'ink');
    }
    px.rect(1, 1, 3, 3, 'grey2').set(2, 2, 'ink');
  }
  return px;
}

/** A pit tile, or null when `name` isn't one. */
export function pitTile(name: TileName, c: TileCtx): Px | null {
  const upper = !isWall(c.near.n);
  switch (name) {
    case 'pitcap': return cap(c);
    case 'pitwall': return face(c, upper);
    case 'pitbar': return gate(c, upper);
    case 'pitfloor': return floor(c);
    default: return null;
  }
}

/** True when a pit wall tile of the day art has a lantern on it: night.ts lights a pool at its foot. */
export const lanternAt = (day: Px): boolean => day.get(LANTERN_SPOT.x, LANTERN_SPOT.y) === px32('cream');

/** The pit's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function pitNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'pitcap': return v === 0 ? { n: name, e: name, s: 'pitwall', w: name } : v === 1 ? { n: 'pitfloor', e: name, s: 'pitwall', w: 'pitfloor' } : { n: 'pitfloor', e: 'pitfloor', s: 'pitfloor', w: name };
    case 'pitwall': return v === 0 ? { n: 'pitcap', e: name, s: 'pitfloor', w: name } : v === 1 ? { n: name, e: name, s: 'pitfloor', w: name } : { n: 'pitcap', e: 'pitbar', s: 'pitfloor', w: name };
    case 'pitbar': return v === 0 ? { n: 'pitcap', e: name, s: 'pitwall', w: 'pitwall' } : v === 1 ? { n: 'pitcap', e: 'pitwall', s: 'pitwall', w: name } : { n: name, e: name, s: 'pitfloor', w: 'pitwall' };
    case 'pitfloor': return v === 0 ? all(name) : v === 1 ? { n: 'pitwall', e: name, s: name, w: name } : { n: 'pitwall', e: 'pitcap', s: name, w: name };
    default: return near;
  }
}
