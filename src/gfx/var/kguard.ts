// The cards of guard-variations.html: for each Kamchatka guard (stage 4.1) the seven frames at 4x on a patch of the Blizzard look's
// night snow (facing down, up and side, a walk frame, the aim or wind up, the shot or swing, and hurt), and under them a strip of
// the real Kamchatka snow at 1x, the size the game shows, with the guard's frames, two more of him facing down, the 3.2 Russian
// soldier and Hopper beside them for scale and for how the coats read. One canvas per design, so it exports as one image.
// Data: kguard_opts.ts, drawn with the game's own composeFrame.
import type { AnimId } from '../../core/types.ts';
import { composeFrame } from '../actor_pose.ts';
import { HOPPER } from '../data/hopper.ts';
import { SOLDIER } from '../data/soldier.ts';
import type { CharSpec, View } from '../data/types.ts';
import { nightSprite } from '../night.ts';
import { Px } from '../px.ts';
import { KAMCHATKA_OPTS, KAMCHATKA_ROOM } from './kamchatka.ts';
import type { GuardOpt } from './kguard_opts.ts';
import { cardCanvas, fills, flat, floorOval, label, paintRoles, zoom } from './kit.ts';
import { ctxAt, pools } from './look_kit.ts';

export type { GuardOpt } from './kguard_opts.ts';
export { KGUARD_OPTS } from './kguard_opts.ts';

interface Fr { label: string; view: View; anim: AnimId; f: number }
const K = 4, GAP = 8, SPR = 16 * K;
const FRAMES: Fr[] = [
  { label: 'DOWN', view: 'down', anim: 'idle', f: 0 }, { label: 'UP', view: 'up', anim: 'idle', f: 0 },
  { label: 'SIDE', view: 'side', anim: 'idle', f: 0 }, { label: 'WALK', view: 'side', anim: 'walk', f: 0 },
  { label: 'AIM', view: 'side', anim: 'attack', f: 0 }, { label: 'FIRE', view: 'side', anim: 'attack', f: 1 },
  { label: 'HURT', view: 'side', anim: 'hurt', f: 0 },
];
/** The two facing-down frames of the strip, after the seven above. */
const EXTRA: Fr[] = [{ label: '', view: 'down', anim: 'attack', f: 0 }, { label: '', view: 'down', anim: 'attack', f: 1 }];
const MELEE = ['DOWN', 'UP', 'SIDE', 'WALK', 'WIND UP', 'SWING', 'HURT'];
/** Every frame a design can show, for the color count. */
const EVERY: Fr[] = (['down', 'up', 'side'] as View[]).flatMap((view) => ([['idle', 2], ['walk', 4], ['attack', 2], ['hurt', 1]] as [AnimId, number][])
  .flatMap(([anim, n]) => Array.from({ length: n }, (_, f) => ({ label: '', view, anim, f }))));

export const CARD_W = GAP + FRAMES.length * (SPR + GAP);
const PANEL = 88, CAP = PANEL + 8, STRIP_Y = CAP + 12, STRIP_H = 48;
export const CARD_H = STRIP_Y + STRIP_H + 8;

const paint = (spec: CharSpec, fr: Fr): Px => paintRoles(composeFrame(spec, fr.view, fr.anim, fr.f), 16, spec.pal);

/** The sprites of a design, in the order of FRAMES. */
export function frames(o: GuardOpt): Px[] { return FRAMES.map((fr) => paint(o.spec, fr)); }

/** Fill colors a design uses over all its frames, not counting the ink outline. */
export function colorsOf(o: GuardOpt): number { return fills(...EVERY.map((fr) => paint(o.spec, fr))); }

// ---------------------------------------------------------------- the snow
const SNOW_AT: [number, number][] = [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [0, 5], [1, 5], [2, 5], [4, 5], [5, 5], [6, 5]];
let tiles: Px[] | null = null;
const css = (v: number): string => `#${[v & 255, (v >> 8) & 255, (v >> 16) & 255].map((x) => x.toString(16).padStart(2, '0')).join('')}`;

