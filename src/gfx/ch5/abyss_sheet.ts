// The cards of chapter5-abyss.html: every tile, mark, pose and frame this folder paints at 3x on a card canvas, laid out in rows with a
// label on each. The tiles are shown in the neighbors that change them (an island's edge, its corners, its cliff, a hole in its floor,
// the arena's ring), each as a real place on a map, so what the stage will see is what is drawn. Drawn by the game's own painters; the
// cards are for looking at. Needs a DOM (it builds canvases), unlike the painters.
import type { Ctx } from '../canvas.ts';
import { drawText } from '../font.ts';
import { PAL } from '../palette.ts';
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import type { TileCtx } from '../tile_ground.ts';
import { abyssTile } from './abyss_tiles.ts';
import { CHEST_H, CHEST_W, drawFinaleSpider, vecnaChestPx, vecnaFastPx, FAST_H, FAST_W, joycePx, JOYCE_H, JOYCE_W } from './finale_boss.ts';
import { channelMark, drawHeartGlow, heartTile } from './heart_tiles.ts';
import { view } from './abyss_scenes.ts';

const K = 3, GAP = 6, PAD = 8;
export const SHEET_W = 1180;

interface Card { c: HTMLCanvasElement; g: Ctx }
function card(h: number, bg: ColorName = 'blood0'): Card {
  const c = document.createElement('canvas');
  c.width = SHEET_W; c.height = h;
  const g = c.getContext('2d') as Ctx;
  g.imageSmoothingEnabled = false;
  g.fillStyle = PAL[bg];
  g.fillRect(0, 0, SHEET_W, h);
  return { c, g };
}

const label = (g: Ctx, text: string, x: number, y: number, color: ColorName = 'mist'): void => { drawText(g, text, x, y, color); };
const zoom = (g: Ctx, src: CanvasImageSource, w: number, h: number, x: number, y: number, k = K): void => { g.imageSmoothingEnabled = false; g.drawImage(src, x, y, w * k, h * k); };
const zoomPx = (g: Ctx, p: Px, x: number, y: number, k = K): void => zoom(g, p.toCanvas(), p.w, p.h, x, y, k);

/** A tile in a place: its name, the four neighbors, and where it sits (which sets its variant), with a caption. */
interface Spot { name: string; near: [string, string, string, string]; at?: [number, number]; phase?: number; cap: string }
const spot = (name: string, near: string, cap: string, at: [number, number] = [7, 5], phase = 0): Spot => ({ name, near: near.split(',') as Spot['near'], at, phase, cap });

/** Rows of spots, each row with a heading: the tile at 3x, its caption under it. Returns the height used. */
function rows(g: Ctx, y0: number, paint: (name: string, c: TileCtx, phase: number) => Px | null, list: { head: string; spots: Spot[] }[]): number {
  let y = y0;
  for (const row of list) {
    label(g, row.head, PAD, y, 'amber');
    y += 12;
    row.spots.forEach((s, i) => {
      const x = PAD + i * (16 * K + 30), [tx, ty] = s.at ?? [7, 5];
      const px = paint(s.name, { tx, ty, near: { n: s.near[0], e: s.near[1], s: s.near[2], w: s.near[3] } as TileCtx['near'] }, s.phase ?? 0);
      g.fillStyle = PAL.ink;
      g.fillRect(x - 1, y - 1, 16 * K + 2, 16 * K + 2);
      if (px) zoomPx(g, px, x, y);
      label(g, s.cap, x - 2, y + 16 * K + 3, 'slate');
    });
    y += 16 * K + 18;
  }
  return y;
}

// ---------------------------------------------------------------- the Abyss
const T = ['abysslawn', 'abyssroad', 'abyssline', 'abyssporch', 'abyssclass'];
const names: Record<string, string> = { abysslawn: 'LAWN', abyssroad: 'ROAD', abyssline: 'ROAD LINE', abyssporch: 'PORCH', abyssclass: 'CLASSROOM' };

