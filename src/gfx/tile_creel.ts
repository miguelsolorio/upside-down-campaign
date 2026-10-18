// The Creel House (stage 4.2), one tile set in two skins (docs/level-11.md, docs/chapter-4.md): Abandoned (gfx/var/creel_a.ts) is the house in
// 1986, and Blood red (creel_b.ts) is the house in 1959, in memory. The play scene bakes the parlor a second time in Blood red and fades it
// in over the first while a curse counts (bakeStage(rows, night, 'memory'), tile_ch4.ts). The sheets' painters are the game's, called through
// the sheet's looks with the letters they read (LETTER): the wall top and face, the boarded or draped windows, floorboards with their joints
// and rubble, the rug, and the holes through the floor. Two tiles are the game's own, since the sheet's room had neither: the staircase
// (steps, a runner down them and a newel post at its foot, one step missing here and there) and the furniture (dust sheets over lumps and
// long tables in Abandoned; in 1959 the same shapes uncovered, an armchair or a sofa in red velvet). The mirrors are props over the wall, and
// the grandfather clock is a prop (props_ch4.ts). Painted in daytime values, for the night pass. No noise: every mark is a hand made
// arrangement picked by the tile's variant. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import type { ColorName as N } from './palette.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { chair } from './var/creel_a.ts';
import { CREEL_OPTS } from './var/creel.ts';
import type { StageLook, TC } from './var/look_kit.ts';

export const CREEL_TILES: TileName[] = ['creelcap', 'creelwall', 'creelwin', 'creelfloor', 'creelrug', 'creelhole', 'creelstairs', 'creelfurn'];

/** The letters the sheet's painters read the room by: # wall top, W wall, w window, . floorboards, r rug, x hole. S is the staircase, F the furniture. */
const LETTER: Partial<Record<TileName, string>> = {
  creelcap: '#', creelwall: 'W', creelwin: 'w', creelfloor: '.', creelrug: 'r', creelhole: 'x', creelstairs: 'S', creelfurn: 'F',
};
const letter = (n: TileName): string => LETTER[n] ?? '.';

interface Skin {
  look: StageLook;
  /** Stair wood: riser, tread, the lit nosing, the dark of a gap. The runner's two tones, the newel post and its ball. */
  riser: N; tread: N; nosing: N; gap: N; runner: [N, N]; post: N; ball: N;
  /** Furniture in Abandoned: the dust sheet (lit, body, fold, shade). */
  sheet: [N, N, N, N];
  /** In 1959: the velvet (lit, body, shade) and the wood. */
  velvet: [N, N, N]; wood: N;
}
const look = (slug: string): StageLook => CREEL_OPTS.find((l) => l.slug === slug) as StageLook;
const ABANDONED: Skin = {
  look: look('abandoned'), riser: 'soil1', tread: 'soil2', nosing: 'soil3', gap: 'ink', runner: ['grey1', 'grey2'], post: 'soil2', ball: 'grey3',
  sheet: ['bone', 'grey3', 'grey2', 'grey1'], velvet: ['blood1', 'blood0', 'ink'], wood: 'soil1',
};
const BLOOD: Skin = {
  look: look('blood-red'), riser: 'soil0', tread: 'soil1', nosing: 'soil2', gap: 'black', runner: ['blood0', 'blood1'], post: 'soil1', ball: 'amber',
  sheet: ['bone', 'grey3', 'grey2', 'grey1'], velvet: ['red', 'blood1', 'blood0'], wood: 'soil1',
};

function tcOf(c: TileCtx, name: TileName): TC {
  return { ch: letter(name), tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 11) & 3, n: letter(c.near.n), s: letter(c.near.s), e: letter(c.near.e), w: letter(c.near.w) };
}

// ---------------------------------------------------------------- the staircase
/**
 * Steps going up the tile, four of them, each a lit nosing and a tread over a riser in shade, darker the higher it goes. A run of tiles is
 * one flight: the runner is one strip down its middle (it stops short of the stringers), and the stringers and the newel posts are at the
 * ends. In the abandoned house a board is gone from one step here and there.
 */
