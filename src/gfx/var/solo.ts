// The five highways of solo-variations.html: how the Hellfire solo looks as a retro Guitar Hero. Each draws its notes, targets
// and floaters on the same frame (solo_kit.ts), so only the layout and the inputs change. draw(phase) scrolls the notes four
// pixels a step; the image on the sheet is phase 0. The card puts the frame at 2x beside how it plays and the pieces at 3x.
import type { Ctx } from '../canvas.ts';
import { drawText } from '../font.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import type { Made } from './ch4_page.ts';
import { cardCanvas, label, zoom } from './kit.ts';
import { BLUE, EX, EY, GOLD, GREEN, HUD, RED, SH, SW, arrow, backdrop, gem, ring, target } from './solo_kit.ts';
import { NECK_B, NECK_T, STRUM, neckBed, neckFrets, neckX, strumLine } from '../../solo/neck.ts';
import type { Lane } from './solo_kit.ts';

interface Text { s: string; x: number; y: number; c: ColorName }
export interface SoloOpt {
  slug: string;
  name: string;
  note: string;
  /** Draws the highway on the frame and returns the words to print over it. */
  highway(p: Px, scroll: number): Text[];
  /** How it plays, in the game's font, a line each. */
  how: string[];
  pieces(): Px[];
}

const NAT20: Text = { s: 'NAT 20', x: 150, y: 28, c: 'yellow' };
const loop = (t: number, s: number, span: number): number => ((t - s) % span + span) % span;

// ---------------------------------------------------------------- 1. Fretboard
const FRET: SoloOpt = {
  slug: 'fretboard', name: 'Fretboard',
  note: 'Three lanes down the right edge of the field, notes falling to a strum bar. Attack, Special and Crit are the three lanes, in the HUD\'s own colors. The closest to Guitar Hero, and the field stays clear.',
  how: ['THREE LANES, NOTES FALL', 'RED ATTACK, BLUE SPECIAL,', 'GOLD CRIT', '', 'KEYS   Z  X  SPACE', 'PAD    A  X  Y', 'TOUCH  A  B  D20'],
  pieces: () => [gem(RED), gem(BLUE), gem(GOLD), target(RED, true), target(BLUE)],
  highway(p, s) {
    const x0 = 206, y0 = HUD + 4, sy = 196, lanes = [RED, BLUE, GOLD];
    p.rect(x0, y0, 44, 194, 'ink').frame(x0 - 1, y0 - 1, 46, 196, 'shadow');
    for (let y = sy - 16 + (s % 16); y > y0; y -= 16) p.rect(x0, y, 44, 1, 'grey1');
    for (const x of [x0 + 14, x0 + 29]) p.rect(x, y0, 1, 194, 'shadow');
    lanes.forEach((l, i) => p.blit(target(l, i === 0), x0 + 1 + i * 15, sy - 5));
    const chart: [number, number][] = [[1, 30], [0, 52], [2, 76], [0, 98], [1, 120], [2, 136], [0, 158], [1, 174]];
    for (const [ln, t] of chart) {
      const y = sy - loop(t, s, 176);
      if (y > y0 + 4 && y < sy - 8) p.blit(gem(lanes[ln] as Lane), x0 + 2 + ln * 15, y - 4);
    }
    return [{ s: 'HIT', x: 186, y: 192, c: 'cream' }, { s: 'x12', x: 214, y: 206, c: 'amber' }, NAT20];
  },
};

// ---------------------------------------------------------------- 2. The neck
// The picked layout. Its geometry and its parts are the game's own (src/solo/neck.ts); the sheet scrolls the frets by a phase.
const nx = neckX;
const NECK: SoloOpt = {
  slug: 'neck', name: 'The neck',
  note: 'The highway is the neck of his Flying V, coming out from under him toward you in perspective: wood, fret wires, inlay dots. Notes grow as they come. Three lanes on Attack, Special and Crit.',
  how: ['THREE LANES ON THE NECK OF', 'HIS FLYING V, COMING AT YOU', '', 'KEYS   Z  X  SPACE', 'PAD    A  X  Y', 'TOUCH  A  B  D20'],
  pieces: () => [gem(RED, 'small'), gem(RED, 'mid'), gem(RED), target(GOLD, true)],
  highway(p, s) {
    neckBed(p);
    neckFrets(p, Array.from({ length: 9 }, (_, k) => ({ y: NECK_T + (((k + (s % 16) / 16) / 9) ** 1.7) * (NECK_B - NECK_T), dot: k % 2 === 1 })));
    strumLine(p);
    const lanes = [RED, BLUE, GOLD];
    lanes.forEach((l, i) => { const x = nx(STRUM, (i + 0.5) / 3); p.blit(target(l, i === 2), Math.round(x) - 7, STRUM - 5); });
    const chart: [number, number][] = [[0, 0.12], [2, 0.3], [1, 0.48], [0, 0.66], [1, 0.84]];
    for (const [ln, t] of chart) {
      const z = loop(t, (s % 16) / 64, 1), y = NECK_T + z ** 1.7 * (STRUM - 8 - NECK_T);
      const g = gem(lanes[ln] as Lane, z < 0.35 ? 'small' : z < 0.7 ? 'mid' : 'big');
      p.blit(g, Math.round(nx(y, (ln + 0.5) / 3) - g.w / 2), Math.round(y - g.h / 2));
    }
    return [{ s: 'HIT', x: 178, y: 186, c: 'cream' }, { s: 'x12', x: 40, y: 206, c: 'amber' }, NAT20];
  },
};

