// The rules of the Hawkins map screen that Node can test: which nodes there are and what state each is in, where the
// token starts, where a step goes, the walk along the trail and the hint line. No DOM here; ui/map.ts draws and listens.
// See docs/map-screen.md.
import { MAP_NODES, MAP_PLACE } from '../core/mapdata.ts';
import type { MapNodeView, NodeState } from '../core/mapdata.ts';
import { STAGES_AHEAD, STAGE_ORDER } from '../core/campaign.ts';
import { nextUncleared } from '../core/progress.ts';
import type { Progress } from '../core/progress.ts';
import { bendOf, trailPoints } from '../gfx/map_land.ts';
import type { PromptDevice } from '../core/bindings.ts';

/** How far the token walks in one frame, in px along the trail. */
export const WALK_SPEED = 2;

/** Every node on the map in play order: the stages of this build, then the ones shown locked past the end. */
export function mapNodes(p: Progress | null): MapNodeView[] {
  const ids = [...STAGE_ORDER, ...STAGES_AHEAD.filter((id) => !STAGE_ORDER.includes(id))].filter((id) => id in MAP_NODES);
  const open = nextUncleared(p);
  return ids.map((id) => {
    const at = MAP_NODES[id] as { x: number; y: number };
    const state: NodeState = (p?.cleared ?? []).includes(id) ? 'cleared' : id === open ? 'open' : 'locked';
    return { id, x: at.x, y: at.y, state, place: MAP_PLACE[id] as MapNodeView['place'] };
  });
}

/** Where the token starts: the next uncleared stage, or the last stage of the build when every one is cleared. */
export function startNode(p: Progress | null): string {
  return nextUncleared(p) ?? (STAGE_ORDER[STAGE_ORDER.length - 1] as string);
}

/** The node a step left (-1) or right (+1) of `from` lands on, skipping locked ones. `from` itself if there is none. */
export function stepFrom(nodes: MapNodeView[], from: string, dir: -1 | 1): string {
  const i = nodes.findIndex((n) => n.id === from);
  if (i < 0) return from;
  for (let j = i + dir; j >= 0 && j < nodes.length; j += dir) {
    if ((nodes[j] as MapNodeView).state !== 'locked') return (nodes[j] as MapNodeView).id;
  }
  return from;
}

/** A path for the token: points along the trail and the arc length reached at each one. */
export interface Route { pts: [number, number][]; cum: number[] }

/** The trail from one node to another, the same curve gfx paints between neighbours, reversed when walking left. */
export function routeBetween(nodes: MapNodeView[], from: string, to: string): Route {
  const a = nodes.findIndex((n) => n.id === from), b = nodes.findIndex((n) => n.id === to);
  const pts: [number, number][] = [];
  if (a < 0 || b < 0 || a === b) {
    const n = nodes[Math.max(a, 0)];
    if (n) pts.push([n.x, n.y]);
  } else if (a < b) {
    for (let i = a; i < b; i++) {
      const seg = trailPoints(nodes[i] as MapNodeView, nodes[i + 1] as MapNodeView, bendOf(i));
      pts.push(...(i === a ? seg : seg.slice(1)));
    }
  } else {
    for (let i = a - 1; i >= b; i--) {
      const seg = trailPoints(nodes[i] as MapNodeView, nodes[i + 1] as MapNodeView, bendOf(i)).reverse();
      pts.push(...(i === a - 1 ? seg : seg.slice(1)));
    }
  }
  const cum: number[] = [];
  pts.forEach((p, i) => {
    const q = pts[i - 1];
    cum.push(i === 0 || !q ? 0 : (cum[i - 1] as number) + Math.hypot(p[0] - q[0], p[1] - q[1]));
  });
  return { pts, cum };
}

export const routeLength = (r: Route): number => r.cum[r.cum.length - 1] ?? 0;

/** The point `dist` px along the route, held at the ends. */
export function pointAt(r: Route, dist: number): { x: number; y: number } {
  const last = r.pts.length - 1;
  if (last < 0) return { x: 0, y: 0 };
  if (dist <= 0 || last === 0) return { x: (r.pts[0] as [number, number])[0], y: (r.pts[0] as [number, number])[1] };
  if (dist >= routeLength(r)) return { x: (r.pts[last] as [number, number])[0], y: (r.pts[last] as [number, number])[1] };
  let i = 1;
  while (i < last && (r.cum[i] as number) < dist) i++;
  const c0 = r.cum[i - 1] as number, c1 = r.cum[i] as number;
  const k = c1 > c0 ? (dist - c0) / (c1 - c0) : 0;
  const p0 = r.pts[i - 1] as [number, number], p1 = r.pts[i] as [number, number];
  return { x: p0[0] + (p1[0] - p0[0]) * k, y: p0[1] + (p1[1] - p0[1]) * k };
}

/** One frame of the walk: how far along the token is now, where that is, and whether it has arrived. */
export function walkStep(r: Route, dist: number, speed = WALK_SPEED): { dist: number; x: number; y: number; done: boolean } {
  const len = routeLength(r);
  const d = Math.min(len, dist + speed);
  return { dist: d, ...pointAt(r, d), done: d >= len };
}

/**
 * The one line of hints at the bottom. A keyboard names the arrows and Escape, which always work, and the attack key as
 * the player has bound it. A controller names the stick, A and B. Neither names a key the other device doesn't have.
 */
export function hintLine(device: PromptDevice, attack: string): string {
  return device === 'gamepad' ? `STICK MOVE   ${attack} PLAY   B BACK` : `ARROWS MOVE   ${attack} PLAY   ESC BACK`;
}