export function abyssCard(): HTMLCanvasElement {
  const list: { head: string; spots: Spot[] }[] = T.map((t) => ({
    head: `${(names[t] as string)} (${t.toUpperCase()}), AN ISLAND FLOOR`,
    spots: [
      spot(t, `${t},${t},${t},${t}`, 'INSIDE', [7, 5]), spot(t, `${t},${t},${t},${t}`, 'INSIDE 2', [8, 6]), spot(t, `${t},${t},${t},${t}`, 'INSIDE 3', [9, 5]),
      spot(t, `abyssgap,${t},${t},${t}`, 'NORTH EDGE'), spot(t, `${t},abyssgap,${t},${t}`, 'EAST EDGE'), spot(t, `${t},${t},abysscliff,${t}`, 'OVER A CLIFF'),
      spot(t, `abyssgap,${t},${t},abyssgap`, 'NW CORNER'), spot(t, `abyssgap,abyssgap,${t},abyssgap`, 'PENINSULA'), spot(t, 'abyssgap,abyssgap,abyssgap,abyssgap', 'ALONE'),
      spot(t, `${t},${t},${t},${t}`, 'PULSE 1', [7, 5], 1), spot(t, `${t},${t},${t},${t}`, 'PULSE 2', [7, 5], 2),
    ],
  }));
  list.push(
    {
      head: 'CLIFF, THE ROCK FACE UNDER AN ISLAND, AND UNDER, THE ROCK TAPERING INTO THE VOID',
      spots: [
        spot('abysscliff', 'abyssroad,abysscliff,abyssunder,abysscliff', 'CLIFF'), spot('abysscliff', 'abyssroad,abysscliff,abyssunder,abyssgap', 'LEFT END'), spot('abysscliff', 'abyssroad,abyssgap,abyssunder,abysscliff', 'RIGHT END'),
        spot('abysscliff', 'abyssroad,abyssgap,abyssgap,abyssgap', 'ALONE, RAGGED'), spot('abyssunder', 'abysscliff,abyssunder,abyssgap,abyssunder', 'UNDER'), spot('abyssunder', 'abysscliff,abyssunder,abyssgap,abyssgap', 'UNDER LEFT'),
        spot('abyssunder', 'abysscliff,abyssgap,abyssgap,abyssunder', 'UNDER RIGHT'), spot('abyssunder', 'abysscliff,abyssgap,abyssgap,abyssgap', 'A SPIRE', [9, 7]), spot('abyssunder', 'abysscliff,abyssunder,abyssgap,abyssunder', 'UNDER 2', [10, 7], 2),
      ],
    },
    {
      head: 'GAP, THE DROP (CLEAR, THE BACKDROP SHOWS THROUGH), AND THE VINE BRIDGE',
      spots: [
        spot('abyssgap', 'abyssgap,abyssgap,abyssgap,abyssgap', 'VOID'), spot('abyssgap', 'abyssgap,abysslawn,abyssgap,abysslawn', 'BESIDE LAND'), spot('abyssgap', 'abysslawn,abysslawn,abysslawn,abysslawn', 'A HOLE'),
        spot('abyssgap', 'abyssbridgeh,abyssgap,abyssgap,abyssgap', 'UNDER A BRIDGE'), spot('abyssbridgeh', 'abyssroad,abyssbridgeh,abyssgap,abyssgap', 'BRIDGE START'), spot('abyssbridgeh', 'abyssgap,abyssbridgeh,abyssgap,abyssbridgeh', 'BRIDGE', [8, 5]),
        spot('abyssbridgeh', 'abyssgap,abysslawn,abyssgap,abyssbridgeh', 'BRIDGE END'), spot('abyssbridgev', 'abysslawn,abyssgap,abyssbridgev,abyssgap', 'DOWN, START'), spot('abyssbridgev', 'abyssbridgev,abyssgap,abyssbridgev,abyssgap', 'DOWN', [7, 6]),
        spot('abyssbridgev', 'abyssbridgev,abyssgap,abysslawn,abyssgap', 'DOWN, END'),
      ],
    },
  );
  const { c, g } = card(list.length * (12 + 16 * K + 18) + 12);
  rows(g, PAD, abyssTile, list);
  c.setAttribute('aria-label', 'Every Abyss tile in the places that change it');
  return c;
}

