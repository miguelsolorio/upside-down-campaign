// The land of the Hawkins map (docs/map-screen.md), painted once into a 256 by 224 Px. Each node owns the ground nearest it
// and paints it for its place: pine woods, the Lab behind its fence, the school and its lot, the pumpkin patch with its barn,
// the tunnels and the gate. The ground of a locked node is dimmed to dark greys. A trail bed runs node to node, brighter
// where the way is open. The top 16 px and the bottom 48 px get ground only, no sprites, so the text and panels UI draws
// there stay readable. Pure pixel work, so Node can run it. drawMap (map.ts) caches one of these per set of locks.
import { hash2, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';

export const MAP_W = 256, MAP_H = 224;
/** The strips UI keeps for text and panels. */
export const QUIET_TOP = 16, QUIET_BOTTOM = 48;
export type Place = 'woods' | 'lab' | 'school' | 'patch' | 'tunnels' | 'gate';
export interface LandNode { id: string; x: number; y: number; place: Place; locked: boolean }

/** Ground, a dark speck and a light speck for each place. */
const GROUND: Record<Place, [ColorName, ColorName, ColorName]> = {
  woods: ['pine1', 'pine0', 'pine2'], lab: ['grey2', 'grey1', 'grey3'], school: ['pine2', 'pine1', 'pine3'],
  patch: ['soil2', 'soil1', 'soil3'], tunnels: ['grey1', 'ink', 'grey2'], gate: ['soil0', 'blood0', 'soil1'],
};

const TREE = ['....l....', '...lgg...', '...ggg...', '..lgggg..', '..ggdgg..', '.lggggdg.', '.ggdgggg.', 'lgggggdgg', '..ggdgg..', '....t....', '....t....'];
const TREE_PAL: Record<string, ColorName> = { l: 'pine3', g: 'pine2', d: 'pine1', t: 'soil1' };
const BUSH = ['.ggg.', 'gglgg', 'ggggg'];
const PUMPKIN = ['.s.', 'ooo', 'ooo'];

/** The index of the nearest node for every pixel, and how much nearer it is than the second nearest. */
function regions(nodes: LandNode[]): { idx: Uint8Array; gap: Uint8Array } {
  const idx = new Uint8Array(MAP_W * MAP_H), gap = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let b = 0, d1 = 1e9, d2 = 1e9;
      nodes.forEach((n, i) => {
        const d = Math.hypot(x - n.x, (y - n.y) * 1.15) + (hash2(x >> 2, y >> 2, i) % 5);
        if (d < d1) { d2 = d1; d1 = d; b = i; } else if (d < d2) d2 = d;
      });
      idx[y * MAP_W + x] = b;
      gap[y * MAP_W + x] = Math.min(255, Math.round(d2 - d1));
    }
  }
  return { idx, gap };
}

/** The trail between two nodes: a gentle curve, as a list of points one pixel apart. */
export function trailPoints(a: { x: number; y: number }, b: { x: number; y: number }, bend: number): [number, number][] {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
  const n = Math.max(2, Math.round(len * 1.4)), out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([Math.round(u * u * a.x + 2 * u * t * cx + t * t * b.x), Math.round(u * u * a.y + 2 * u * t * cy + t * t * b.y)]);
  }
  return out;
}
/** The bend each trail takes: it alternates sides so the path winds. */
export const bendOf = (i: number): number => (i & 1 ? -9 : 9);

// ---------------------------------------------------------------- sprites on the land
const near = (x: number, y: number, pts: [number, number][], r: number): boolean => pts.some(([px, py]) => Math.abs(px - x) < r && Math.abs(py - y) < r * 0.9);

function fence(px: Px, x0: number, y0: number, w: number, h: number): void {
  for (let i = 0; i < w; i++) for (const y of [y0, y0 + h]) { px.set(x0 + i, y, 'grey3'); if (i % 3 === 0) px.set(x0 + i, y + 1, 'grey1'); }
  for (let j = 0; j <= h; j++) for (const x of [x0, x0 + w]) { px.set(x, y0 + j, 'grey3'); if (j % 3 === 0) px.set(x + 1, y0 + j, 'grey1'); }
  for (const [x, y] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]] as [number, number][]) px.rect(x - 1, y - 1, 3, 3, 'grey2').set(x, y - 1, 'bone');
}

