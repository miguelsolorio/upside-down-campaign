// Map variant 3 (Hawkins at night): the landmarks, seen from above, painted straight into the land. Each takes `lit`:
// a place that is still locked has its lights out, so the windows, floodlights and pumpkins go dark with it.
import { BAYER4, hash2 } from '../canvas.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

const bayer = (x: number, y: number): number => ((BAYER4[((y & 3) * 4) + (x & 3)] as number) + 0.5) / 16;

/** A soft glow: a dithered disc that thins toward the rim. Only touches pixels the filter accepts. */
export function halo(p: Px, cx: number, cy: number, r: number, c: ColorName, strength: number, keep?: (x: number, y: number) => boolean): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r) continue;
    if (strength * (1 - d / r) > bayer(x, y) && (!keep || keep(x, y))) p.set(x, y, c);
  }
}

/** A wedge of light on the ground from a floodlight: a dithered fan that fades with distance. */
export function wedge(p: Px, x0: number, y0: number, ang: number, len: number, half: number, c: ColorName): void {
  for (let y = Math.floor(y0 - len); y <= Math.ceil(y0 + len); y++) for (let x = Math.floor(x0 - len); x <= Math.ceil(x0 + len); x++) {
    const dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy);
    if (d > len || d < 2) continue;
    let da = Math.atan2(dy, dx) - ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > half) continue;
    if (0.8 * (1 - d / len) > bayer(x, y)) p.set(x, y, c);
  }
}

/** A roof seen from above: lit edges on the top and left, a cast shadow on the right and below. */
function roof(p: Px, x: number, y: number, w: number, h: number, fill: ColorName = 'dusk'): void {
  p.rect(x + 2, y + 2, w, h, 'ink');
  p.rect(x, y, w, h, fill);
  p.rect(x, y, w, 1, 'slate').rect(x, y, 1, h, 'slate');
  p.rect(x, y + h - 1, w, 1, 'ink').rect(x + w - 1, y, 1, h, 'ink');
}

/** One treetop: a dark disc with a moonlit rim on the upper left and shade on the lower right. */
function treetop(p: Px, cx: number, cy: number, r: number): void {
  p.disc(cx, cy, r, 'pine0');
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 1 || dx * dx + dy * dy < (r - 1.4) * (r - 1.4)) continue;
    if (dx + dy <= -r * 0.8) p.set(cx + dx, cy + dy, 'pine1');
    else if (dx + dy >= r * 1.1) p.set(cx + dx, cy + dy, 'black');
  }
  p.set(cx - 1, cy - 1, 'pine1');
}

