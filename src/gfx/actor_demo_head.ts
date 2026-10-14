// The Demogorgon's head, drawn by hand in code in five colors: ink, grey2 and grey3 for the skin, bone for the lit
// edge and the teeth, red for the flesh inside the petals. Shut, it is a smooth faceless bud with its seams. Open, it is
// a five petal flower round a ringed mouth: red inside seen from the front, grey backs seen from behind, and a cup seen
// from the side. Each head is a small Px with the point where the neck joins it. Pure pixel work, so Node can run it.
import { Px } from './px.ts';

/** The five colors a Demogorgon is drawn in. */
export const K = 'ink', D = 'grey2', G = 'grey3', B = 'bone', R = 'red';

export type HeadView = 'front' | 'back' | 'side';
/** A head and the pixel where its neck joins it. */
export interface Head { px: Px; ax: number; ay: number }

const PETAL_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180);

/** A rotated ellipse: center, the angle of its long axis, half length a and half width b. */
export function blob(px: Px, cx: number, cy: number, ang: number, a: number, b: number, col: Parameters<Px['set']>[2]): void {
  const c = Math.cos(ang), s = Math.sin(ang), m = Math.ceil(a) + 1;
  for (let y = Math.floor(cy) - m; y <= Math.ceil(cy) + m; y++) {
    for (let x = Math.floor(cx) - m; x <= Math.ceil(cx) + m; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * c + dy * s) / a, v = (-dx * s + dy * c) / b;
      if (u * u + v * v <= 1) px.set(x, y, col);
    }
  }
}

// ---------------------------------------------------------------- the shut bud
const BUD_FRONT = [1, 3, 5, 5, 7, 7, 9, 9, 9, 7, 7, 5, 3];
const BUD_SIDE = [1, 2, 4, 5, 6, 6, 7, 7, 6, 5, 5, 4, 3];

/** The bud: a pointed oval with a seam up the middle and two curved ones, lit on the left, shaded on the right. */
function bud(view: HeadView): Head {
  const px = new Px(13, 14);
  const side = view === 'side', cx = 6, widths = side ? BUD_SIDE : BUD_FRONT;
  widths.forEach((w, i) => {
    const y = i + 1, x0 = cx - (w >> 1) + (side ? Math.round((6 - i) * 0.3) : 0);
    px.rect(x0, y, w, 1, G).set(x0 + w - 1, y, D);
    if (i > 3 && i < 10 && !side) px.set(x0, y, B);
    if (i === 0 || (i < 3 && side)) px.set(x0, y, B);
    const hw = w >> 1;
    if (view === 'front' && i >= 3 && i <= 11 && hw >= 2) {
      px.set(cx, y, D);
      if (hw >= 3) px.set(x0 + 2, y, D).set(x0 + w - 3, y, D);
    } else if (view === 'back' && i >= 1 && i <= 11) {
      px.set(cx, y, D);
      if ((i & 1) === 0) px.set(cx + 1, y, B);
    } else if (side && i >= 3 && i <= 11) {
      px.set(x0 + w - 3 + (i > 8 ? 1 : 0), y, D);
    }
  });
  if (view === 'front') px.set(cx, 2, D);
  return { px, ax: cx + (side ? 1 : 0), ay: 13 };
}

// ---------------------------------------------------------------- the open flower
/** The five petals round a center. sx squeezes the flower sideways for the side view. `inside` says which show their red faces. */
function petals(px: Px, cx: number, cy: number, sx: number, inside: (dx: number) => boolean): void {
  PETAL_ANGLES.forEach((a) => {
    const dx = Math.cos(a) * sx, dy = Math.sin(a), ang = Math.atan2(dy, dx), len = Math.hypot(dx, dy);
    const dist = 5.4 * len, pl = 4.2 * (0.55 + 0.45 * len), pw = 2.5;
    const px0 = cx + (dx / len) * dist, py0 = cy + (dy / len) * dist;
    blob(px, px0 + 0.6, py0 + 0.6, ang, pl, pw, D);
    blob(px, px0, py0, ang, pl, pw, G);
    if (inside(dx)) { blob(px, px0 + (dx / len) * 0.3, py0 + (dy / len) * 0.3, ang, pl - 1.3, pw - 1.1, R); }
    else {
      for (let i = 0; i < pl - 0.5; i++) px.set(Math.round(px0 + (dx / len) * (i - pl / 2 + 0.5)), Math.round(py0 + (dy / len) * (i - pl / 2 + 0.5)), D);
    }
    px.set(Math.round(px0 + (dx / len) * (pl - 1) - 0.5), Math.round(py0 + (dy / len) * (pl - 1) - 0.5), B);
    if (dy < 0.4) px.set(Math.round(px0 - 1), Math.round(py0 - pw + 0.5), B);
  });
}

/** The ringed mouth: a grey ring, a black throat, a ring of bone teeth round it, and a red tongue deep inside. */
function maw(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  px.ellipse(cx, cy, rx + 1.2, ry + 1.2, D).ellipse(cx, cy, rx + 0.3, ry + 0.3, G);
  px.ellipse(cx, cy, rx - 0.6, ry - 0.6, K);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    px.set(Math.floor(cx + Math.cos(a) * (rx - 0.2)), Math.floor(cy + Math.sin(a) * (ry - 0.2)), i & 1 ? B : G);
  }
  px.set(Math.floor(cx) - 0, Math.floor(cy), R).set(Math.floor(cx) - 1, Math.floor(cy), R);
}

function flower(view: HeadView): Head {
  const px = new Px(24, 22);
  if (view === 'front') {
    petals(px, 12, 10, 1, () => true);
    maw(px, 12, 10, 3.2, 3.2);
    return { px, ax: 12, ay: 15 };
  }
  if (view === 'back') {
    petals(px, 12, 10, 1, () => false);
    px.disc(12, 10, 3, G).disc(12.5, 10.5, 1.8, D).set(10, 8, B).set(11, 8, B);
    return { px, ax: 12, ay: 15 };
  }
  petals(px, 10, 10, 0.78, (dx) => dx > -0.1);
  maw(px, 12.5, 10, 2.4, 3.4);
  return { px, ax: 11, ay: 15 };
}

const cache = new Map<string, Head>();
/** The head for a view, shut or open. Built once. */
export function headFor(view: HeadView, open: boolean): Head {
  const key = `${view}${open ? 'o' : 'c'}`;
  let h = cache.get(key);
  if (!h) { h = open ? flower(view) : bud(view); cache.set(key, h); }
  return h;
}
