// Vecna for vecna-variations.html (stage 4.4): one rig of joints per pose, in a 36 by 52 cell with his feet on row 49, drawn
// the way actor_demo.ts draws the Demogorgon: limbs stroked between joints, a torso filled between two widths, claws fanned
// from the hands, a bald head with deep eyes and bare teeth. A design (vecna_opts.ts) picks five fill colors, can stretch
// the rig, and dresses the body: vines, a robe, cracks, a suit. The poses follow his three phases: Clock (stand, walk, the
// curse), Float (floating, the throw), Burn (burning, the vine whip), and a hurt frame. The fire is an effect on top of the
// sprite, in its own colors. Pure pixel work: no DOM.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';

/** The rigs are drawn in a 36 by 52 box with his feet on row 49; the frame adds TOP rows of headroom above it, for tendrils. */
export const TOP = 10;
export const VW = 36, VH = 52 + TOP;
export type Pt = readonly [number, number];
export type Tri = readonly [Pt, Pt, Pt];
export type VPose = 'stand' | 'walk' | 'curse' | 'float' | 'throw' | 'burn' | 'whip' | 'hurt';

export interface VRig {
  head: Pt; hr: readonly [number, number]; neck: Pt; waist: Pt; shW: number; wW: number;
  /** Viewer's left first. Shoulder, elbow, hand; hip, knee, foot. */
  arms: readonly [Tri, Tri]; legs: readonly [Tri, Tri];
  /** Px off the floor: the whole figure rises and a shadow stays on the floor. */
  lift: number;
}

/** G body, D shade, B claws and teeth, E eyes. */
export interface VCols { G: ColorName; D: ColorName; B: ColorName; E: ColorName }

const STAND: VRig = {
  head: [18, 14], hr: [3.6, 4.6], neck: [18, 19], waist: [18, 33], shW: 5.2, wW: 3, lift: 0,
  arms: [[[13, 21], [10, 29], [9, 37]], [[23, 21], [26, 29], [27, 37]]],
  legs: [[[16, 33], [15, 41], [14, 49]], [[20, 33], [21, 41], [22, 49]]],
};

export const POSES: Record<VPose, VRig> = {
  stand: STAND,
  walk: { ...STAND, arms: [[[13, 21], [9, 28], [10, 36]], [[23, 21], [27, 28], [25, 36]]], legs: [[[16, 33], [14, 41], [12, 49]], [[20, 33], [22, 40], [22, 47]]] },
  curse: { ...STAND, head: [17, 14], arms: [[[13, 21], [11, 29], [10, 37]], [[23, 20], [28, 15], [31, 9]]], legs: [[[16, 33], [14, 41], [12, 49]], [[20, 33], [22, 41], [24, 49]]] },
  float: { ...STAND, lift: 8, arms: [[[13, 21], [7, 21], [3, 18]], [[23, 21], [29, 21], [33, 18]]], legs: [[[17, 33], [17, 41], [17, 48]], [[19, 33], [19, 41], [19, 48]]] },
  throw: { ...STAND, lift: 8, arms: [[[13, 21], [9, 19], [6, 22]], [[23, 21], [28, 24], [32, 25]]], legs: [[[17, 33], [16, 41], [16, 48]], [[19, 33], [20, 41], [20, 48]]] },
  burn: {
    head: [18, 17], hr: [3.6, 4.6], neck: [18, 22], waist: [18, 35], shW: 5.2, wW: 3, lift: 0,
    arms: [[[13, 24], [9, 30], [6, 36]], [[23, 24], [27, 30], [30, 36]]], legs: [[[16, 35], [13, 42], [13, 49]], [[20, 35], [23, 42], [23, 49]]],
  },
  whip: {
    head: [17, 16], hr: [3.6, 4.6], neck: [18, 21], waist: [18, 34], shW: 5.2, wW: 3, lift: 0,
    arms: [[[13, 23], [9, 27], [7, 33]], [[23, 22], [28, 16], [30, 10]]], legs: [[[16, 34], [13, 41], [11, 49]], [[20, 34], [23, 41], [25, 49]]],
  },
  hurt: { ...STAND, head: [19, 13], arms: [[[13, 21], [8, 15], [6, 11]], [[23, 21], [28, 16], [31, 13]]], legs: [[[16, 33], [15, 41], [15, 49]], [[20, 33], [22, 41], [24, 48]]] },
};