// ---------------------------------------------------------------- 3. Tab strip
const TAB: SoloOpt = {
  slug: 'tab', name: 'Tab strip',
  note: 'One lane right under the HUD, notes scrolling left into a target, like a guitar tab. Attack only, and long notes are held. The smallest of the five, and the easiest on a phone.',
  how: ['ONE LANE, ATTACK ONLY', 'LONG NOTES ARE HELD', '', 'KEYS   Z', 'PAD    A', 'TOUCH  A'],
  pieces: () => [gem(RED), target(RED, true), target(RED)],
  highway(p, s) {
    const y0 = HUD + 3, h = 15, tx = 12;
    p.rect(4, y0, 248, h, 'ink').frame(3, y0 - 1, 250, h + 2, 'shadow');
    for (let x = tx + 8 + 16 - (s % 16); x < 250; x += 16) p.rect(x, y0 + 1, 1, h - 2, 'night');
    p.rect(tx + 8, y0 + 7, 238, 1, 'grey2');
    p.blit(target(RED, true), tx, y0 + 2);
    const chart: [number, number][] = [[24, 0], [48, 0], [64, 26], [112, 0], [136, 0], [160, 40], [216, 0]];
    for (const [t, hold] of chart) {
      const x = tx + 1 + loop(t, s, 240);
      if (hold) p.rect(x + 8, y0 + 6, Math.min(hold, 248 - x - 8), 3, 'blood1').rect(x + 8, y0 + 6, Math.min(hold, 248 - x - 8), 1, 'red');
      if (x > tx + 10 && x < 240) p.blit(gem(RED), x, y0 + 3);
    }
    return [{ s: 'HIT', x: 8, y: y0 + h + 4, c: 'cream' }, { s: 'x12', x: 30, y: y0 + h + 4, c: 'amber' }, { ...NAT20, y: 48 }];
  },
};

// ---------------------------------------------------------------- 4. Arrows
const ARROWS: SoloOpt = {
  slug: 'arrows', name: 'Arrows',
  note: 'Four lanes up the left edge, arrows rising to the receptors, like a dance game. Eddie is planted while he plays, so the arrows and the D-pad are free to be the lanes. Four inputs, and they are the same on keys, pad and touch.',
  how: ['FOUR LANES, ARROWS RISE', 'HE IS PLANTED, SO THE', 'D-PAD IS FREE', '', 'KEYS   THE ARROWS', 'PAD    THE D-PAD', 'TOUCH  THE D-PAD'],
  pieces: () => [arrow('left', RED), arrow('down', BLUE), arrow('up', GREEN), arrow('right', GOLD), arrow('up', null)],
  highway(p, s) {
    const x0 = 4, y0 = HUD + 4, ry = HUD + 8;
    const dirs = ['left', 'down', 'up', 'right'] as const, lanes = [RED, BLUE, GREEN, GOLD];
    p.rect(x0, y0, 56, 194, 'ink').frame(x0 - 1, y0 - 1, 58, 196, 'shadow');
    dirs.forEach((d, i) => {
      const r = arrow(d, i === 2 ? GREEN : null);
      p.blit(r, x0 + 2 + i * 13, ry);
      if (i === 2) ring(p, x0 + 7 + i * 13, ry + 5, 8, 'leaf', 2);
    });
    const chart: [number, number][] = [[0, 30], [3, 52], [1, 70], [2, 92], [0, 110], [1, 128], [3, 128], [2, 156], [0, 176]];
    for (const [ln, t] of chart) {
      const y = ry + loop(t, s, 180);
      if (y > ry + 12 && y < y0 + 182) p.blit(arrow(dirs[ln]!, lanes[ln]!), x0 + 2 + ln * 13, y);
    }
    return [{ s: 'HIT', x: 64, y: ry + 2, c: 'cream' }, { s: 'x12', x: 64, y: ry + 12, c: 'amber' }, NAT20];
  },
};

