// Map variant 2 (Mike's campaign map): the doodles. Everything is ink line art in the dark browns on cream paper: a 1 px
// outline in soil0, hatching in soil2, pencil in soil3. Only the die and the pen marks carry red.
import { hash2 } from '../canvas.ts';
import { Px } from '../px.ts';

const INK = 'soil0', MID = 'soil1', HATCH = 'soil2', PENCIL = 'soil3', PAPER = 'cream';

/** The sprite on a canvas one pixel wider on every side, with an ink outline in the margin. */
function framed(src: Px): Px {
  return new Px(src.w + 2, src.h + 2).blit(src, 1, 1).outline(INK);
}

/** Hatching: every other pixel of a box, on the diagonal. */
function hatch(p: Px, x: number, y: number, w: number, h: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (((i + j) & 1) === 0 && p.get(i, j)) p.set(i, j, HATCH);
}

/** A sketched conifer: three tiers, hatched on the right. 11 by 13 with its outline. */
export function pine(): Px {
  const p = new Px(9, 11);
  [[1, 3, 5], [3, 5, 7], [5, 7, 9]].forEach((ws, t) => ws.forEach((w, i) => {
    const y = t * 3 + i, half = w >> 1;
    for (let k = 0; k < w; k++) p.set(4 - half + k, y, k - half > 0 && ((k + y) & 1) === 0 ? HATCH : PAPER);
  }));
  p.rect(3, 9, 3, 2, MID);
  return framed(p);
}

/** A grove of pines, back row first, as one sprite. */
export function woods(): Px {
  const g = new Px(30, 50);
  const tree = pine();
  const at: [number, number][] = [[0, 0], [11, 2], [5, 11], [16, 14], [0, 22], [11, 25], [18, 33], [1, 34], [10, 37]];
  for (const [x, y] of at) g.blit(tree, x, y);
  return g;
}

/** Hawkins Lab: a tall block with a low wing, a mast and a dish on the roof. 36 by 28 with its outline. */
export function lab(): Px {
  const p = new Px(34, 26);
  // Mast with cross bars, on the left of the tall block.
  p.rect(11, 0, 1, 8, MID).rect(9, 2, 5, 1, MID).rect(10, 4, 3, 1, MID).set(11, 0, INK);
  // Dish on a stand, on the right of the roof.
  p.art(['k..k..k', 'kk.k.kk', '.kkkkk.'], { k: INK }, 21, 1).rect(24, 4, 1, 3, MID);
  // Tall block and low wing.
  p.rect(7, 7, 22, 18, PAPER).frame(7, 7, 22, 18, INK);
  p.rect(0, 14, 8, 11, PAPER).frame(0, 14, 8, 11, INK);
  p.rect(7, 7, 22, 2, INK);
  hatch(p, 24, 9, 4, 15);
  for (const wx of [10, 15, 19]) p.rect(wx, 11, 3, 3, MID).set(wx + 1, 12, PAPER);
  p.rect(2, 17, 3, 3, MID).set(3, 18, PAPER);
  p.rect(13, 18, 5, 7, INK).rect(14, 19, 3, 6, MID);
  // A fence of posts along the front.
  for (let x = 1; x < 33; x += 3) p.set(x, 25, HATCH);
  return framed(p);
}

/** The middle school: a hall with wings and a bell tower. 38 by 30 with its outline. */
export function school(): Px {
  const p = new Px(36, 28);
  // Tower with a steep roof, a bell and a flag.
  p.rect(14, 8, 8, 8, PAPER).frame(14, 8, 8, 8, INK);
  for (let i = 0; i < 4; i++) {
    p.rect(17 - i, 3 + i, 2 + 2 * i, 1, PAPER).set(17 - i, 3 + i, INK).set(18 + i, 3 + i, INK);
  }
  p.rect(14, 7, 8, 1, INK).rect(17, 3, 2, 1, INK);
  p.rect(17, 0, 1, 3, INK).set(18, 0, MID).set(19, 0, MID);
  p.rect(17, 10, 2, 3, INK).set(18, 12, HATCH);
  hatch(p, 19, 9, 2, 6);
  // Hall and wings.
  p.rect(6, 15, 24, 13, PAPER).frame(6, 15, 24, 13, INK);
  p.rect(0, 18, 7, 10, PAPER).frame(0, 18, 7, 10, INK);
  p.rect(29, 18, 7, 10, PAPER).frame(29, 18, 7, 10, INK);
  p.rect(6, 15, 24, 2, INK);
  hatch(p, 26, 17, 4, 11);
  hatch(p, 32, 20, 3, 7);
  for (const wx of [9, 13, 21]) p.rect(wx, 19, 3, 3, MID).set(wx + 1, 20, PAPER);
  for (const wx of [2, 31]) p.rect(wx, 21, 3, 3, MID).set(wx + 1, 22, PAPER);
  p.rect(16, 21, 4, 7, INK).rect(17, 22, 2, 6, MID);
  return framed(p);
}