function stairs(c: TC, sk: Skin, floor: Px): Px {
  const px = floor, l = c.w === 'S', r = c.e === 'S';
  const gone = c.v === 2 && sk === ABANDONED ? 1 + (c.tx & 1) : -1;
  const rx0 = l ? 0 : r ? 8 : 4, rx1 = r ? 15 : l ? 7 : 11;
  for (let i = 0; i < 4; i++) {
    const y = i * 4, dim = i === 0;
    if (i === gone) {
      px.rect(1, y, 14, 4, sk.gap).rect(1, y, 4, 1, sk.tread).rect(11, y + 1, 4, 1, sk.riser).set(6, y, sk.nosing).set(9, y, sk.tread);
      continue;
    }
    px.rect(1, y, 14, 1, dim ? sk.tread : sk.nosing).rect(1, y + 1, 14, 1, dim ? sk.riser : sk.tread).rect(1, y + 2, 14, 1, dim ? sk.gap : sk.riser).rect(1, y + 3, 14, 1, sk.gap);
    px.rect(rx0, y, rx1 - rx0 + 1, 1, sk.runner[1]).rect(rx0, y + 1, rx1 - rx0 + 1, 2, sk.runner[0]).rect(rx0, y + 1, rx1 - rx0 + 1, 1, dim ? sk.runner[0] : sk.runner[1]);
  }
  if (sk === ABANDONED) for (const [x, y] of [[3, 1], [12, 5], [2, 9], [13, 13]] as const) px.set(x, y, 'grey3');
  if (!l) px.rect(0, 0, 2, 16, sk.gap).rect(1, 0, 1, 16, sk.riser).rect(0, 0, 1, 16, sk.post);
  if (!r) px.rect(14, 0, 2, 16, sk.gap).rect(14, 0, 1, 16, sk.riser).rect(15, 0, 1, 16, sk.post);
  if (c.s !== 'S') {
    if (!l) px.rect(0, 7, 2, 9, sk.post).rect(0, 7, 1, 9, sk.nosing).rect(0, 5, 2, 2, sk.ball).set(0, 5, 'white').set(1, 8, 'ink');
    if (!r) px.rect(14, 7, 2, 9, sk.post).rect(14, 7, 1, 9, sk.nosing).rect(14, 5, 2, 2, sk.ball).set(14, 5, 'white').set(15, 8, 'ink');
  }
  return px;
}

// ---------------------------------------------------------------- the furniture
/** The half widths of a lump, from its top row down to the hem: an armchair, a table, a heap of boxes, a tall cabinet, by the tile's variant. */
const SHAPE: [number, number[]][] = [[3, [4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 7]], [5, [6, 7, 7, 7, 7, 7, 7, 7, 7, 7]], [4, [2, 3, 4, 5, 6, 6, 7, 7, 7, 7, 7]], [1, [5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]]];

/** Under a dust sheet: the lump the variant picks, a run of tiles one long piece. The top is lit, folds hang to a scalloped hem and the right side falls in shade. */
function sheeted(c: TC, sk: Skin, floor: Px): Px {
  const [top, hw] = SHAPE[c.v] as [number, number[]], [lit, body, fold, shade] = sk.sheet;
  const m = new Px(16), l = c.w === 'F', r = c.e === 'F', hem = top + hw.length - 1;
  const left = (half: number): number => (l ? 0 : 8 - half), right = (half: number): number => (r ? 15 : 8 + half - 1);
  hw.forEach((half, i) => {
    const y = top + i;
    m.rect(left(half), y, right(half) - left(half) + 1, 1, body);
    if (i < hw.length - 1) { if (!l) m.set(left(half), y, lit).set(left(half) + 1, y, lit); if (!r) m.set(right(half), y, shade).set(right(half) - 1, y, shade); }
  });
  const x0 = left(hw[0] as number), x1 = right(hw[0] as number);
  m.rect(x0, top, x1 - x0 + 1, 1, lit);
  for (let x = x0 + 2; x < x1 - 1; x += 5) { const x2 = x + (c.v & 1); m.rect(x2, top + 3, 1, hem - top - 2, fold).rect(x2 + 1, top + 4, 1, hem - top - 4, shade); }
  m.rect(x0, hem, x1 - x0 + 1, 1, shade);
  for (let x = x0; x <= x1; x++) if ((x + c.v) % 4 === 0) m.set(x, hem, fold); else if ((x + c.v) % 5 === 1 && hem < 15) m.set(x, hem + 1, shade);
  if (c.v === 2 && !l && !r) m.set(8, top - 1, lit).set(8, top, body);
  return floor.blit(m.outline('ink'), 0, 0);
}

