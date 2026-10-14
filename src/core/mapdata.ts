// The Hawkins map screen's layout and what it draws. Pure data and types, no DOM: ui/map.ts runs the scene,
// gfx draws the terrain, nodes and token from a MapView. See docs/map-screen.md.
import type { CharId } from './types.ts';

export type NodeState = 'cleared' | 'open' | 'locked';

/** Screen px of each stage node on the 256 by 224 map, in play order. The path runs node to node. */
export const MAP_NODES: Record<string, { x: number; y: number }> = {
  '1.1': { x: 36, y: 150 },
  '1.2': { x: 84, y: 104 },
  '1.3': { x: 138, y: 134 },
  '2.1': { x: 186, y: 96 },
  '2.2': { x: 214, y: 132 },
  '2.3': { x: 232, y: 74 },
};

/** Which part of Hawkins each node sits in, so gfx can paint the land around it. */
export const MAP_PLACE: Record<string, 'woods' | 'lab' | 'school' | 'patch' | 'tunnels' | 'gate'> = {
  '1.1': 'woods', '1.2': 'lab', '1.3': 'school', '2.1': 'patch', '2.2': 'tunnels', '2.3': 'gate',
};

export interface MapNodeView { id: string; x: number; y: number; state: NodeState; place: (typeof MAP_PLACE)[string] }

/** Everything gfx needs for one frame of the map. The token walks between nodes; t is the frame counter. */
export interface MapView {
  nodes: MapNodeView[];
  /** The token's screen px (feet), and who it is (the party lead). */
  token: { x: number; y: number; who: CharId; walking: boolean };
  /** The node the token stands on or is walking to. */
  selected: string;
  t: number;
}