/** One sketched pumpkin: a ball with ribs, a stem and a curl of vine. */
function gourd(r: number, face: boolean): Px {
  const w = r * 2 + 1, p = new Px(w + 3, r * 2 + 4);
  const cx = r + 0.5, cy = r + 2.5;
  p.ellipse(cx, cy, r + 0.5, r, PAPER);
  for (let y = 0; y < p.h; y++) for (let x = Math.floor(cx + 1); x < p.w; x++) if (p.get(x, y) && ((x + y) & 1) === 0) p.set(x, y, HATCH);
  const rx = Math.floor(r * 0.55);
  for (let y = 2; y < r * 2 + 2; y++) {
    if (p.get(Math.floor(cx) - rx, y)) p.set(Math.floor(cx) - rx, y, PENCIL);
    if (p.get(Math.floor(cx) + rx, y)) p.set(Math.floor(cx) + rx, y, PENCIL);
  }
  p.rect(Math.floor(cx) - 1, 0, 2, 3, MID).set(Math.floor(cx) + 1, 0, MID);
  if (face) {
    const fx = Math.floor(cx) - 3, fy = Math.floor(cy) - 2;
    p.art(['.k...k.', 'kkk.kkk'], { k: INK }, fx, fy);
    p.art(['k.k.k.k.k'], { k: INK }, fx - 1, fy + 5);
  }
  return framed(p);
}

/** A pumpkin patch: three pumpkins on a vine. 40 by 26. */
export function patch(): Px {
  const g = new Px(40, 26);
  g.blit(gourd(8, true), 12, 4);
  g.blit(gourd(5, false), 0, 12);
  g.blit(gourd(4, false), 30, 14);
  // The vine runs along the ground between them, with a leaf.
  g.line(10, 24, 14, 25, HATCH).line(14, 25, 28, 25, HATCH).line(28, 25, 32, 24, HATCH);
  g.set(21, 24, HATCH).set(22, 23, PENCIL).set(23, 24, PENCIL);
  return g;
}

/** An arcade cabinet: a marquee, a screen with a little invader, a panel and a joystick. 15 by 24 with its outline. */
export function arcade(): Px {
  const p = new Px(13, 22);
  p.rect(1, 0, 11, 22, PAPER).frame(1, 0, 11, 22, INK);
  p.rect(2, 1, 9, 3, INK).rect(3, 2, 7, 1, PAPER);
  p.rect(3, 5, 7, 7, INK).art(['.k.....k.', '..k...k..', '.kkkkkkk.', 'kk.kkk.kk'], { k: PAPER }, 2, 6);
  p.rect(2, 13, 9, 3, MID).set(4, 14, PAPER).set(6, 14, 'red').set(8, 14, 'red');
  p.set(4, 13, INK).set(4, 12, INK);
  hatch(p, 10, 1, 2, 21);
  p.rect(2, 17, 9, 5, PAPER).rect(4, 19, 5, 3, INK);
  return framed(p);
}

/** A compass rose: four hatched points and a ring, N on top (the letter is drawn by the caller). 21 by 21. */
export function compass(): Px {
  const p = new Px(21, 21);
  const c = 10;
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    p.set(c + Math.round(Math.cos(t) * 5), c + Math.round(Math.sin(t) * 5), PENCIL);
  }
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][]) {
    for (let d = 1; d <= 9; d++) {
      const wd = Math.max(0, Math.floor((10 - d) / 3));
      for (let s = -wd; s <= wd; s++) {
        const x = c + dx * d + (dx === 0 ? s : 0), y = c + dy * d + (dy === 0 ? s : 0);
        const edge = Math.abs(s) === wd || d === 9;
        p.set(x, y, edge ? INK : s > 0 || (dx === 0 && s === 0 && dy < 0) ? HATCH : PAPER);
      }
    }
  }
  p.set(c, c, INK);
  return p;
}