function woods(px: Px, claimed: (x: number, y: number) => boolean, avoid: [number, number][], ok: (y: number) => boolean, every = 1): void {
  for (let gy = 8; gy < MAP_H; gy += 9) {
    for (let gx = 4; gx < MAP_W; gx += 10) {
      const x = gx + (hash2(gx, gy, 5) % 5) - 2 + ((gy / 9) & 1 ? 4 : 0), y = gy + (hash2(gy, gx, 6) % 5) - 2;
      if (hash2(x, y, 9) % every !== 0 || !claimed(x, y) || !ok(y) || !ok(y - 11) || near(x, y, avoid, 9)) continue;
      if (hash2(x, y, 7) % 5 === 0) px.art(BUSH, { g: 'pine2', l: 'pine3' }, x - 2, y - 2);
      else px.art(TREE, TREE_PAL, x - 4, y - 10);
    }
  }
}

/** The Lab's yard: concrete slabs, fuel tanks and the odd mast, wherever the ground is the Lab's and not in the way. */
function labYard(px: Px, claimed: (x: number, y: number) => boolean, avoid: [number, number][], ok: (y: number) => boolean, n: LandNode): void {
  for (let k = 0; k < 26; k++) {
    const x = 6 + (hash2(k, 7, 37) % 244), y = 24 + (hash2(k, 8, 37) % 140);
    if (!claimed(x, y) || !ok(y) || !ok(y - 6) || near(x, y, avoid, 12) || (Math.abs(x - n.x) < 34 && Math.abs(y - n.y + 20) < 26)) continue;
    const kind = k % 3;
    if (kind === 0) px.rect(x - 7, y - 4, 14, 8, 'grey3').frame(x - 7, y - 4, 14, 8, 'grey1').rect(x - 5, y - 2, 10, 1, 'grey2');
    else if (kind === 1) px.ellipse(x, y - 3, 5, 5, 'bone').ellipse(x - 1, y - 4, 3, 3, 'white').rect(x - 5, y + 1, 10, 2, 'grey2').set(x + 3, y - 6, 'grey1');
    else px.rect(x, y - 12, 1, 12, 'grey1').rect(x - 2, y - 12, 5, 1, 'grey3').set(x, y - 13, 'hot').rect(x - 1, y, 3, 1, 'grey1');
  }
}

function lab(px: Px, n: LandNode): void {
  px.rect(n.x - 20, n.y - 30, 40, 24, 'grey3').frame(n.x - 20, n.y - 30, 40, 24, 'grey1');
  fence(px, n.x - 26, n.y - 36, 52, 34);
  px.rect(n.x - 15, n.y - 27, 30, 12, 'bone').rect(n.x - 15, n.y - 27, 30, 2, 'white').rect(n.x - 15, n.y - 16, 30, 3, 'grey2');
  for (let i = 0; i < 5; i++) px.rect(n.x - 12 + i * 6, n.y - 24, 4, 4, 'teal1').set(n.x - 12 + i * 6, n.y - 24, 'cyan');
  px.rect(n.x - 3, n.y - 15, 6, 5, 'grey1').rect(n.x - 2, n.y - 14, 4, 4, 'teal0');
  px.rect(n.x + 9, n.y - 40, 1, 12, 'grey3').rect(n.x + 8, n.y - 41, 3, 1, 'hot');
}

function school(px: Px, n: LandNode): void {
  px.rect(n.x - 22, n.y - 8, 44, 6, 'grey2');
  for (let x = n.x - 18; x < n.x + 20; x += 6) px.rect(x, n.y - 6, 1, 4, 'bone');
  px.rect(n.x - 18, n.y - 28, 36, 20, 'soil2').frame(n.x - 18, n.y - 28, 36, 20, 'soil1').rect(n.x - 19, n.y - 30, 38, 3, 'grey1');
  for (let y = n.y - 23; y < n.y - 10; y += 6) for (let x = n.x - 14; x < n.x + 14; x += 7) px.rect(x, y, 4, 3, hash2(x, y, 3) % 3 === 0 ? 'yellow' : 'sky');
  px.rect(n.x - 3, n.y - 18, 6, 10, 'soil1').rect(n.x - 2, n.y - 17, 4, 8, 'bone').rect(n.x, n.y - 17, 1, 8, 'soil1');
  px.rect(n.x + 20, n.y - 36, 1, 24, 'bone').rect(n.x + 21, n.y - 36, 5, 3, 'hot').rect(n.x + 21, n.y - 33, 4, 1, 'blue');
}