export const POSE_ORDER: VPose[] = ['stand', 'walk', 'curse', 'float', 'throw', 'burn', 'whip', 'hurt'];

/** A stroke from a to b, w px wide, with a shade line on its right or underside. */
export function seg(px: Px, a: Pt, b: Pt, w: number, body: ColorName, shade: ColorName | null): void {
  const flat = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  for (let k = 0; k < w; k++) px.line(a[0] + (flat ? 0 : k), a[1] + (flat ? k : 0), b[0] + (flat ? 0 : k), b[1] + (flat ? k : 0), body);
  if (shade) px.line(a[0] + (flat ? 0 : w), a[1] + (flat ? w : 0), b[0] + (flat ? 0 : w), b[1] + (flat ? w : 0), shade);
}

/** Three claws fanned from a hand along the line of the forearm. */
export function claws(px: Px, hand: Pt, from: Pt, col: ColorName, len = 3.2): void {
  const dx = hand[0] - from[0], dy = hand[1] - from[1], n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n;
  for (const a of [-0.55, 0, 0.55]) {
    const c = Math.cos(a), s = Math.sin(a), vx = ux * c - uy * s, vy = ux * s + uy * c;
    px.line(hand[0] + 0.5, hand[1] + 0.5, hand[0] + 0.5 + vx * len, hand[1] + 0.5 + vy * len, col);
  }
}

/** The torso: a band tapering from the shoulders to the waist, shaded on the right, with a row of ribs. */
export function torso(px: Px, r: VRig, c: VCols, fill: ColorName = c.G): void {
  const a = r.neck, b = r.waist, rows = Math.max(1, b[1] - a[1]);
  for (let y = a[1]; y <= b[1]; y++) {
    const u = (y - a[1]) / rows, cx = a[0] + (b[0] - a[0]) * u, hw = r.shW + (r.wW - r.shW) * u;
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw) - 1;
    px.rect(x0, y, x1 - x0 + 1, 1, fill).set(x1, y, c.D);
    if (fill === c.G && y > a[1] + 3 && (y - a[1]) % 2 === 0 && y < b[1] - 4) px.set(Math.round(cx) - 2, y, c.D).set(Math.round(cx) + 2, y, c.D);
  }
}

/** A bald head, lit up and left, with deep eyes and a row of teeth. */
export function head(px: Px, r: VRig, c: VCols): void {
  const [hx, hy] = r.head, [rx, ry] = r.hr;
  px.ellipse(hx + 0.6, hy + 0.6, rx, ry, c.D).ellipse(hx, hy, rx, ry, c.G);
  px.rect(Math.round(hx - 2), Math.round(hy), 2, 1, c.D).rect(Math.round(hx + 1), Math.round(hy), 2, 1, c.D);
  px.set(Math.round(hx - 2), Math.round(hy), c.E).set(Math.round(hx + 1), Math.round(hy), c.E);
  px.rect(Math.round(hx - 1), Math.round(hy + 2), 3, 2, c.D).set(Math.round(hx - 1), Math.round(hy + 3), c.B).set(Math.round(hx + 1), Math.round(hy + 3), c.B);
}

export interface BodyOpts {
  legs?: boolean;
  /** Colors for the upper arm and the whole leg, for a sleeve or trousers. */
  arm?: ColorName; leg?: ColorName;
  /** Drawn after the torso and before the arms and head: a robe, a hood. */
  mid?: (px: Px, r: VRig) => void;
  /** Claw length in px. */
  claw?: number;
}

/** The bare body in a pose: legs, torso, arms, head, claws. Dressing goes on after, the outline last. */
export function body(px: Px, r: VRig, c: VCols, o: BodyOpts = {}): void {
  if (o.legs !== false) {
    for (const [hip, kn, ft] of r.legs) {
      seg(px, hip, kn, 2, o.leg ?? c.G, c.D);
      seg(px, kn, ft, 2, o.leg ?? c.G, c.D);
      px.rect(ft[0] - 1, ft[1], 4, 1, c.D).set(ft[0] - 2, ft[1], c.B).set(ft[0] + 3, ft[1], c.B);
    }
  }
  torso(px, r, c);
  o.mid?.(px, r);
  for (const [sh, el, ha] of r.arms) {
    seg(px, sh, el, 2, o.arm ?? c.G, c.D);
    seg(px, el, ha, 1, c.G, c.D);
    claws(px, ha, el, c.B, o.claw);
  }
  px.rect(r.neck[0] - 1, r.neck[1] - 2, 3, 3, c.G);
  head(px, r, c);
}