/** The ink blot of the Upside Down: a stain with a dithered rim and a few veins. The gate's has a red tear. */
export function stain(kind: 'tunnels' | 'gate'): Px {
  const w = kind === 'gate' ? 40 : 46, h = kind === 'gate' ? 40 : 34;
  const p = new Px(w, h), cx = w / 2, cy = h / 2, seed = kind === 'gate' ? 11 : 5;
  // The rim first, as a dither, then the blot over it.
  p.ellipse(cx, cy, w / 2, h / 2, MID);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p.get(x, y) && ((x + y) & 1)) p.set(x, y, 0);
  const lobes = kind === 'gate'
    ? [[20, 20, 12, 15], [13, 13, 7, 6], [28, 28, 8, 7], [29, 12, 6, 7], [12, 29, 6, 6]]
    : [[23, 17, 15, 9], [10, 14, 8, 6], [35, 20, 9, 7], [20, 27, 8, 5], [31, 9, 7, 5]];
  for (const [x, y, rx, ry] of lobes as number[][]) p.ellipse(x as number, y as number, rx as number, ry as number, INK);
  // Veins that creep out of the blot across the paper.
  const vein = (x0: number, y0: number, x1: number, y1: number): void => { p.line(x0, y0, x1, y1, INK); p.set(x1, y1 + 1, MID); };
  if (kind === 'tunnels') {
    vein(8, 14, 1, 8); vein(2, 8, 1, 3); vein(38, 21, 45, 25); vein(30, 6, 34, 0); vein(16, 29, 12, 33); vein(25, 31, 29, 33);
    p.ellipse(23, 18, 7, 4, 'black');
    p.rect(17, 16, 3, 1, HATCH).rect(26, 20, 4, 1, HATCH);
  } else {
    vein(10, 12, 3, 5); vein(31, 10, 37, 3); vein(9, 28, 3, 36); vein(31, 29, 37, 35); vein(20, 5, 20, 0); vein(20, 35, 20, 39);
    // The tear: a crack of red light, jagged, from top to bottom.
    for (let y = 6; y < 34; y++) {
      const x = 20 + ((y * 7) % 5) - 2;
      p.set(x, y, y % 5 === 0 ? 'hot' : 'red');
      if (y > 10 && y < 29) p.set(x + 1, y, 'blood1');
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = hash2(i, seed, 3) % w, y = hash2(i, seed, 4) % h;
    if (!p.get(x, y)) continue;
    if (p.get(x - 1, y) === 0 || p.get(x + 1, y) === 0 || p.get(x, y - 1) === 0 || p.get(x, y + 1) === 0) p.set(x, y, 0);
  }
  return p;
}

/** A red d20 in the corner of the table: a hexagon with a lit top facet, an inner triangle and the 20 in cream. 19 by 19 with its outline. */
export function d20(): Px {
  const p = new Px(17, 17);
  const half = [3, 5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 6, 5, 3];
  half.forEach((h, y) => p.rect(8 - h, y, h * 2 + 1, 1, 'red'));
  // The lit facet on the upper left and the dark one on the lower right.
  for (let y = 1; y < 7; y++) for (let x = 3; x < 10 - y / 2; x++) if (p.get(x, y)) p.set(x, y, 'hot');
  for (let y = 11; y < 16; y++) for (let x = 9 + (y - 11); x < 14; x++) if (p.get(x, y)) p.set(x, y, 'blood1');
  // The edges of the inner triangle.
  p.line(8, 2, 2, 12, 'blood1').line(8, 2, 14, 12, 'blood1').line(2, 12, 14, 12, 'blood1');
  p.rect(5, 7, 7, 5, 'red');
  p.art(['###.###', '..#.#.#', '###.#.#', '#...#.#', '###.###'], { '#': 'cream' }, 5, 7);
  return new Px(19, 19).blit(p, 1, 1).outline('ink');
}

/** A strip of tape across a corner. */
export function tape(): Px {
  const p = new Px(14, 7);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 14; x++) {
    const sx = x + y - 3;
    if (sx >= 0 && sx < 11) p.set(x, y, ((x + y) & 1) === 0 ? 'bone' : 'white');
  }
  return p.outline('grey3');
}