function patch(px: Px, n: LandNode, claimed: (x: number, y: number) => boolean, avoid: [number, number][], ok: (y: number) => boolean): void {
  for (let y = 18; y < MAP_H; y += 4) for (let x = 0; x < MAP_W; x++) if (claimed(x, y) && ok(y) && !near(x, y, avoid, 5) && ((x + hash2(y >> 2, 0, 1)) & 7) !== 7) px.set(x, y, 'soil3');
  for (let k = 0; k < 14; k++) {
    const x = n.x - 36 + ((hash2(k, 1, 31) % 72)), y = n.y + 8 + ((hash2(k, 2, 31) % 38));
    if (claimed(x, y) && ok(y) && ok(y + 3) && !near(x, y, avoid, 8)) px.art(PUMPKIN, { s: 'pine1', o: 'orange' }, x, y);
  }
  const bx = n.x - 34, by = n.y - 24;
  px.rect(bx, by + 6, 20, 14, 'red').rect(bx, by + 6, 20, 1, 'hot').rect(bx - 1, by + 3, 22, 4, 'blood1').rect(bx + 1, by, 18, 4, 'blood0');
  px.rect(bx + 7, by + 11, 6, 9, 'bone').rect(bx + 8, by + 12, 4, 7, 'blood1').line(bx + 8, by + 12, bx + 11, by + 18, 'bone').line(bx + 11, by + 12, bx + 8, by + 18, 'bone');
  px.rect(bx + 14, by + 8, 3, 3, 'ink').rect(bx - 6, by + 18, 5, 2, 'yellow').rect(bx - 6, by + 16, 5, 2, 'sand');
}

function tunnels(px: Px, n: LandNode, claimed: (x: number, y: number) => boolean, ok: (y: number) => boolean, avoid: [number, number][]): void {
  for (let k = 0; k < 16; k++) {
    const x = n.x - 30 + (hash2(k, 3, 33) % 60), y = n.y - 20 + (hash2(k, 4, 33) % 44);
    if (claimed(x, y) && ok(y) && ok(y - 6) && !near(x, y, avoid, 9)) px.ellipse(x, y, 4, 3, 'grey1').ellipse(x - 0.5, y - 0.8, 3.2, 2.2, 'grey2').set(x - 2, y - 2, 'grey3');
  }
  px.ellipse(n.x, n.y - 14, 15, 11, 'grey1').ellipse(n.x, n.y - 15, 13.5, 9.5, 'grey2').ellipse(n.x - 3, n.y - 18, 6, 3, 'grey3');
  px.rect(n.x - 6, n.y - 20, 12, 12, 'ink').ellipse(n.x, n.y - 20, 6, 4, 'ink').rect(n.x - 4, n.y - 10, 8, 2, 'blood0').line(n.x - 2, n.y - 14, n.x + 1, n.y - 10, 'blood1').set(n.x, n.y - 12, 'red');
  for (let i = 0; i < 3; i++) px.line(n.x - 8 + i * 8, n.y - 8, n.x - 11 + i * 11, n.y - 3, 'blood1').set(n.x - 11 + i * 11, n.y - 3, 'red');
}

