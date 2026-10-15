// The rules of the Hawkins map screen that Node can test: which nodes there are and what state each is in, where the
// token starts, where a step goes, the walk along a hop and the hint line. No DOM here; ui/map.ts runs the scene and
// gfx/map.ts draws it. See docs/map-screen.md.
import { MAP_PLACE } from '../core/mapdata.ts';
import type { MapNode, NodeState } from '../core/mapdata.ts';
import { STAGES_AHEAD, STAGE_ORDER } from '../core/campaign.ts';
import { nextUncleared } from '../core/progress.ts';
import type { Progress } from '../core/progress.ts';
import { hopLength } from '../gfx/map_geo.ts';
import type { PromptDevice } from '../core/bindings.ts';

/** How far the token walks in one frame, in px along the route. */
export const WALK_SPEED = 1.75;

/** Every node on the map in play order: the stages of this build, then the ones shown locked past the end. `name` gives a stage its name. */
export function mapNodes(p: Progress | null, name: (id: string) => string = (id) => id): MapNode[] {
  const ids = [...STAGE_ORDER, ...STAGES_AHEAD.filter((id) => !STAGE_ORDER.includes(id))].filter((id) => id in MAP_PLACE);
  const open = nextUncleared(p);
  return ids.map((id) => {
    const state: NodeState = (p?.cleared ?? []).includes(id) ? 'cleared' : id === open ? 'open' : 'locked';
    return { id, state, place: MAP_PLACE[id] as MapNode['place'], name: name(id) };
  });
}

/** Where the token starts: the next uncleared stage, or the last stage of the build when every one is cleared. */
export function startNode(p: Progress | null): string {
  return nextUncleared(p) ?? (STAGE_ORDER[STAGE_ORDER.length - 1] as string);
}

/** The node a step left (-1) or right (+1) of `from` lands on, skipping locked ones. `from` itself if there is none. */
export function stepFrom(nodes: MapNode[], from: string, dir: -1 | 1): string {
  const i = nodes.findIndex((n) => n.id === from);
  if (i < 0) return from;
  for (let j = i + dir; j >= 0 && j < nodes.length; j += dir) {
    if ((nodes[j] as MapNode).state !== 'locked') return (nodes[j] as MapNode).id;
  }
  return from;
}

/** A walk from one node to another: how far it is in px along the route, and how far the token has come. */
export interface Hop { from: string; to: string; len: number; dist: number }

/** The start of a walk. A hop to the same node, or to an unknown one, has no length and is over at once. */
export function startHop(from: string, to: string): Hop {
  return { from, to, len: hopLength(from, to), dist: 0 };
}

/** One frame of the walk: the hop moved on by `speed` px, how far along it is (k from 0 to 1) and whether it has arrived. */
export function stepHop(h: Hop, speed = WALK_SPEED): { hop: Hop; k: number; done: boolean } {
  const dist = Math.min(h.len, h.dist + speed);
  return { hop: { ...h, dist }, k: h.len > 0 ? dist / h.len : 1, done: dist >= h.len };
}

/**
 * The one line of hints at the bottom. A keyboard names the arrows and Escape, which always work, and the attack key as
 * the player has bound it. A controller names the stick, A and B, and the touch screen's Game Boy its D-pad, A and B.
 * None names a key another device doesn't have.
 */
export function hintLine(device: PromptDevice, attack: string): string {
  if (device === 'gamepad') return `STICK MOVE   ${attack} PLAY   B BACK`;
  if (device === 'touch') return `D-PAD MOVE   ${attack} PLAY   B BACK`;
  return `ARROWS MOVE   ${attack} PLAY   ESC BACK`;
}
