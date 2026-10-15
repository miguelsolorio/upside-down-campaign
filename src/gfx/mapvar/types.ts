// The contract for the map screen design review (map-variations.html). Each variant draws the whole 256 by 224 map
// screen, top bar and party band included, from a VarView. Variants pick their own node layout and path, since the
// composition is the design. The chosen one replaces gfx/map.ts and the bars in ui/map.ts.
import type { CharId } from '../../core/types.ts';
import type { NodeState } from '../../core/mapdata.ts';
import type { Ctx } from '../canvas.ts';

export type Place = 'woods' | 'lab' | 'school' | 'patch' | 'tunnels' | 'gate';

export interface VarNode {
  /** Stage id, '1.1' to '2.3', in play order. */
  id: string;
  state: NodeState;
  place: Place;
  /** Stage name in caps, as the game prints it. */
  name: string;
}

export interface VarView {
  /** Every node in play order: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3. */
  nodes: VarNode[];
  /** The node the token stands on, or is walking to. */
  selected: string;
  /** While the token walks: from one node to the next, k from 0 to 1. Null when it stands still. */
  walk: { from: string; to: string; k: number } | null;
  /** The party lead, drawn as the token. */
  lead: CharId;
  /** The party for the selected stage, lead first. */
  party: { id: CharId; level: number }[];
  /** For example CHAPTER TWO. */
  chapter: string;
  /** The selected stage's name, for example THE PALACE AND THE PATCH. */
  stage: string;
  /** The controls line, for example ARROWS MOVE  Z PLAY  ESC BACK. */
  hint: string;
  /** Frame counter at 60 Hz. */
  t: number;
  /** Reduce flashing: no blinking, slow pulses only. */
  calm: boolean;
}

export interface MapVariant {
  id: number;
  name: string;
  /** One or two sentences: the idea and why it fits. */
  blurb: string;
  draw(ctx: Ctx, v: VarView): void;
}
