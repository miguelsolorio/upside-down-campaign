// The pieces of solo-variations.html, the Hellfire solo as a retro Guitar Hero: a 256 by 224 game frame mid-song (the trailer
// roof in Upside Down Hawkins, Eddie planted in the middle in the owner's pick, Hellfire Club, demobats round him in the Pale
// look from demobat-variations.html, two of them stunned, the sound ring), and the note gems, targets and arrows the highway
// layouts in solo.ts draw on it. Lane colors come from the HUD: Attack red, Special blue like the MP bar, Crit gold like the
// d20. Pure pixel work: no DOM until toCanvas().
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import { paintRoles } from './kit.ts';
import { FRAMES, eddieFrame, FW } from './eddie_kit.ts';
import { EDDIE_OPTS } from './eddie_opts.ts';
import { demobatFrame } from './demobat_kit.ts';
import { BLUE, GOLD, RED, gem, target } from '../../solo/art.ts';
import type { Hue } from '../../solo/art.ts';

// The lane colors, the note gem and the strum target are the game's own now (src/solo/art.ts); the sheet draws them from there.
export { BLUE, GOLD, RED, gem, target };
export type { Hue as Lane };

export const SW = 256, SH = 224, HUD = 20;
/** Where Eddie stands: the middle of his frame, in screen px. */
export const EX = 128, EY = 112;

export const GREEN: Hue = { col: 'pine3', shade: 'pine1', hi: 'leaf' };

type Pt = readonly [number, number];

/** A demobat from above, wings up or down, or stunned: the Pale look (demobat_kit.ts), 17 by 14. */
export function bat(up: boolean, stun = false): Px {
  return demobatFrame('pale', stun ? 'stunned' : up ? 'flap1' : 'flap3');
}

/** Every pixel on a circle, so a ring is unbroken at any radius. */
export function ring(px: Px, cx: number, cy: number, r: number, c: ColorName, dash = 0): void {
  const n = Math.ceil(r * 8);
  for (let i = 0; i < n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const a = (i / n) * Math.PI * 2;
    px.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c);
  }
}

const BATS: { at: Pt; up: boolean; stun: boolean }[] = [
  { at: [58, 58], up: false, stun: false }, { at: [94, 38], up: true, stun: false }, { at: [168, 44], up: false, stun: true },
  { at: [198, 76], up: true, stun: false }, { at: [52, 150], up: true, stun: true }, { at: [186, 164], up: false, stun: false },
  { at: [140, 186], up: true, stun: false },
];

/** The frame without a highway: the HUD band, the ground, the trailer roof, the ring, the bats, Eddie soloing. */
export function backdrop(ringR = 30): Px {
  const p = new Px(SW, SH).fill('ink');
  p.rect(0, HUD, SW, SH - HUD, 'night');
  for (const [x0, y0, x1, y1] of [[0, 40, 30, 70], [10, 200, 44, 186], [226, 60, 256, 96], [216, 210, 250, 196], [0, 120, 22, 132]] as const) p.line(x0, y0, x1, y1, 'blood0');
  for (let i = 0; i < 40; i++) p.set((i * 73 + 11) % SW, HUD + ((i * 47 + 5) % (SH - HUD)), i % 3 ? 'shadow' : 'grey2');
  const rx = 36, ry = 52, rw = 184, rh = 144;
  for (let y = ry; y < ry + rh; y++) p.rect(rx, y, rw, 1, (y - ry) % 4 === 0 ? 'dusk' : (y - ry) % 4 === 1 ? 'shadow' : (y - ry) % 4 === 3 ? 'night' : 'shadow');
  p.rect(rx, ry + rh, rw, 4, 'grey1').rect(rx, ry - 1, rw, 1, 'slate');
  p.frame(rx - 1, ry - 2, rw + 2, rh + 7, 'ink');
  for (const [x, y] of [[60, 70], [190, 130], [88, 176], [170, 64]] as const) p.rect(x, y, 3, 2, 'soil1');
  ring(p, EX, EY, ringR + 6, 'orange', 3);
  ring(p, EX, EY, ringR, 'amber');
  for (const b of BATS) {
    p.blit(bat(b.up, b.stun), b.at[0] - 8, b.at[1] - 7);
  }
  const solo = FRAMES.findIndex((f) => f.label === 'SOLO');
  const o = EDDIE_OPTS[0]!;
  p.blit(paintRoles(eddieFrame(o, FRAMES[solo]!), FW, o.spec.pal), EX - 14, EY - 14);
  return p;
}

const ARROW = [
  '.....k.....',
  '....kck....',
  '...kccck...',
  '..kccccck..',
  '.kccccccck.',
  'kkkkccckkkk',
  '...kccck...',
  '...kccck...',
  '...kccck...',
  '...kkkkk...',
];

/** An arrow note pointing up, turned for the other three. Hollow in slate for the receptor. */
export function arrow(dir: 'left' | 'down' | 'up' | 'right', l: Hue | null): Px {
  const p = new Px(11, 10).art(ARROW, { k: 'ink', c: l ? l.col : 'shadow' });
  if (l) p.set(5, 2, l.hi).set(4, 3, l.hi).set(4, 6, l.hi).set(4, 7, l.hi);
  if (dir === 'up') return p;
  const q = new Px(11, 11);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 11; x++) {
      const v = p.d[y * 11 + x] as number;
      if (!v) continue;
      const [nx, ny] = dir === 'down' ? [x, 9 - y] : dir === 'left' ? [y, x] : [9 - y, x];
      q.d[ny * 11 + nx] = v;
    }
  }
  return q;
}
