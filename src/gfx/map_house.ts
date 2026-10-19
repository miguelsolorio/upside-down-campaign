// The map's Creel House (docs/map-screen.md, "Chapter four on the map"): the dark Victorian house on its hill at the edge of Hawkins, above the
// horizon in the top right of the town, behind its fence, with a dead tree beside it and one window lit. One bold shape in code like the others
// (map_art.ts, map_mall.ts): a steep gabled roof over a body of dark blue-grey, a turret with a conical roof on its left, a porch, a wrought
// iron fence along the brow of the hill, a mound of dark grass for the hill itself, and the lit window's amber with a little of it thrown out
// onto the grass. It stands in a day sky, so the house is the darkest thing on the map; the locked look greys it like every landmark. Pure pixel work.
import { Px } from './px.ts';

export const HOUSE_W = 46, HOUSE_H = 24;

/** The hill: a mound of dark grass across the foot of the picture, lit along its crest, with a darker band where it meets the ground. */
function hill(p: Px): void {
  for (let y = 16; y < HOUSE_H; y++) {
    const half = Math.round(23 * Math.sqrt(Math.max(0, 1 - ((HOUSE_H + 8 - 1 - y) / 15) ** 2)));
    if (half < 1) continue;
    p.rect(23 - half, y, half * 2, 1, y === 16 ? 'pine3' : y < 19 ? 'pine2' : y < 21 ? 'pine1' : 'pine0');
    if (y < 19) p.set(23 - half, y, 'leaf');
  }
  for (const [x, y] of [[9, 20], [15, 19], [30, 19], [36, 20], [12, 22], [33, 22], [22, 21]] as const) p.set(x, y, y < 21 ? 'pine2' : 'pine1');
}

/** The dead tree on the right of the house: a split trunk, bare branches, a few twigs. */
function tree(p: Px): void {
  p.rect(38, 12, 2, 7, 'soil1').rect(38, 12, 1, 7, 'soil2').rect(37, 18, 4, 1, 'soil1');
  p.line(38, 13, 35, 9, 'soil1').line(35, 9, 34, 6, 'soil1').line(35, 9, 37, 7, 'soil1').line(39, 12, 42, 8, 'soil1').line(42, 8, 43, 5, 'soil1').line(42, 8, 44, 9, 'soil1').line(39, 15, 42, 14, 'soil1');
}

/** The house: a turret on the left with a cone for a roof and the one lit window, a body under a steep gable, two dark windows and the door under its porch. */
function house(p: Px): void {
  // The turret.
  p.rect(9, 8, 6, 11, 'shadow').rect(9, 8, 1, 11, 'dusk').rect(14, 8, 1, 11, 'night');
  for (let i = 0; i < 5; i++) p.rect(11 - i, 2 + i, 2 + i * 2, 1, 'dusk').set(11 - i, 2 + i, 'slate').set(12 + i, 2 + i, 'night');
  p.rect(7, 7, 10, 1, 'night').rect(7, 7, 1, 1, 'dusk').rect(11, 0, 2, 3, 'night').set(11, 0, 'slate');
  p.rect(10, 10, 4, 5, 'black').rect(11, 11, 2, 3, 'amber').rect(11, 11, 2, 1, 'yellow').set(11, 12, 'yellow');
  p.rect(10, 15, 4, 1, 'dusk');
  // The body and its gable.
  p.rect(15, 11, 17, 8, 'shadow').rect(15, 11, 17, 1, 'dusk').rect(31, 11, 1, 8, 'night');
  for (let i = 0; i < 6; i++) p.rect(23 - 1 - i * 2, 4 + i, 2 + i * 4, 1, 'dusk').set(22 - i * 2, 4 + i, 'slate').set(23 + i * 2, 4 + i, 'night');
  p.rect(22, 3, 2, 1, 'night').set(22, 3, 'slate').rect(14, 10, 19, 1, 'night');
  p.rect(29, 5, 2, 5, 'night').rect(29, 5, 2, 1, 'slate').rect(29, 5, 1, 5, 'dusk');
  // The dark windows, the porch and the door.
  for (const x of [17, 28]) p.rect(x, 13, 2, 3, 'black').rect(x, 13, 2, 1, 'slate').rect(x, 16, 2, 1, 'dusk');
  p.rect(20, 14, 7, 1, 'night').rect(20, 14, 7, 1, 'dusk').rect(21, 15, 1, 4, 'dusk').rect(25, 15, 1, 4, 'night');
  p.rect(22, 15, 3, 4, 'ink').rect(23, 16, 1, 3, 'night');
}

/** The fence along the brow of the hill: iron pickets with a rail, a gap for the gate. */
function fence(p: Px): void {
  for (let x = 5; x < 41; x++) {
    if (x >= 21 && x <= 25) continue;
    if ((x & 1) === 1) p.rect(x, 18, 1, 4, 'ink').set(x, 17, 'slate');
  }
  p.rect(5, 19, 16, 1, 'ink').rect(26, 19, 15, 1, 'ink');
  p.rect(20, 17, 1, 5, 'ink').rect(26, 17, 1, 5, 'ink').set(20, 16, 'slate').set(26, 16, 'slate');
}

/** The Creel House on its hill, 48 by 26 with its outline's margin, its base on the bottom row. */
export function creelHouse(): Px {
  const ground = new Px(HOUSE_W, HOUSE_H), up = new Px(HOUSE_W, HOUSE_H);
  hill(ground);
  fence(ground);
  tree(up);
  house(up);
  const out = new Px(HOUSE_W + 2, HOUSE_H + 2).blit(ground, 1, 1);
  return out.blit(new Px(HOUSE_W + 2, HOUSE_H + 2).blit(up, 1, 1).outline('ink'), 0, 0);
}