/** The Blizzard look's snow tiles in its night art, taken from the open yard of the Kamchatka room. */
function snowTiles(): Px[] {
  tiles ??= SNOW_AT.map(([x, y]) => nightSprite(KAMCHATKA_OPTS[0]!.tile(ctxAt(KAMCHATKA_ROOM, x, y), 0)));
  return tiles;
}

/** The base color of the night snow, for the flat patch behind the 4x frames. */
function snowBase(): string {
  const count = new Map<number, number>();
  for (const v of snowTiles()[1]!.d) count.set(v, (count.get(v) ?? 0) + 1);
  return css([...count].sort((a, b) => b[1] - a[1])[0]![0]);
}

/** A strip of the yard: night snow tiles with one floodlight pool lifting the left half, as the look does it. */
function snowStrip(w: number, h: number): Px {
  const look = KAMCHATKA_OPTS[0]!, ts = snowTiles(), out = new Px(w, h);
  for (let ty = 0; ty < h / 16; ty++) for (let tx = 0; tx < w / 16; tx++) out.blit(ts[(tx * 5 + ty * 3) % ts.length]!, tx * 16, ty * 16);
  pools(out, [[120, 8, 84, 0.75]], look.glow);
  return out;
}

const center = (x: number, w: number, s: string): number => x + Math.round((w - s.length * 6) / 2);
const actor = (s: CharSpec): Px => paintRoles(composeFrame(s, 'down', 'idle', 0), 16, s.pal);

export function guardCard(o: GuardOpt): HTMLCanvasElement {
  const { c, g } = cardCanvas(CARD_W, CARD_H, 'night');
  g.fillStyle = snowBase();
  g.fillRect(0, 0, CARD_W, PANEL);
  const names = o.melee ? MELEE : FRAMES.map((fr) => fr.label);
  frames(o).forEach((p, i) => {
    const x = GAP + i * (SPR + GAP);
    zoom(g, p, x, 6, K);
    label(g, names[i]!, center(x, SPR, names[i]!), 6 + SPR + 6, 'bone');
  });
  label(g, '1X ON KAMCHATKA SNOW, WITH THE 3.2 SOLDIER AND HOPPER', GAP, CAP, 'slate');
  flat(g, snowStrip(CARD_W - 2 * GAP, STRIP_H), GAP, STRIP_Y);
  const top = STRIP_Y + 6, stand = (p: Px, x: number): void => { floorOval(g, x + 8, top + 13, 12, 'night'); flat(g, p, x, top); };
  const mine = [...frames(o), ...EXTRA.map((fr) => paint(o.spec, fr))];
  mine.forEach((p, i) => stand(p, GAP + 10 + i * 28));
  const refs: [CharSpec, string][] = [[SOLDIER, 'SOLDIER'], [HOPPER, 'HOPPER']];
  const rx = GAP + 10 + mine.length * 28 + 16;
  refs.forEach(([s, name], j) => {
    const x = rx + j * 56;
    stand(actor(s), x);
    label(g, name, center(x, 16, name), top + 20, 'bone');
  });
  const wx = rx + refs.length * 56 + 8;
  for (let f = 0; f < 4; f++) stand(paint(o.spec, { label: '', view: 'side', anim: 'walk', f }), wx + f * 24);
  label(g, 'WALK CYCLE', center(wx, 3 * 24 + 16, 'WALK CYCLE'), top + 20, 'bone');
  c.setAttribute('data-snap', `kguard-${o.slug}`);
  c.setAttribute('aria-label', `Kamchatka guard, ${o.name}: down, up, side, walk, ${o.melee ? 'wind up, swing' : 'aim, fire'}, hurt, and the frames at real size on snow next to the soldier and Hopper`);
  return c;
}
