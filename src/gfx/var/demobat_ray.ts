// The Ray demobat (demobat_kit.ts): a wide flat manta seen from above, a swept wing with a flat back and a front edge that
// curves out from the head to the tips. It ripples instead of flapping: a wave runs out from the body to the wing tips, so the
// four flap frames are four phases of the wave. Glide is the wing held flat, dive folds it into a narrow dart, and stunned lets
// the tips hang. The tail is a stiff spine. The masks are made from a profile: where the wing starts and ends in each column,
// and how far the wave lifts it.
import { MH } from './demobat_rig.ts';
import type { Look, Masks, Pt } from './demobat_rig.ts';

/** First and last row of the wing by distance from the middle column (0 is the body, 7 the tip). */
const TOP = [4, 4, 4, 4, 3, 3, 3, 3];
const BOT = [8, 8, 8, 7, 7, 6, 5, 4];

/** The left half of the wing, lifted by `lift(d)` rows at distance d, keeping `keep` columns out from the middle. */
function wing(lift: (d: number) => number, keep = 8, squash = 0): string[] {
  const rows: string[][] = Array.from({ length: MH }, () => Array<string>(8).fill('.'));
  const ends: Pt[] = [];
  for (let c = 8 - keep; c < 8; c++) {
    const d = 7 - c, off = Math.round(lift(d));
    const top = (TOP[d] as number) + off, bot = Math.max(top, (BOT[d] as number) + off - (d > 2 ? squash : 0));
    for (let y = Math.max(0, top); y <= Math.min(MH - 1, bot); y++) (rows[y] as string[])[c] = '#';
    if (c === 8 - keep + 1 || c === 4) ends.push([c, Math.min(MH - 1, bot)]);
  }
  for (const [x, y] of ends) (rows[y] as string[])[x] = '*';
  return rows.map((r) => r.join(''));
}

const wave = (k: number) => (d: number): number => 0.38 * d * Math.sin((k * Math.PI) / 2 - 0.85 * d);

export const RAY_MASKS: Masks = {
  up: wing(wave(0)),
  mid: wing(wave(1)),
  down: wing(wave(2)),
  mid2: wing(wave(3)),
  glide: wing((d) => -0.12 * d),
  dive: wing((d) => -0.45 * d, 5, 1),
  stun: wing((d) => 0.4 * d),
};

export const RAY_LOOK: Omit<Look, 'masks'> = {
  pal: { s: 'slate', m: 'mist', r: 'red', w: 'white', y: 'yellow' },
  wing: { m: 's', v: 's', e: 's', t: 'm', end: 's', shoulder: [7, 6] },
  body: [
    '........',
    '........',
    '........',
    '........',
    '.......s',
    '.....m.m',
    '.......m',
    '.....m.m',
    '.......s',
  ],
  closed: [
    '........',
    '....ssss',
    '.....ssr',
  ],
  open: [
    '...ssr.k',
    '....srwk',
    '.....srr',
  ],
  tail: ['m', 'm'],
};
