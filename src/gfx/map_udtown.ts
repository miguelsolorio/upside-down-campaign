// The map's Upside Down Hawkins (docs/map-screen.md, "Chapter four on the map"): a street of the town on the far side, seen through a torn
// round window in the dark like the mouth of the tunnels and the gate (map_art.ts), under the horizon where the town above it is
// reflected. One bold shape in code, in Blue storm's colors (gfx/var/hawkinsud.ts): three blue black houses with red windows, a dead
// streetlight, a road streaked red and a vein across it, pale spores, and a bolt of red lightning over the roofs. Rimmed in purple like its
// neighbours. Locked, the bolt and the windows are dark. The hole the route drops through is here too. Pure pixel work.
import { Px } from './px.ts';
import { framed } from './map_art.ts';

export const UDTOWN_W = 40, UDTOWN_H = 26;
const W = 38, H = 24, CX = 19, CY = 12, RX = 17.5, RY = 11;

/** A gabled house: a body with a roof on it whose left slope is lit, and its windows (lit red or dark). */
function house(p: Px, x: number, y: number, w: number, h: number, peak: number, lit: boolean, wins: number[]): void {
  p.rect(x, y, w, h, 'shadow').rect(x, y, 1, h, 'dusk').rect(x + w - 1, y, 1, h, 'night');
  const mid = x + (w >> 1);
  for (let i = 0; i <= peak; i++) {
    const half = Math.round(((i + 1) / (peak + 1)) * (w / 2 + 1));
    p.rect(mid - half, y - peak + i, half * 2, 1, 'dusk').set(mid - half, y - peak + i, 'slate').set(mid + half - 1, y - peak + i, 'shadow');
  }
  p.rect(x - 1, y - 1, w + 2, 1, 'slate');
  for (const wx of wins) p.rect(x + wx, y + 2, 2, 2, lit ? 'blood1' : 'ink').set(x + wx, y + 2, lit ? 'red' : 'night');
}

/** The scene inside the window: the sky, a bolt, the three houses, the lamp, the road and its vein, the spores. */
function scene(lit: boolean): Px {
  const p = new Px(W, H);
  p.rect(0, 0, W, 6, 'ink').rect(0, 6, W, 5, 'night').rect(0, 10, W, 2, 'shadow');
  for (let x = 0; x < W; x += 2) p.set(x, 6, 'ink');
  house(p, 4, 12, 8, 5, 4, lit, [1, 5]);
  house(p, 15, 10, 11, 7, 5, lit, [1, 8]);
  p.rect(20, 14, 2, 3, 'ink').rect(20, 14, 1, 3, 'night');
  house(p, 28, 13, 7, 4, 3, lit, [2]);
  p.rect(13, 10, 1, 8, 'slate').rect(12, 9, 3, 1, 'mist').set(12, 10, 'ink');
  p.rect(0, 17, W, 1, 'dusk').rect(0, 18, W, 6, 'night').rect(0, 18, W, 1, 'ink');
  for (const [x, y, w] of [[3, 20, 5], [12, 21, 4], [22, 20, 6], [30, 22, 5], [8, 22, 3]] as const) p.rect(x, y, w, 1, lit ? 'blood1' : 'blood0');
  p.rect(16, 19, 4, 1, 'mist').rect(25, 19, 4, 1, 'mist');
  if (lit) {
    p.line(25, 0, 23, 3, 'hot').line(23, 3, 26, 5, 'hot').line(26, 5, 22, 10, 'hot');
    p.line(26, 0, 24, 3, 'blood1').set(24, 4, 'pink').set(25, 5, 'pink');
  }
  p.line(0, 23, 6, 21, lit ? 'red' : 'blood0').line(6, 21, 10, 22, lit ? 'red' : 'blood0').line(10, 22, 15, 20, lit ? 'blood1' : 'blood0');
  for (const [x, y] of [[9, 4], [31, 6], [14, 7], [27, 9], [5, 8]] as const) p.set(x, y, 'white');
  return p;
}

/** The window onto Upside Down Hawkins, 40 by 26 with its outline's margin. */
export function udTown(lit: boolean): Px {
  const out = new Px(W, H), sc = scene(lit);
  out.ellipse(CX, CY, RX, RY, 'purple0');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = (x + 0.5 - CX) / RX, b = (y + 0.5 - CY) / RY, d = a * a + b * b;
    if (d > 1) continue;
    if (d <= 0.78) out.d[y * W + x] = sc.d[y * W + x] as number;
    else out.set(x, y, a + b < 0 ? 'purple' : (x + y) % 2 ? 'purple0' : 'night');
  }
  return framed(out);
}

/** The hole the route drops through where it meets the horizon, a small cousin of the patch's: a rim of earth round a dark mouth, with a dull ember in it while the stage is open and none while it is locked. */
export function dropHole(p: Px, cx: number, cy: number, lit: boolean): void {
  p.ellipse(cx, cy, 10, 4.4, 'soil1').ellipse(cx, cy - 0.8, 9, 3.6, 'soil2').ellipse(cx, cy, 8, 3.2, 'soil0').ellipse(cx, cy + 0.5, 7, 2.8, 'ink');
  if (lit) p.ellipse(cx, cy + 0.5, 5, 2, 'blood0').ellipse(cx, cy + 1, 3, 1.3, 'blood1').ellipse(cx, cy + 1, 1.5, 0.7, 'red');
  else p.ellipse(cx, cy + 0.5, 4.5, 1.8, 'night');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.set(Math.round(cx + Math.cos(a) * 9.5), Math.round(cy + Math.sin(a) * 4.1), i % 3 === 0 ? 'soil3' : 'soil2');
  }
}
