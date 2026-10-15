// The map's chapter 3 landmarks (docs/map-screen.md, "Chapter three on the map"): Starcourt Mall above the horizon, the food court
// locked inside it, and the bunker of the Russian base on the horizon below it. Each is one bold shape drawn in code, like the six in
// map_art.ts, in the Confetti look the owner picked for the mall: dark purple walls, neon trim, a rainbow arc over the door. The base is
// underground but not in the Upside Down, so the bunker keeps its own colors, like the hole in the patch. Pure pixel work.
import { Px } from './px.ts';
import { TINY_GLYPHS } from './data/font.ts';
import { framed } from './map_art.ts';

/** Small caps in the 3 by 5 font, written into a Px. */
function tiny(p: Px, text: string, x: number, y: number, color: Parameters<Px['set']>[2]): void {
  [...text].forEach((ch, i) => {
    const g = TINY_GLYPHS[ch];
    if (g) g.split('/').forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === '#') p.set(x + i * 4 + k, y + j, color); });
  });
}

export const MALL_W = 40, MALL_H = 26;

/**
 * The mall: a long low building with a rainbow arc over its glass doors, a neon band along the roof edge, shop windows either side, a
 * pylon with a star at the east end, and its parking lot, striped, with a few cars.
 */
export function mall(): Px {
  const p = new Px(MALL_W, MALL_H);
  // The lot.
  p.rect(0, 20, MALL_W, 6, 'grey1').rect(0, 20, MALL_W, 1, 'grey2');
  for (let x = 4; x < MALL_W - 2; x += 6) p.rect(x, 22, 1, 3, 'grey3');
  for (const [x, c] of [[5, 'red'], [17, 'cyan'], [29, 'yellow']] as [number, 'red' | 'cyan' | 'yellow'][]) p.rect(x, 22, 4, 3, c).rect(x, 22, 4, 1, 'ink').set(x + 1, 24, 'ink').set(x + 2, 24, 'ink');
  // The building.
  p.rect(0, 6, 34, 14, 'purple0').rect(0, 6, 34, 2, 'purple').rect(0, 7, 34, 1, 'magenta');
  p.rect(0, 18, 34, 2, 'ink');
  for (let x = 1; x < 33; x += 2) p.set(x, 8, 'yellow');
  for (const x of [2, 27]) { p.rect(x, 11, 5, 6, 'ink').rect(x + 1, 12, 3, 4, 'cyan').rect(x + 1, 12, 3, 1, 'white'); }
  // The doors, under a rainbow arc.
  p.ellipse(17, 12, 8.5, 7.5, 'magenta').ellipse(17, 12, 6.5, 5.5, 'yellow').ellipse(17, 12, 4.5, 3.5, 'cyan').ellipse(17, 12, 2.5, 1.5, 'purple0');
  p.rect(8, 12, 18, 8, 'purple0').rect(11, 12, 5, 7, 'ink').rect(18, 12, 5, 7, 'ink').rect(11, 12, 5, 1, 'cyan').rect(18, 12, 5, 1, 'cyan').rect(16, 12, 2, 7, 'bone');
  // The pylon: a pole, and a star on top.
  p.rect(37, 6, 2, 14, 'grey3').rect(37, 6, 1, 14, 'bone');
  p.art(['..y..', '.yyy.', 'yyyyy', '.yyy.', 'y.y.y'], { y: 'yellow' }, 35, 0).set(37, 2, 'cream');
  return framed(p);
}

/** The food court: a big glass dome on the mall's roof with a ring of tables under it and a sign. It is locked until a later stage. */
export function foodCourt(): Px {
  const p = new Px(28, 16);
  p.ellipse(14, 15, 13.5, 14.5, 'cyan').ellipse(14, 15, 12, 13, 'sky').ellipse(14, 15, 10.5, 11.5, 'white');
  p.rect(0, 15, 28, 1, 'ink');
  for (const x of [8, 14, 20]) p.rect(x, 3, 1, 12, 'grey3');
  p.rect(4, 12, 20, 3, 'cyan').rect(4, 12, 20, 1, 'white');
  tiny(p, 'FOOD', 6, 4, 'magenta');
  return framed(p);
}

/**
 * The bunker, half buried at the horizon: a concrete hump with a steel hatch and a red star over it, a rusty vent pipe and an
 * antenna. 22 by 14, its base on the cut of the earth.
 */
export function bunker(): Px {
  const p = new Px(24, 16);
  p.ellipse(12, 15, 11, 9, 'grey2');
  p.ellipse(12, 15, 9.5, 7.5, 'grey3');
  for (let x = 3; x < 22; x += 4) p.rect(x, 7 + Math.floor(Math.abs(x - 12) / 3), 1, 8, 'grey2');
  p.rect(0, 14, 24, 2, 'soil1');
  p.rect(8, 8, 8, 6, 'ink').rect(9, 9, 6, 5, 'grey2').rect(9, 9, 6, 1, 'grey3').rect(11, 10, 2, 3, 'ink');
  p.art(['.r.', 'rrr', '.r.'], { r: 'red' }, 11, 4).set(12, 5, 'hot');
  p.rect(3, 4, 2, 5, 'blood1').rect(3, 3, 3, 1, 'blood0').rect(19, 1, 1, 8, 'grey3').rect(18, 1, 3, 1, 'grey3').set(19, 0, 'red');
  return framed(p);
}
