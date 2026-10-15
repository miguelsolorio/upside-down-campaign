// Map variant 1 (board game): the landmark sprites and the small scenery. Each sprite is filled first and then given a
// 1 px black outline, so it reads on the bright green field at 1x. No sprite uses more than five colors besides the outline.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

/** The sprite on a canvas one pixel wider on every side, with a black outline in the margin. */
function framed(src: Px): Px {
  return new Px(src.w + 2, src.h + 2).blit(src, 1, 1).outline('black');
}

/** One conifer: three tiers, lit on the left, dark on the right, a stub of trunk. 13 by 17 with its outline. */
export function pine(): Px {
  const p = new Px(11, 15);
  const widths = [[1, 3, 5, 7], [3, 5, 7, 9], [5, 7, 9, 11]];
  widths.forEach((ws, t) => ws.forEach((w, i) => {
    const half = w >> 1, y = t * 4 + i;
    for (let k = 0; k < w; k++) {
      const rel = k - half;
      let c: ColorName = rel < 0 ? 'pine2' : rel === 0 ? 'pine1' : 'pine0';
      if (i === 3) c = rel < -2 ? 'pine1' : 'pine0';
      p.set(5 - half + k, y, c);
    }
  }));
  p.rect(4, 12, 3, 3, 'soil1');
  return framed(p);
}

/** A round bush: dark body, a lit top left. 13 by 8 with its outline. */
export function bush(): Px {
  const p = new Px(11, 6);
  p.ellipse(5.5, 3.6, 5.5, 3, 'pine1');
  p.ellipse(5, 3, 4, 2, 'pine2');
  p.set(3, 1, 'leaf').set(4, 1, 'leaf').set(2, 2, 'leaf');
  p.rect(2, 5, 8, 1, 'pine0');
  return framed(p);
}

/** A boulder, for the corners of the field. */
export function rock(): Px {
  const p = new Px(8, 5);
  p.ellipse(4, 3, 4, 2.4, 'grey2').rect(1, 1, 3, 1, 'grey3').set(2, 2, 'grey3').rect(3, 4, 5, 1, 'grey1');
  return framed(p);
}

/** Hawkins Lab: a grey block with a hazard stripe, a row of lit windows and a door, a radio dish on the right of the roof and
 * a mast on the left. Three greys and one cyan. 32 by 31 with its outline. */
export function lab(): Px {
  const p = new Px(30, 29);
  // The dish: a bowl with a feed rod and a lit tip, on a stand.
  p.art([
    '....c....',
    '....g....',
    '....g....',
    'bbbbbbbbb',
    '.bbbbbbb.',
    '..ggggg..',
    '....g....',
    '...ggg...',
  ], { c: 'cyan', g: 'grey2', b: 'grey3' }, 19, 0);
  p.rect(17, 8, 13, 2, 'grey1');
  // The mast.
  p.rect(4, 1, 2, 9, 'grey2').set(4, 0, 'cyan').set(5, 0, 'cyan');
  // The block: light roof, hazard stripe, grey wall, shaded right edge and foot.
  p.rect(0, 10, 30, 19, 'grey2');
  p.rect(0, 10, 30, 5, 'grey3');
  for (let x = 0; x < 30; x++) p.set(x, 15, x % 4 < 2 ? 'grey1' : 'grey3');
  p.rect(26, 16, 4, 13, 'grey1').rect(0, 27, 30, 2, 'grey1');
  // Windows, lit.
  for (const wx of [3, 8, 18, 22]) p.rect(wx, 18, 4, 3, 'cyan');
  // The door.
  p.rect(12, 21, 6, 8, 'grey1').rect(13, 22, 4, 7, 'grey2');
  return framed(p);
}

/** The middle school: brick wings, a flat slate roof, and a tall bell tower with a bell in its arch and a red pyramid roof.
 * Red, a darker red, bone, slate and sky. 46 by 32 with its outline. */
export function school(): Px {
  const p = new Px(44, 30);
  // Wings and hall.
  p.rect(0, 14, 44, 3, 'grey1');
  p.rect(0, 17, 44, 13, 'red').rect(0, 28, 44, 2, 'blood1').rect(40, 17, 4, 11, 'blood1');
  for (let x = 1; x < 43; x += 4) p.set(x, 17, 'blood1');
  for (const wx of [2, 7, 12, 29, 34]) p.rect(wx, 20, 3, 5, 'sky');
  // Tower: bone shaft with an arch and the bell.
  p.rect(17, 4, 10, 18, 'bone').rect(26, 4, 1, 18, 'grey1');
  p.rect(20, 7, 4, 7, 'black').rect(21, 6, 2, 1, 'black').rect(21, 10, 2, 3, 'bone');
  p.rect(17, 14, 10, 1, 'grey1').rect(16, 15, 12, 1, 'bone');
  // Roof, a pyramid with a ball on top.
  const roof = [[21, 2], [20, 4], [19, 6], [18, 8], [17, 10]];
  roof.forEach(([x, w], i) => {
    p.rect(x, i, w, 1, 'red');
    p.rect(x + (w >> 1), i, w - (w >> 1), 1, 'blood1');
  });
  p.rect(21, 0, 2, 1, 'bone');
  // Door and steps.
  p.rect(19, 22, 6, 8, 'grey1').rect(21, 24, 2, 6, 'blood1');
  p.rect(17, 28, 10, 2, 'grey1');
  // A flag on the left wing.
  p.rect(2, 6, 1, 8, 'bone').rect(3, 6, 4, 3, 'red');
  return framed(p);
}