// ---------------------------------------------------------------- 5. Amp ring
const SPOKES = 8;
const RING: SoloOpt = {
  slug: 'ring', name: 'Amp ring',
  note: 'No panel at all: the sound ring round Eddie is the strum line, and notes ride in toward it from every side. One button. A hit sends the ring out along that spoke, into the bats on that side, so the rhythm is the aim.',
  how: ['ONE BUTTON, NOTES COME IN', 'FROM EVERY SIDE TO THE', 'RING. A HIT SENDS THE', 'RING OUT THAT WAY', '', 'KEYS   Z', 'PAD    A', 'TOUCH  A'],
  pieces: () => [gem(GOLD), gem(GOLD, 'mid')],
  highway(p, s) {
    for (let k = 0; k < SPOKES; k++) {
      const a = (k / SPOKES) * Math.PI * 2;
      for (let r = 36; r < 104; r += 4) p.set(Math.round(EX + Math.cos(a) * r), Math.round(EY + Math.sin(a) * r), 'shadow');
    }
    ring(p, EX, EY, 30, 'cream');
    ring(p, EX, EY, 31, 'amber');
    for (let i = -6; i <= 6; i++) {
      const a = (i / 6) * 0.38;
      for (const r of [40, 41]) p.set(Math.round(EX + Math.cos(a) * r), Math.round(EY + Math.sin(a) * r), r === 40 ? 'white' : 'cream');
    }
    const chart: [number, number][] = [[2, 50], [5, 70], [3, 88], [7, 60], [6, 96], [1, 78], [4, 46]];
    for (const [k, t] of chart) {
      const r = 34 + loop(t - 34, (s % 16) * 4, 72), a = (k / SPOKES) * Math.PI * 2, g = gem(GOLD, r > 70 ? 'mid' : 'big');
      p.blit(g, Math.round(EX + Math.cos(a) * r - g.w / 2), Math.round(EY + Math.sin(a) * r - g.h / 2));
    }
    return [{ s: 'HIT', x: EX + 44, y: EY - 4, c: 'cream' }, { s: 'x12', x: EX - 12, y: EY + 38, c: 'amber' }, NAT20];
  },
};

export const SOLO_OPTS: SoloOpt[] = [FRET, NECK, TAB, ARROWS, RING];

const FK = 2, PAD = 8, SIDE = 216;
export const SOLO_W = PAD + SW * FK + 12 + SIDE + PAD;
export const SOLO_H = PAD + SH * FK + PAD;

/** The frame with the highway and its words, at 1x on its own canvas. */
function frameCanvas(o: SoloOpt, scroll: number): HTMLCanvasElement {
  const p = backdrop();
  const texts = o.highway(p, scroll);
  const c = p.toCanvas(), g = c.getContext('2d') as Ctx;
  drawText(g, 'EDDIE', 6, 6, 'cream');
  drawText(g, 'LV7', 40, 6, 'amber');
  drawText(g, 'HELLFIRE SOLO', 250, 6, 'hot', { align: 'right' });
  for (const t of texts) drawText(g, t.s, t.x, t.y, t.c, { shadow: true });
  return c;
}

export function soloCard(o: SoloOpt): Made {
  const { c, g } = cardCanvas(SOLO_W, SOLO_H, 'night');
  const sx = PAD + SW * FK + 12;
  const draw = (phase: number): void => {
    g.imageSmoothingEnabled = false;
    g.drawImage(frameCanvas(o, phase * 4), PAD, PAD, SW * FK, SH * FK);
  };
  draw(0);
  label(g, 'HOW IT PLAYS', sx, PAD + 4, 'mist');
  o.how.forEach((line, i) => label(g, line, sx, PAD + 22 + i * 12, 'bone'));
  const py = PAD + 22 + o.how.length * 12 + 18;
  label(g, 'THE PIECES AT 3X', sx, py, 'mist');
  let x = sx;
  for (const piece of o.pieces()) { zoom(g, piece, x, py + 14, 3); x += piece.w * 3 + 6; }
  c.setAttribute('data-snap', `solo-${o.slug}`);
  c.setAttribute('aria-label', `${o.name}: a game frame mid-solo with the note highway, and how it plays`);
  return { canvas: c, draw };
}