/** In 1959: a sofa when the run goes on, an armchair when it doesn't, in red velvet with nailheads and dark wood. */
function upholstered(c: TC, sk: Skin, floor: Px): Px {
  const [lit, body, shade] = sk.velvet, l = c.w === 'F', r = c.e === 'F';
  if (!l && !r) return floor.blit(chair({ b: body, h: lit, l: shade, leg: sk.wood, nail: 'amber' }), 0, 0);
  const m = new Px(16);
  m.rect(0, 2, 16, 6, body).rect(0, 2, 16, 1, lit).rect(0, 7, 16, 1, shade);
  m.rect(0, 8, 16, 5, body).rect(0, 9, 16, 1, lit).rect(0, 12, 16, 1, shade).rect(7, 9, 1, 3, shade);
  if (!l) m.rect(0, 3, 2, 10, body).rect(0, 3, 2, 1, lit).rect(0, 3, 1, 10, lit).set(1, 6, 'amber');
  if (!r) m.rect(14, 3, 2, 10, body).rect(14, 3, 2, 1, lit).rect(15, 3, 1, 10, shade).set(14, 6, 'amber');
  for (const x of [3, 8, 12]) m.set(x, 4, 'amber');
  m.rect(l ? 0 : 1, 13, 2, 2, sk.wood).rect(r ? 14 : 13, 13, 2, 2, sk.wood);
  return floor.blit(m.outline('ink'), 0, 0);
}

// ---------------------------------------------------------------- the set
const skinOf = (memory: boolean): Skin => (memory ? BLOOD : ABANDONED);

/** A Creel House tile in a skin, or null when `name` isn't one. */
export function creelTile(name: TileName, c: TileCtx, memory = false): Px | null {
  const ch = LETTER[name];
  if (!ch) return null;
  const sk = skinOf(memory), tc = tcOf(c, name);
  if (name === 'creelstairs') return stairs(tc, sk, sk.look.tile({ ...tc, ch: '.' }, 0));
  if (name === 'creelfurn') return (memory ? upholstered : sheeted)(tc, sk, sk.look.tile({ ...tc, ch: '.' }, 0));
  return sk.look.tile(tc, 0);
}

/** The house's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function creelNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'creelcap': return v === 0 ? all(name) : v === 1 ? { n: 'creelfloor', e: name, s: 'creelwall', w: name } : { n: 'creelfloor', e: 'creelfloor', s: 'creelwall', w: name };
    case 'creelwall': return v === 0 ? { n: 'creelcap', e: name, s: 'creelfloor', w: name } : v === 1 ? { n: 'creelcap', e: 'creelfloor', s: 'creelfloor', w: name } : { n: 'creelcap', e: name, s: 'creelfloor', w: 'creelfloor' };
    case 'creelwin': return v === 0 ? { n: 'creelcap', e: name, s: 'creelfloor', w: 'creelwall' } : v === 1 ? { n: 'creelcap', e: 'creelwall', s: 'creelfloor', w: name } : { n: 'creelcap', e: 'creelwall', s: 'creelfloor', w: 'creelwall' };
    case 'creelfloor': return v === 0 ? all(name) : v === 1 ? { n: 'creelwall', e: name, s: name, w: name } : { n: 'creelwall', e: name, s: name, w: 'creelrug' };
    case 'creelrug': return v === 0 ? all(name) : v === 1 ? { n: name, e: name, s: 'creelfloor', w: 'creelfloor' } : { n: 'creelfloor', e: name, s: name, w: 'creelfloor' };
    case 'creelhole': return all('creelfloor');
    case 'creelstairs': return v === 0 ? { n: name, e: name, s: 'creelfloor', w: name } : v === 1 ? { n: name, e: 'creelfloor', s: 'creelfloor', w: name } : { n: 'creelwall', e: name, s: name, w: 'creelfloor' };
    case 'creelfurn': return v === 0 ? all('creelfloor') : v === 1 ? { n: 'creelfloor', e: name, s: 'creelfloor', w: 'creelfloor' } : { n: 'creelfloor', e: name, s: 'creelfloor', w: name };
    default: return near;
  }
}