/** A big jack-o'-lantern with its carved face and stem. Orange, red, amber and green. 28 by 24 with its outline. */
export function pumpkin(): Px {
  const p = new Px(26, 22);
  p.ellipse(13, 13, 13, 9, 'red');
  p.ellipse(12.5, 12.5, 12, 8.5, 'orange');
  // Ribs, above and below the face.
  for (const rx of [6, 10, 16, 20]) for (let y = 5; y < 21; y++) if ((y < 8 || y > 17) && p.get(rx, y)) p.set(rx, y, 'red');
  p.rect(4, 7, 3, 2, 'amber').set(7, 6, 'amber').rect(5, 9, 1, 2, 'amber');
  // Face: two eyes, a nose and a jagged grin.
  p.art(['..#..', '.###.', '#####'], { '#': 'black' }, 5, 9);
  p.art(['..#..', '.###.', '#####'], { '#': 'black' }, 16, 9);
  p.art(['..#..', '.###.'], { '#': 'black' }, 11, 13);
  p.art(['#.##.##.##.#', '.#..#..#..#.', '..#.##.##.#..'], { '#': 'black' }, 7, 16);
  // Stem and curl.
  p.rect(11, 1, 4, 4, 'pine1').set(15, 1, 'pine1').set(16, 0, 'pine1').set(17, 0, 'pine1').set(18, 1, 'pine1');
  return framed(p);
}

/** A small pumpkin for beside the big one. 10 by 9 with its outline. */
export function gourd(): Px {
  const p = new Px(8, 7);
  p.ellipse(4, 4, 4, 3, 'orange').rect(1, 2, 2, 1, 'amber').rect(3, 1, 2, 1, 'pine1').set(3, 0, 'pine1');
  for (let y = 2; y < 7; y++) p.set(4, y, 'red');
  p.rect(2, 6, 5, 1, 'red');
  return framed(p);
}

/** A hole in the ground, a dirt rim and purple vines creeping out. 34 by 28 with its outline. */
export function hole(): Px {
  const p = new Px(32, 26);
  p.ellipse(16, 14, 15, 11, 'soil2');
  p.rect(5, 6, 4, 1, 'soil3').rect(8, 4, 5, 1, 'soil3').rect(4, 8, 2, 2, 'soil3');
  p.ellipse(16, 14.5, 11, 7, 'black');
  // Vines that climb the rim, thick and purple.
  const vines: [number, number][][] = [
    [[6, 12], [4, 10], [3, 7], [5, 5], [4, 2]],
    [[26, 11], [28, 9], [27, 6], [29, 4], [28, 1]],
    [[12, 20], [10, 22], [11, 24], [8, 25]],
    [[22, 20], [24, 22], [23, 24], [26, 25]],
  ];
  for (const v of vines) {
    for (let i = 1; i < v.length; i++) {
      const [x0, y0] = v[i - 1] as [number, number], [x1, y1] = v[i] as [number, number];
      p.line(x0, y0, x1, y1, 'purple0').line(x0 + 1, y0, x1 + 1, y1, 'purple');
    }
  }
  return framed(p);
}

/** A tear in the world: a tall red rift with a black core. 16 by 46 with its outline. */
export function rift(): Px {
  const p = new Px(14, 44);
  for (let y = 0; y < 44; y++) {
    const t = y / 43, hw = Math.round(0.5 + 5.4 * Math.sin(Math.PI * t));
    const tri = Math.abs(((y + 3) % 12) - 6);
    const cx = 7 + tri - 3;
    for (let dx = -hw; dx <= hw; dx++) {
      const a = Math.abs(dx);
      p.set(cx + dx, y, a === hw ? 'hot' : a === hw - 1 ? 'red' : a === hw - 2 ? 'blood1' : 'black');
    }
  }
  for (const [x, y] of [[1, 8], [12, 14], [0, 30], [13, 26], [12, 38], [2, 40]]) p.set(x, y, 'hot');
  return framed(p);
}

/** A pond: blue water with white ripple marks and a lit bank. 36 by 20 with its outline. */
export function pond(): Px {
  const p = new Px(34, 18);
  p.ellipse(17, 9, 17, 9, 'soil3');
  p.ellipse(17, 9.5, 16, 8, 'blue');
  p.ellipse(16, 8.5, 14, 6, 'sky');
  p.ellipse(17, 10, 12, 5, 'blue');
  for (const [x, y, w] of [[8, 6, 5], [20, 5, 6], [14, 10, 6], [24, 11, 4], [9, 12, 3]]) p.rect(x as number, y as number, w as number, 1, 'white');
  p.rect(6, 15, 3, 1, 'pine1').set(7, 14, 'pine1').set(27, 3, 'pine1').set(28, 2, 'pine1');
  return framed(p);
}