// ---------------------------------------------------------------- the heart
export function heartCard(): HTMLCanvasElement {
  const F = 'heartfloor', W = 'heartwall', E = 'heartrim';
  const list: { head: string; spots: Spot[] }[] = [
    { head: 'HEARTFLOOR: THE FLESH FLOOR, ITS VEINS, ITS BEAT, AND THE CORNERS TWO WALLS ROUND OFF', spots: [
      spot(F, `${F},${F},${F},${F}`, 'FLOOR', [7, 5]), spot(F, `${F},${F},${F},${F}`, 'FLOOR 2', [8, 6]), spot(F, `${F},${F},${F},${F}`, 'FLOOR 3', [9, 5]),
      spot(F, `${F},${F},${F},${F}`, 'BEAT 1', [7, 5], 1), spot(F, `${F},${F},${F},${F}`, 'BEAT 2', [7, 5], 2),
      spot(F, `${E},${F},${F},${E}`, 'ROUNDED NW'), spot(F, `${E},${E},${F},${F}`, 'ROUNDED NE'), spot(F, `${F},${E},${E},${F}`, 'ROUNDED SE'), spot(F, `${F},${F},${E},${E}`, 'ROUNDED SW'),
    ] },
    { head: 'HEARTWALL: THE RIB AND VEIN WALL (FACE, WITH FLOOR BELOW) AND ITS TOP (CAP)', spots: [
      spot(W, `${W},${W},${F},${W}`, 'FACE', [6, 3]), spot(W, `${W},${W},${F},${W}`, 'FACE 2', [7, 3]), spot(W, `${F},${F},${F},${F}`, 'FACE, ALONE', [8, 3]),
      spot(W, `${W},${W},${F},${W}`, 'BEAT 1', [7, 3], 1), spot(W, `${W},${W},${W},${W}`, 'CAP', [7, 2]), spot(W, `${W},${W},${W},${W}`, 'CAP 2', [8, 2]), spot(W, `${W},${W},${W},${W}`, 'CAP BEAT', [8, 2], 2),
    ] },
    { head: 'HEARTRIM: THE ARENA EDGE, A RIBBED RIDGE THAT ROUNDS OFF WHERE THE FLOOR TURNS', spots: [
      spot(E, `${F},${W},${W},${W}`, 'FLOOR NORTH'), spot(E, `${W},${F},${W},${W}`, 'FLOOR EAST'), spot(E, `${W},${W},${F},${W}`, 'FLOOR SOUTH'), spot(E, `${W},${W},${W},${F}`, 'FLOOR WEST'),
      spot(E, `${F},${F},${W},${W}`, 'CORNER NE'), spot(E, `${W},${F},${F},${W}`, 'CORNER SE'), spot(E, `${W},${W},${F},${F}`, 'CORNER SW'), spot(E, `${F},${W},${W},${F}`, 'CORNER NW'),
      spot(E, `${F},${W},${W},${W}`, 'BEAT 1', [7, 5], 1),
    ] },
  ];
  const marks = 12 + 32 * K + 14;
  const { c, g } = card(list.length * (12 + 16 * K + 18) + 12 + marks * 2 + 20 + 52 * 2 + 40);
  let y = rows(g, PAD, heartTile, list);
  label(g, 'THE CHANNEL MARKS: ELEVEN, THEN WILL, EACH DIM, THEN LIT IN FOUR STEPS OF THE PULSE', PAD, y, 'amber');
  y += 12;
  for (const who of ['eleven', 'will'] as const) {
    const all: [Px, string][] = [[channelMark(who, 0, false), 'DIM'], ...([0, 1, 2, 3] as const).map((p): [Px, string] => [channelMark(who, p, true), `LIT ${p + 1}`])];
    all.forEach(([p, cap], i) => {
      const x = PAD + i * (32 * K + 14);
      g.fillStyle = PAL.ink; g.fillRect(x - 1, y - 1, 32 * K + 2, 32 * K + 2);
      g.fillStyle = PAL.blood0; g.fillRect(x, y, 32 * K, 32 * K);
      zoomPx(g, p, x, y);
      label(g, `${who.toUpperCase()} ${cap}`, x, y + 32 * K + 3, 'slate');
    });
    y += 32 * K + 14 + 8;
  }
  y += 4;
  label(g, 'THE GLOW OVER THE FLOOR: THE FOUR STEPS OF THE HEARTBEAT (REST, THE END OF A BEAT, THE DUB, THE LUB)', PAD, y, 'amber');
  y += 12;
  [10, 7, 17, 3].forEach((t, i) => {
    const w = 64, h = 52, tile = document.createElement('canvas');
    tile.width = w * 2; tile.height = h * 2;
    const tg = tile.getContext('2d') as Ctx;
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) { const p = heartTile('heartfloor', { tx: tx + 7, ty: ty + 5, near: { n: 'heartfloor', e: 'heartfloor', s: 'heartfloor', w: 'heartfloor' } as unknown as TileCtx['near'] }, 0); if (p) tg.drawImage(p.toCanvas(), tx * 16, ty * 16); }
    drawHeartGlow(tg, t, 32, 26);
    const x = PAD + i * (w * 2 + 12);
    zoom(g, tile, w, h, x, y, 2);
    label(g, `STEP ${[0, 1, 2, 3][i]}`, x, y + h * 2 + 3, 'slate');
  });
  return c;
}

