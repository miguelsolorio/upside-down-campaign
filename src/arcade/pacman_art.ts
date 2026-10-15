// The art for the Pac-Man carts: Pac-Man and Ms. Pac-Man (drawn facing right, turned or mirrored to face the way
// they go), the ghosts, their eyes, the frightened ghost and the fruit, all 9 by 9 so they sit centered on an 8 px cell,
// and the 7 by 7 life icons. The walls are drawn as a thin line 3 px inside each wall block, with rounded corners and a double
// line round the outside, worked out per pixel from the maze rows once and cached as a canvas per color.
import { canvasFromPixels, px32 } from '../gfx/canvas.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { Dir } from './types.ts';
import { sprite } from './sprite.ts';
import type { Sprite } from './sprite.ts';
import { MAZE_H, MAZE_W } from './pacman_mazes.ts';

// ---------------------------------------------------------------- the players
const PAC_COLORS = { y: 'yellow', a: 'amber' } as const;
/** Pac-Man's chomp, facing right: shut, half open, wide open. The amber rim is his back. */
export const PAC: readonly Sprite[] = [
  ['..ayyyy..', '.ayyyyyy.', 'ayyyyyyyy', 'ayyyyyyyy', 'ayyyyyyyy', 'ayyyyyyyy', 'ayyyyyyyy', '.ayyyyyy.', '..ayyyy..'],
  ['..ayyyy..', '.ayyyyyy.', 'ayyyyyyy.', 'ayyyyy...', 'ayyy.....', 'ayyyyy...', 'ayyyyyyy.', '.ayyyyyy.', '..ayyyy..'],
  ['..ayyyy..', '.ayyyyy..', 'ayyyyy...', 'ayyyy....', 'ayyy.....', 'ayyyy....', 'ayyyyy...', '.ayyyyy..', '..ayyyy..'],
].map((r) => sprite(r, PAC_COLORS));