function gate(px: Px, n: LandNode, claimed: (x: number, y: number) => boolean, ok: (y: number) => boolean, avoid: [number, number][]): void {
  for (let k = 0; k < 12; k++) {
    const x = n.x - 22 + (hash2(k, 5, 35) % 44), y = n.y - 8 + (hash2(k, 6, 35) % 36);
    if (claimed(x, y) && ok(y) && !near(x, y, avoid, 8)) { px.line(x, y, x + 3, y + 2, 'blood1').line(x + 3, y + 2, x + 1, y + 5, 'blood0').set(x, y, 'red'); }
  }
  px.rect(n.x - 14, n.y - 34, 5, 28, 'grey2').rect(n.x + 9, n.y - 34, 5, 28, 'grey2').rect(n.x - 16, n.y - 38, 32, 6, 'grey1').rect(n.x - 16, n.y - 38, 32, 1, 'grey3');
  px.rect(n.x - 14, n.y - 34, 1, 28, 'grey3').rect(n.x + 9, n.y - 34, 1, 28, 'grey3');
  px.rect(n.x - 9, n.y - 32, 18, 26, 'blood0').rect(n.x - 7, n.y - 29, 14, 22, 'blood1').rect(n.x - 4, n.y - 26, 8, 17, 'red').rect(n.x - 2, n.y - 23, 4, 11, 'hot');
  px.line(n.x - 12, n.y - 30, n.x - 6, n.y - 8, 'blood1').line(n.x + 12, n.y - 30, n.x + 7, n.y - 12, 'blood1');
}

/** Dims the ground of a locked place to dark greys. */
function dim(px: Px, idx: Uint8Array, locked: boolean[]): void {
  const ramp: ColorName[] = ['grey1', 'grey1', 'grey2', 'grey3'], cuts = [34, 80, 150];
  for (let i = 0; i < px.d.length; i++) {
    if (!locked[idx[i] as number]) continue;
    const v = px.d[i] as number, luma = 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
    let k = 0;
    while (k < cuts.length && luma >= (cuts[k] as number)) k++;
    px.d[i] = px32(ramp[k] as ColorName);
  }
}

/** The whole map's ground for these nodes, in play order. */
export function paintLand(nodes: LandNode[]): Px {
  const px = new Px(MAP_W, MAP_H);
  const { idx, gap } = regions(nodes);
  const eff = idx.slice();
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      let reg = idx[i] as number;
      if ((gap[i] as number) < 4 && ((x + y) & 1) === 1) {
        let best = -1, bd = 1e9;
        nodes.forEach((nn, k) => { if (k !== reg) { const d = Math.hypot(x - nn.x, (y - nn.y) * 1.15); if (d < bd) { bd = d; best = k; } } });
        if (best >= 0) reg = best;
      }
      eff[i] = reg;
      const [base, dark, light] = GROUND[(nodes[reg] as LandNode).place];
      const h = hash2(x >> 1, y, 41) % 100;
      px.set(x, y, h < 5 ? dark : h > 95 ? light : base);
    }
  }
  const trail: [number, number][][] = nodes.slice(1).map((n, i) => trailPoints(nodes[i] as LandNode, n, bendOf(i)));
  const flat = trail.flat();
  nodes.forEach((n, ni) => {
    const claimed = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && idx[y * MAP_W + x] === ni;
    const ok = (y: number): boolean => y >= QUIET_TOP + 4 && y < MAP_H - QUIET_BOTTOM - 3;
    const avoid: [number, number][] = [...nodes.map((o) => [o.x, o.y] as [number, number]), ...flat];
    switch (n.place) {
      case 'woods': woods(px, claimed, avoid, ok); break;
      case 'lab': labYard(px, claimed, avoid, ok, n); lab(px, n); break;
      case 'school': woods(px, claimed, avoid, ok, 3); school(px, n); break;
      case 'patch': patch(px, n, claimed, avoid, ok); break;
      case 'tunnels': tunnels(px, n, claimed, ok, avoid); break;
      case 'gate': gate(px, n, claimed, ok, avoid); break;
    }
  });
  trail.forEach((pts, i) => {
    const open = !(nodes[i + 1] as LandNode).locked;
    for (const [x, y] of pts) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 2 || x + dx < 0 || y + dy < 0) continue;
        const h = hash2(x + dx, y + dy, 43) % 7;
        px.set(x + dx, y + dy, open ? (h < 2 ? 'sand' : h < 4 ? 'soil3' : 'soil2') : h === 0 ? 'grey2' : 'grey1');
      }
    }
  });
  dim(px, eff, nodes.map((n) => n.locked));
  return px;
}