// ---------------------------------------------------------------- the final boss
function spiderCanvas(open: boolean, t: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 220; c.height = 84;
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = PAL.black; g.fillRect(0, 0, 220, 84);
  drawFinaleSpider(g, view({ id: 'flayer', x: 110, y: 44, t }), open);
  return c;
}

export function bossCard(): HTMLCanvasElement {
  const rowH = 84 * K + 16;
  const { c, g } = card(rowH * 2 + (12 + FAST_H * K + 22) + (12 + CHEST_H * K + 22) + (12 + (JOYCE_H * K + 16) * 2) + 24, 'night');
  let y = PAD;
  for (const [open, name] of [[false, 'THE SPIDER, CHEST SHUT: THE LIGHT CRAWLS DOWN THE SEAM'], [true, 'THE SPIDER, CHEST OPEN: VECNA IN THE HOLE, THE RIM BURNING']] as const) {
    label(g, name, PAD, y, 'amber');
    zoom(g, spiderCanvas(open, open ? 10 : 0), 220, 84, PAD, y + 12);
    y += rowH;
  }
  label(g, 'VECNA, FAST PHASE: IDLE, WALK, THE CLOCK CURSE, AND THE SINK AT 0 HP IN FOUR STEPS', PAD, y, 'amber');
  y += 12;
  const poses: [Px, string][] = [[vecnaFastPx('idle', 0), 'IDLE'], [vecnaFastPx('walk', 2), 'WALK'], [vecnaFastPx('cast', 0), 'CAST'], [vecnaFastPx('cast', 3), 'CAST 2'], [vecnaFastPx('sink', 1, 0.15), 'SINK 1'], [vecnaFastPx('sink', 2, 0.5), 'SINK 2'], [vecnaFastPx('sink', 3, 0.85), 'SINK 3']];
  poses.forEach(([p, cap], i) => {
    const x = PAD + i * (FAST_W * K + 8);
    g.fillStyle = PAL.blood0; g.fillRect(x, y, FAST_W * K, FAST_H * K);
    zoomPx(g, p, x, y);
    label(g, cap, x, y + FAST_H * K + 4, 'slate');
  });
  y += FAST_H * K + 22;
  label(g, 'THE CHEST, AT 3X: SHUT, THEN OPEN', PAD, y, 'amber');
  y += 12;
  ([[false, 0, 'SHUT'], [false, 3, 'SHUT 2'], [true, 1, 'OPEN'], [true, 5, 'OPEN 2']] as const).forEach(([open, ph, cap], i) => {
    const x = PAD + i * (CHEST_W * K + 12);
    g.fillStyle = PAL.blood1; g.fillRect(x, y, CHEST_W * K, CHEST_H * K);
    zoomPx(g, vecnaChestPx(open, ph), x, y);
    label(g, cap, x, y + CHEST_H * K + 4, 'slate');
  });
  y += CHEST_H * K + 22;
  label(g, 'JOYCE: IDLE, WALK, RAISE, SWING, FOLLOW THROUGH, DOWN, UP, RIGHT AND LEFT', PAD, y, 'amber');
  y += 12;
  (['down', 'up', 'right', 'left'] as const).forEach((dir, j) => {
    (['idle', 'walk', 'raise', 'swing', 'follow'] as const).forEach((pose, i) => {
      const x = PAD + (j & 1) * 5 * (JOYCE_W * K + 6) + i * (JOYCE_W * K + 6), yy = y + (j >> 1) * (JOYCE_H * K + 16);
      g.fillStyle = PAL.dusk; g.fillRect(x, yy, JOYCE_W * K, JOYCE_H * K);
      zoomPx(g, joycePx(pose, dir, 1), x, yy);
    });
  });
  return c;
}