/** Lines that wrap a limb: short bands across it every few px. */
export function wrap(px: Px, t: Tri, col: ColorName, every = 3): void {
  for (let s = 0; s < 2; s++) {
    const a = t[s] as Pt, b = t[s + 1] as Pt, n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / n, uy = (b[1] - a[1]) / n;
    for (let d = 1; d < n; d += every) {
      const x = a[0] + ux * d, y = a[1] + uy * d;
      px.line(Math.round(x - uy * 1.5), Math.round(y + ux * 1.5 - 1), Math.round(x + uy * 1.5 + 1), Math.round(y - ux * 1.5), col);
    }
  }
}

/** The same rig moved down by d rows, into the frame's headroom. */
export function lowered(r: VRig, d: number): VRig {
  const m = (p: Pt): Pt => [p[0], p[1] + d];
  const t = (x: Tri): Tri => [m(x[0]), m(x[1]), m(x[2])];
  return { ...r, head: m(r.head), neck: m(r.neck), waist: m(r.waist), arms: [t(r.arms[0]), t(r.arms[1])], legs: [t(r.legs[0]), t(r.legs[1])] };
}

/** The finished frame: the figure (drawn on a VW by VH buffer from a lowered rig) lifted by r.lift and outlined, a flat shadow left on the floor. */
export function finish(fig: Px, r: VRig, fire?: (p: Px) => void): Px {
  const out = new Px(VW, VH);
  if (r.lift) out.ellipse(18, 50.5 + TOP, 7, 1.5, 'ink');
  const f = fig.outline('ink');
  out.blit(f, 0, -r.lift);
  if (fire) {
    const fl = new Px(VW, VH);
    fire(fl);
    out.blit(fl, 0, -r.lift);
  }
  return out;
}

/** A flame from (x, y): a wide orange base, two tongues of different heights leaning one way, an amber core, yellow tips. */
export function flame(px: Px, x: number, y: number, h: number, lean: number): void {
  px.ellipse(x + 0.5, y - h * 0.22, 2.6, h * 0.3, 'orange');
  px.line(x - 1, y - h * 0.3, x - 1 + lean, y - h * 0.75, 'orange').line(x, y - h * 0.3, x + lean, y - h * 0.75, 'orange');
  px.line(x + 1, y - h * 0.3, x + 1 + lean, y - h, 'orange').line(x + 2, y - h * 0.2, x + 2 + lean, y - h * 0.55, 'orange');
  px.ellipse(x + 0.5, y - h * 0.2, 1.4, h * 0.2, 'amber');
  px.line(x, y - h * 0.3, x + lean, y - h * 0.55, 'amber');
  px.set(x - 1 + lean, y - Math.round(h * 0.75), 'yellow').set(x + 1 + lean, y - h, 'yellow');
}

/** Flames on the shoulders, the head, the back and an elbow in a burning pose. Drawn with no outline, over the sprite. */
export function onFire(r: VRig): (p: Px) => void {
  return (p) => {
    const spots: [Pt, number, number][] = [
      [[r.neck[0] - r.shW, r.neck[1] + 3], 9, -1], [[r.neck[0] + r.shW - 1, r.neck[1] + 3], 8, 1], [[r.head[0], r.head[1] - 3], 6, 1],
      [[r.waist[0] - 2, r.waist[1] - 1], 6, -1], [r.arms[0][1], 5, -1],
    ];
    for (const [[x, y], h, lean] of spots) flame(p, Math.round(x), Math.round(y), h, lean);
  };
}

/** The clock his curse hangs over a hero: a face with two hands and four chime pips under it, `lit` of them sounded. */
export function curseMark(ring: ColorName, face: ColorName, lit: number, pip: ColorName): Px {
  const p = new Px(15, 17);
  p.disc(7.5, 6.5, 6, ring).disc(7.5, 6.5, 4.6, face);
  p.line(7, 6, 7, 3, 'ink').line(7, 6, 10, 6, 'ink');
  for (const [x, y] of [[7, 1], [13, 6], [7, 12], [2, 6]] as const) p.set(x, y, face);
  for (let i = 0; i < 4; i++) p.rect(1 + i * 4, 14, 2, 2, i < lit ? pip : 'shadow');
  return p.outline('ink');
}
