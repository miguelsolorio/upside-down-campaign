// drawMap: the Hawkins map screen (docs/map-screen.md). The land is painted once per set of locks (map_land.ts) and cached;
// every frame adds the dotted trail, a pad for each node (cleared: lit with a small flag, open: pulsing, locked: grey with a
// padlock), and the token, the party lead's own sprite. The top 16 px and the bottom 48 px hold no decoration: UI draws its
// text and panels there.
import type { ActorView, Dir } from '../core/types.ts';
import type { MapNodeView, MapView } from '../core/mapdata.ts';
import { settings } from '../core/settings.ts';
import { discPx, ringPx, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { bendOf, paintLand, trailPoints } from './map_land.ts';
import type { LandNode } from './map_land.ts';

const lands = new Map<string, HTMLCanvasElement>();
const landNodes = (nodes: MapNodeView[]): LandNode[] => nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, place: n.place, locked: n.state === 'locked' }));

function landFor(nodes: MapNodeView[]): HTMLCanvasElement {
  const key = nodes.map((n) => `${n.id}@${n.x},${n.y}${n.place}${n.state === 'locked' ? 1 : 0}`).join('|');
  let c = lands.get(key);
  if (!c) { c = paintLand(landNodes(nodes)).toCanvas(); lands.set(key, c); }
  return c;
}

/** The dots along each trail: every sixth point, brighter where the way is open, with a bright one that marches toward an open node. */
function drawTrail(ctx: Ctx, nodes: MapNodeView[], t: number, calm: boolean): void {
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1] as MapNodeView, b = nodes[i] as MapNodeView;
    const open = b.state !== 'locked', next = b.state === 'open';
    const pts = trailPoints(a, b, bendOf(i - 1));
    const march = calm ? -1 : (t >> 3) % 5;
    for (let k = 7; k < pts.length - 7; k += 6) {
      const [x, y] = pts[k] as [number, number];
      const lit = open && next && ((k / 6) | 0) % 5 === march;
      rect(ctx, x - 1, y - 1, 2, 2, lit ? 'white' : open ? 'bone' : 'grey2');
    }
  }
}

/** The stage number, "1.1", in the 3x5 font (which has no dot, so the dot is a pixel). */
function label(ctx: Ctx, id: string, x: number, y: number, color: 'ink' | 'bone'): void {
  drawTinyText(ctx, id.charAt(0), x - 5, y - 2, color);
  rect(ctx, x - 1, y + 2, 1, 1, color);
  drawTinyText(ctx, id.charAt(2), x + 1, y - 2, color);
}

/** A node's pad: shadow, rim, a state color, its stage number in the 3x5 font, and what its state adds. */
function drawPad(ctx: Ctx, n: MapNodeView, selected: boolean, t: number, calm: boolean): void {
  const x = Math.round(n.x), y = Math.round(n.y);
  for (let i = -7; i <= 7; i++) if (((x + i + y) & 1) === 0) rect(ctx, x + i, y + 7, 1, 1, 'black');
  discPx(ctx, x, y, 7, 'ink');
  if (n.state === 'cleared') {
    discPx(ctx, x, y, 6, 'orange'); discPx(ctx, x, y, 5, 'amber'); rect(ctx, x - 3, y - 4, 3, 1, 'yellow'); rect(ctx, x - 4, y - 3, 1, 2, 'yellow');
    rect(ctx, x + 3, y - 12, 1, 10, 'bone'); rect(ctx, x + 4, y - 12, 5, 3, 'hot'); rect(ctx, x + 4, y - 9, 3, 1, 'red'); rect(ctx, x + 3, y - 13, 1, 1, 'white');
    label(ctx, n.id, x, y, 'ink');
  } else if (n.state === 'open') {
    const pulse = !calm && t % 60 >= 30;
    discPx(ctx, x, y, 6, pulse ? 'amber' : 'orange'); discPx(ctx, x, y, 5, pulse ? 'cream' : 'yellow'); rect(ctx, x - 3, y - 4, 3, 1, 'white'); rect(ctx, x - 4, y - 3, 1, 2, 'white');
    if (!calm && t % 60 < 30) ringPx(ctx, x, y, 8 + (t % 60) / 8, 'white');
    label(ctx, n.id, x, y, 'ink');
  } else {
    discPx(ctx, x, y, 6, 'grey1'); discPx(ctx, x, y, 5, 'grey2');
    rect(ctx, x - 2, y - 1, 5, 4, 'grey3'); rect(ctx, x - 1, y - 4, 3, 1, 'grey3'); rect(ctx, x - 2, y - 3, 1, 2, 'grey3'); rect(ctx, x + 2, y - 3, 1, 2, 'grey3'); rect(ctx, x, y, 1, 2, 'grey1');
  }
  if (selected) ringPx(ctx, x, y, 8, 'white');
}

/** Paints the map: land, trails, pads and the token. UI draws the text and the panels over it. */
export function drawMap(ctx: Ctx, view: MapView): void {
  const calm = settings.reduceFlashing;
  ctx.drawImage(landFor(view.nodes), 0, 0);
  drawTrail(ctx, view.nodes, view.t, calm);
  for (const n of view.nodes) drawPad(ctx, n, n.id === view.selected, view.t, calm);
  const to = view.nodes.find((n) => n.id === view.selected);
  const dx = to ? to.x - view.token.x : 0, dy = to ? to.y - view.token.y : 1;
  const dir: Dir = !view.token.walking ? 'down' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  const token: ActorView = {
    kind: 'hero', id: view.token.who, x: view.token.x, y: view.token.y, dir, anim: view.token.walking ? 'walk' : 'idle',
    t: view.t, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null,
  };
  drawActor(ctx, token);
}
