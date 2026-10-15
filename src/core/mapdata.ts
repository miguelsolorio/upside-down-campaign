// The Hawkins map screen's data: the node states and the one view the scene hands to gfx every frame. Pure types and a
// little data, no DOM. ui/map.ts runs the scene, gfx/map.ts draws the whole screen from a MapView, and the layout (where
// each stage sits on the screen) belongs to gfx. See docs/map-screen.md.
import type { CharId } from './types.ts';

export type NodeState = 'cleared' | 'open' | 'locked';

export type Place = 'woods' | 'lab' | 'school' | 'patch' | 'tunnels' | 'gate';

/** Which part of Hawkins each stage sits in. */
export const MAP_PLACE: Record<string, Place> = {
  '1.1': 'woods', '1.2': 'lab', '1.3': 'school', '2.1': 'patch', '2.2': 'tunnels', '2.3': 'gate',
};

export interface MapNode {
  /** Stage id, '1.1' to '2.3', in play order. */
  id: string;
  state: NodeState;
  place: Place;
  /** The stage's name, as the game prints it. */
  name: string;
}

/** Everything gfx needs for one frame of the whole 256 by 224 map screen, bars and party band included. */
export interface MapView {
  /** Every node in play order. */
  nodes: MapNode[];
  /** The node the token stands on, or is walking to. */
  selected: string;
  /** While the token walks: from one node to another, k from 0 to 1 along the route. Null when it stands still. */
  walk: { from: string; to: string; k: number } | null;
  /** The party lead, drawn as the token. */
  lead: CharId;
  /** The party for the selected stage, lead first. */
  party: { id: CharId; level: number }[];
  /** For example Chapter two. */
  chapter: string;
  /** The selected stage's name, for example The Palace and the Patch. */
  stage: string;
  /** The controls line. Runs of two or more spaces split it into the lines of the legend. */
  hint: string;
  /** Frame counter at 60 Hz. */
  t: number;
  /** Reduce flashing: no blinking, slow pulses only. */
  calm: boolean;
}