/** Mirkwood: a dense grove of dark pines around a clearing, and the Byers' cabin with its window lit and a string of bulbs. */
export function woods(p: Px, lit: boolean): void {
  const cabin = { x: 72, y: 138 };
  p.ellipse(cabin.x, cabin.y + 1, 17, 14, 'shadow');
  const trees: [number, number, number][] = [];
  for (let gy = 100; gy < 172; gy += 7) for (let gx = 44; gx < 112; gx += 7) {
    const x = gx + (hash2(gx, gy, 1) % 5) - 2, y = gy + (hash2(gx, gy, 2) % 5) - 2;
    const a = (x - 77) / 35, b = (y - 136) / 39;
    const edge = a * a + b * b + ((hash2(x, y, 3) % 100) / 100 - 0.5) * 0.25;
    if (edge > 1 || y < 99 || y > 169) continue;
    if (Math.hypot(x - cabin.x, (y - cabin.y) * 1.1) < 17) continue;
    if (y > 135 && y < 145 && x < 66) continue;
    trees.push([x, y, 4 + (hash2(x, y, 4) % 2)]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of trees) treetop(p, x, y, r);
  // The path in from the road.
  p.rect(37, 139, 28, 2, 'soil1').rect(37, 141, 28, 1, 'soil0');
  // The cabin: a brown roof, a ridge, and the window glowing on its south eave under a string of bulbs.
  p.rect(cabin.x - 4, cabin.y - 3, 13, 9, 'black');
  p.rect(cabin.x - 6, cabin.y - 5, 13, 9, 'soil1');
  p.rect(cabin.x - 6, cabin.y - 5, 13, 1, 'soil0').rect(cabin.x - 6, cabin.y - 1, 13, 1, 'soil0').rect(cabin.x - 6, cabin.y - 5, 1, 9, 'soil0').rect(cabin.x + 6, cabin.y - 5, 1, 9, 'soil0');
  if (lit) {
    halo(p, cabin.x, cabin.y + 7, 9, 'amber', 0.9, (x, y) => y > cabin.y + 3);
    p.rect(cabin.x - 2, cabin.y + 3, 5, 1, 'yellow');
    for (let i = 0; i < 6; i++) p.set(cabin.x - 5 + i * 2, cabin.y + 4, i & 1 ? 'yellow' : 'hot');
  } else {
    p.rect(cabin.x - 2, cabin.y + 3, 5, 1, 'ink');
  }
}

/** Hawkins Lab: a fenced yard, a big flat roof with a radio dish, a low wing, and floodlight towers on the corners. */
export function lab(p: Px, lit: boolean): void {
  const X = 54, Y = 26, W = 60, H = 56;
  p.rect(X, Y, W, H, 'shadow');
  if (lit) {
    for (const [tx, ty, a] of [[X + 2, Y + 2, 0.78], [X + W - 3, Y + 2, 2.36], [X + 2, Y + H - 3, -0.78], [X + W - 3, Y + H - 3, -2.36]] as [number, number, number][]) wedge(p, tx, ty, a, 20, 0.5, 'amber');
  }
  // Fence, a dotted line, with the gate open in the middle of the south side.
  for (let i = 0; i < W; i += 2) { p.set(X + i, Y, 'slate'); if (i < 26 || i > 34) p.set(X + i, Y + H - 1, 'slate'); }
  for (let j = 0; j < H; j += 2) { p.set(X, Y + j, 'slate'); p.set(X + W - 1, Y + j, 'slate'); }
  roof(p, X + 8, Y + 8, 40, 22);
  for (const vx of [X + 13, X + 21, X + 29]) p.rect(vx, Y + 14, 5, 3, 'ink');
  // The dish, seen from above: a ring, crossed, with a lamp.
  p.disc(X + 40, Y + 18, 5, 'slate').disc(X + 40, Y + 18, 4, 'dusk');
  p.rect(X + 36, Y + 18, 9, 1, 'slate').rect(X + 40, Y + 14, 1, 9, 'slate');
  p.set(X + 40, Y + 18, lit ? 'amber' : 'ink');
  roof(p, X + 8, Y + 36, 20, 12);
  p.rect(X + 32, Y + 38, 14, 9, 'ink').frame(X + 32, Y + 38, 14, 9, 'dusk');
  for (let i = 0; i < 9; i++) p.set(X + 10 + i * 4, Y + 29, lit ? 'cyan' : 'ink');
  for (const [tx, ty] of [[X + 1, Y + 1], [X + W - 4, Y + 1], [X + 1, Y + H - 4], [X + W - 4, Y + H - 4]]) {
    p.rect(tx, ty, 3, 3, 'ink').set(tx + 1, ty + 1, lit ? 'amber' : 'slate');
  }
}

/** The middle school: an H of flat roofs with a bell tower, windows lit along the south, and the track beside it. */
export function school(p: Px, lit: boolean): void {
  p.rect(120, 134, 54, 38, 'shadow');
  roof(p, 124, 140, 14, 24);
  roof(p, 156, 140, 14, 24);
  roof(p, 138, 147, 18, 9);
  p.rect(144, 149, 6, 5, 'slate').frame(144, 149, 6, 5, 'ink');
  p.rect(146, 151, 2, 2, lit ? 'amber' : 'ink');
  for (let i = 0; i < 4; i++) {
    p.set(126 + i * 3, 161, lit ? 'amber' : 'ink'); p.set(158 + i * 3, 161, lit ? 'amber' : 'ink');
    p.set(126 + i * 3, 156, lit ? 'amber' : 'ink'); p.set(158 + i * 3, 156, lit ? 'amber' : 'ink');
  }
  p.rect(145, 154, 4, 1, lit ? 'amber' : 'ink');
  // The track.
  p.ellipse(186, 154, 12, 15, 'soil0').ellipse(186, 154, 9, 12, 'pine0');
  p.rect(186, 144, 1, 20, 'pine1');
  if (lit) {
    halo(p, 147, 158, 14, 'amber', 0.4, (x, y) => y > 162 || (x > 138 && x < 156 && y > 156));
  }
}

/** The pumpkin patch: a plowed field of dark soil with pumpkins that glow orange. */
export function patch(p: Px, lit: boolean): void {
  p.rect(126, 36, 36, 46, 'soil0');
  for (let y = 40; y < 80; y += 4) for (let x = 127; x < 161; x++) if ((x + y) % 3) p.set(x, y, 'soil1');
  for (const [fx, fy] of [[126, 36], [160, 36], [126, 80], [160, 80]]) p.rect(fx, fy, 2, 2, 'soil2');
  const spots: [number, number][] = [[134, 46], [147, 44], [155, 53], [138, 58], [150, 64], [132, 70], [144, 74], [156, 76], [140, 49]];
  if (lit) for (const [x, y] of spots) halo(p, x, y, 8, 'orange', 0.55, (px, py) => px > 126 && px < 162 && py > 36 && py < 82);
  for (const [x, y] of spots) {
    p.disc(x, y, 3, lit ? 'orange' : 'soil2');
    p.set(x - 1, y - 1, lit ? 'amber' : 'soil3').set(x, y - 3, 'pine1');
  }
}

/** The arcade: a flat roof, a neon sign over the door (its letters are drawn by the caller), and a glass front. */
export function arcade(p: Px, lit: boolean): void {
  roof(p, 176, 52, 24, 16);
  p.rect(176, 62, 24, 6, 'ink');
  p.rect(175, 41, 28, 9, 'ink').frame(175, 41, 28, 9, lit ? 'magenta' : 'dusk');
  if (lit) {
    halo(p, 189, 54, 12, 'magenta', 0.45, (x, y) => y > 50);
    for (const wx of [179, 185, 191, 196]) p.rect(wx, 64, 2, 3, 'cyan');
  }
}

/** The Upside Down's landmarks: a hole in the ground for the tunnels and a tear in the sky for the gate. They are painted over
 * the fog, and while their stage is locked only every other pixel shows, as if glimpsed through it. */
export function upside(p: Px, tunnelsLocked: boolean, gateLocked: boolean): void {
  const put = (x: number, y: number, c: ColorName, locked: boolean): void => { if (!locked || ((x + y) & 1) === 0) p.set(x, y, c); };
  const hx = 226, hy = 147;
  for (let y = -7; y <= 7; y++) for (let x = -13; x <= 13; x++) {
    const d = (x * x) / 169 + (y * y) / 49;
    if (d <= 1) put(hx + x, hy + y, d > 0.66 ? 'blood1' : 'black', tunnelsLocked);
  }
  // Roots that climb out of the hole.
  for (const [x0, y0, x1, y1] of [[hx - 12, hy - 2, hx - 18, hy - 9], [hx + 12, hy - 3, hx + 17, hy - 10], [hx - 4, hy + 7, hx - 7, hy + 13], [hx + 6, hy + 7, hx + 9, hy + 12]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 'blood1', tunnelsLocked);
  }
  // The tear: a ragged slit, red with a hot core, tapering at both ends.
  for (let y = 0; y < 38; y++) {
    const x = 247 + ((y * 5) % 7) - 3, half = y < 5 || y > 32 ? 0 : 1;
    for (let dx = -half; dx <= half; dx++) put(x + dx, 38 + y, dx === 0 ? 'hot' : 'red', gateLocked);
  }
}