const MS_COLORS = { y: 'yellow', h: 'hot', p: 'pink', k: 'ink' } as const;
/** Ms. Pac-Man, facing right: a red bow on top, an eye and red lips at the mouth. */
export const MS: readonly Sprite[] = [
  ['hh.hhyy..', 'hhphhyyy.', 'hhyhhkyyy', 'yyyyyyyyy', 'yyyyyyyhh', 'yyyyyyyyy', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..'],
  ['hh.hhyy..', 'hhphhyyy.', 'hhyhhkyy.', 'yyyyyyh..', 'yyyy.....', 'yyyyyyh..', 'yyyyyyyy.', '.yyyyyyy.', '..yyyyy..'],
  ['hh.hhyy..', 'hhphhyy..', 'hhyhhky..', 'yyyyyh...', 'yyyy.....', 'yyyyyh...', 'yyyyyy...', '.yyyyyy..', '..yyyyy..'],
].map((r) => sprite(r, MS_COLORS));

/** The life icons along the bottom: a small Pac-Man and a small Ms. Pac-Man, 7 by 7. */
export const PAC_LIFE = sprite(['..yyyy.', '.yyyyyy', 'yyyy...', 'yyy....', 'yyyy...', '.yyyyyy', '..yyyy.'], { y: 'yellow' });
export const MS_LIFE = sprite(['hh.hhy.', 'hhhhyyy', 'yyyy...', 'yyy....', 'yyyy...', '.yyyyyy', '..yyyy.'],
  { y: 'yellow', h: 'hot' });

/** The chomp frame for a tick of motion: shut, half, wide, half. */
export function chompFrame(t: number): number {
  return [0, 1, 2, 1][(t >> 2) & 3] as number;
}

/** The turn and mirror that point a right-facing sprite in `dir`. */
export function facing(dir: Dir): { turn: 0 | 1 | 3; flip: boolean } {
  if (dir === 'left') return { turn: 0, flip: true };
  return { turn: dir === 'down' ? 1 : dir === 'up' ? 3 : 0, flip: false };
}

/** The death: the mouth opens from the top until nothing is left, then a little pop. Built from a disc, 9 by 9. */
export const PAC_DEATH: readonly Sprite[] = (() => {
  const out: Sprite[] = [];
  for (let f = 0; f < 9; f++) {
    const open = (f + 1) / 9 * Math.PI;
    const rows: string[] = [];
    for (let y = 0; y < 9; y++) {
      let row = '';
      for (let x = 0; x < 9; x++) {
        const dx = x - 4, dy = y - 4;
        const inDisc = dx * dx + dy * dy <= 20;
        const ang = Math.abs(Math.atan2(dx, -dy));
        row += inDisc && ang >= open ? (x === 0 || dx * dx + dy * dy > 15 && dx < 0 ? 'a' : 'y') : '.';
      }
      rows.push(row);
    }
    out.push(sprite(rows, PAC_COLORS));
  }
  const pop = ['.........', '....y....', '.y..y..y.', '..y...y..', '.........', '..y...y..', '.y..y..y.', '....y....', '.........'];
  out.push(sprite(pop, PAC_COLORS));
  return out;
})();

// ---------------------------------------------------------------- the ghosts
/** Blinky, Pinky, Inky and Clyde in house colors. */
export const GHOST_COLORS: readonly ColorName[] = ['hot', 'pink', 'cyan', 'orange'];
const BODY_TOP = ['...ccc...', '.ccccccc.', 'ccccccccc', 'ccccccccc', 'ccccccccc', 'ccccccccc', 'ccccccccc', 'ccccccccc'];
const SKIRTS = ['cc.ccc.cc', 'c.cc.cc.c'];
/** Two skirt frames per ghost. The eyes go on top. */
export const GHOSTS: readonly (readonly Sprite[])[] =
  GHOST_COLORS.map((c) => SKIRTS.map((skirt) => sprite([...BODY_TOP, skirt], { c })));

/** One eye, 3 by 4, with the pupil toward the way it looks, and where the pair sits in the 9 px body. */
const EYE: Record<Dir, { rows: string[]; x: [number, number]; y: number }> = {
  left: { rows: ['.w.', 'bww', 'bww', '.w.'], x: [0, 4], y: 1 },
  right: { rows: ['.w.', 'wwb', 'wwb', '.w.'], x: [2, 6], y: 1 },
  up: { rows: ['.b.', 'wbw', 'www', '.w.'], x: [1, 5], y: 0 },
  down: { rows: ['.w.', 'www', 'wbw', '.b.'], x: [1, 5], y: 2 },
};
const eyes = (d: Dir): Sprite => {
  const { rows, x, y } = EYE[d];
  const grid = Array.from({ length: 6 }, () => '.........'.split(''));
  rows.forEach((r, j) => {
    for (const x0 of x) for (let i = 0; i < 3; i++) if (r[i] !== '.') (grid[y + j] as string[])[x0 + i] = r[i] as string;
  });
  return sprite(grid.map((g) => g.join('')), { w: 'white', b: 'blue' });
};
/** The eyes, looking the way the ghost goes. Drawn on top of the body, and alone when an eaten ghost heads home. */
export const EYES: Readonly<Record<Dir, Sprite>> = {
  left: eyes('left'), right: eyes('right'), up: eyes('up'), down: eyes('down'),
};

const FRIGHT_FACE = ['...ccc...', '.ccccccc.', 'ccccccccc', 'ccfcccfcc', 'ccccccccc', 'ccccccccc', 'cfcfcfcfc', 'ccccccccc'];
/** A frightened ghost: blue with a wobbly mouth, or white with red when the time is nearly up. Two frames each. */
export const FRIGHT_BLUE: readonly Sprite[] = SKIRTS.map((s) => sprite([...FRIGHT_FACE, s], { c: 'blue', f: 'cream' }));
export const FRIGHT_WHITE: readonly Sprite[] = SKIRTS.map((s) => sprite([...FRIGHT_FACE, s], { c: 'white', f: 'hot' }));

// ---------------------------------------------------------------- the fruit
/** Cherries (100), a strawberry (300) and an orange (500). */
export const FRUITS: readonly Sprite[] = [
  sprite(['......g..', '.....gg..', '....g.g..', '...g..g..', '.rr...rr.', 'rhrr.rhrr', 'rrrr.rrrr', '.rr...rr.', '.........'],
    { g: 'leaf', r: 'red', h: 'pink' }),
  sprite(['...ggg...', '..ggggg..', '.rrrrrrr.', '.rcrrrcr.', '.rrrcrrr.', '..rcrrr..', '..rrrcr..', '...rrr...', '....r....'],
    { g: 'leaf', r: 'hot', c: 'cream' }),
  sprite(['....g....', '...ggo...', '..ooooo..', '.oaoooo..', '.oooooo..', '.oooooo..', '..oooo...', '...oo....', '.........'],
    { g: 'leaf', o: 'orange', a: 'amber' }),
];
export const FRUIT_POINTS: readonly number[] = [100, 300, 500];

// ---------------------------------------------------------------- the walls
/** Per pixel of the maze (21 * 8 by 19 * 8): 0 open, 1 a wall line, 2 inside a wall. Pure, so tests can read it. */
export function wallMask(rows: readonly string[]): Uint8Array {
  const W = MAZE_W * 8, H = MAZE_H * 8;
  const tunnel = rows.map((r) => r[0] === 'T');
  // The door and the house are open here so the line runs round them; the door bar is drawn on its own.
  const solid = (x: number, y: number): boolean => {
    if (y < 0 || y >= H) return true;
    const row = rows[y >> 3] as string;
    if (x < 0 || x >= W) return !tunnel[y >> 3];
    return row[x >> 3] === '#';
  };
  const out = new Uint8Array(W * H);
  const R = 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      let best = 99;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (!solid(x + dx, y + dy)) best = Math.min(best, dx * dx + dy * dy);
      }
      out[y * W + x] = best > 12 ? 2 : best > 6 ? 1 : 0;
    }
  }
  // Round the outside corners: a line pixel with one line neighbor across and one up or down, and wall inside the
  // bend, is the tip of a square corner. Dropping it leaves a step that reads as a curve.
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= W || y >= H ? 2 : out[y * W + x] as number);
  const tips: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== 1) continue;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const bend = at(x + sx, y) === 1 && at(x, y + sy) === 1 && at(x + sx, y + sy) === 2;
        if (bend && at(x - sx, y) === 0 && at(x, y - sy) === 0) tips.push(y * W + x);
      }
    }
  }
  for (const i of tips) out[i] = 0;
  // A post (one wall cell with open space all round) is drawn as a 6 by 6 block with rounded corners, line round a
  // filled middle, so it reads as wall and can't pass for a dot or a pellet.
  for (let cy = 0; cy < MAZE_H; cy++) {
    for (let cx = 0; cx < MAZE_W; cx++) {
      const post = solid(cx * 8, cy * 8) && !solid(cx * 8 - 8, cy * 8) && !solid(cx * 8 + 8, cy * 8)
        && !solid(cx * 8, cy * 8 - 8) && !solid(cx * 8, cy * 8 + 8);
      if (!post) continue;
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
          const edgeI = i === 1 || i === 6, edgeJ = j === 1 || j === 6;
          const inside = i >= 1 && i <= 6 && j >= 1 && j <= 6 && !(edgeI && edgeJ);
          out[(cy * 8 + j) * W + cx * 8 + i] = !inside ? 0 : edgeI || edgeJ ? 1 : 2;
        }
      }
    }
  }
  // The double line round the outside: one more line along the field edge, where the wall is thick.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edge = x === 1 || y === 1 || x === W - 2 || y === H - 2;
      if (edge && out[y * W + x] === 2) out[y * W + x] = 1;
    }
  }
  return out;
}

const wallCache = new Map<string, HTMLCanvasElement>();
/** The maze's walls as a canvas, lines in `line` and the inside in `fill` (black leaves it clear). Built on first use. */
export function wallCanvas(rows: readonly string[], line: ColorName, fill: ColorName): HTMLCanvasElement {
  const key = `${rows.join('')}|${line}|${fill}`;
  let c = wallCache.get(key);
  if (c) return c;
  const W = MAZE_W * 8, H = MAZE_H * 8;
  const mask = wallMask(rows);
  const px = new Uint32Array(W * H);
  const lc = px32(line), fc = fill === 'black' ? 0 : px32(fill);
  for (let i = 0; i < mask.length; i++) px[i] = mask[i] === 1 ? lc : mask[i] === 2 ? fc : 0;
  c = canvasFromPixels(px, W, H);
  wallCache.set(key, c);
  return c;
}
