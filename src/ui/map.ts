// The Hawkins map between stages (docs/map-screen.md). gfx draws the whole screen from a MapView (gfx/map.ts); this scene owns
// the walk and the input and builds that view every frame: the nodes and their states, the party that would go in, the chapter,
// the stage name and one line of hints. The rules live in map_logic.ts so Node can test them.
import type { Scene } from '../core/scene.ts';
import type { CharId, PartySeed } from '../core/types.ts';
import type { MapNode, MapView } from '../core/mapdata.ts';
import type { Progress } from '../core/progress.ts';
import { CHAPTERS, chapterOf } from '../core/campaign.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { audio } from '../audio/index.ts';
import { drawMapScreen } from '../gfx/index.ts';
import { hintLine, mapNodes, startHop, startNode, stepFrom, stepHop } from './map_logic.ts';
import type { Hop } from './map_logic.ts';

export interface MapOpts {
  progress: Progress | null;
  /** Who would go into a stage, in party order. The first is the lead and the token. */
  party(stageId: string): PartySeed[];
  name(stageId: string): string;
  onPlay(stageId: string): void;
  onQuit(): void;
}

/** Frames the map ignores input for after it opens. */
const GRACE = 30;

export function createMapScene(opts: MapOpts): Scene {
  const nodes = mapNodes(opts.progress, opts.name);
  const nodeOf = (id: string): MapNode | undefined => nodes.find((n) => n.id === id);
  let sel = startNode(opts.progress);
  let party = opts.party(sel);
  let t = 0;
  let hop: Hop | null = null;
  let k = 0;
  let left = false;

  const leave = (fn: () => void): void => {
    if (left) return;
    left = true;
    fn();
  };

  /** Starts the walk to `to`. The party, the bar and the selection switch to it at once. */
  const walkTo = (to: string): void => {
    hop = startHop(sel, to);
    k = 0;
    sel = to;
    party = opts.party(to);
    audio.sfx('select');
  };

  return {
    opaque: true,
    enter() {
      t = 0;
      audio.music('hawkins');
    },
    update(g) {
      t++;
      if (hop) {
        const s = stepHop(hop);
        hop = s.done ? null : s.hop;
        k = s.k;
        return;
      }
      // A short grace on arrival, so a confirm mashed through the results screen doesn't enter a stage at once.
      if (t < GRACE) return;
      const i = g.input;
      if (i.pressed('cancel')) { audio.sfx('cancel'); leave(opts.onQuit); return; }
      if (i.pressed('confirm')) {
        if (nodeOf(sel)?.state === 'locked') { audio.sfx('cancel'); return; }
        audio.sfx('confirm');
        const id = sel;
        leave(() => opts.onPlay(id));
        return;
      }
      const dir = i.pressed('left') || i.pressed('up') ? -1 : i.pressed('right') || i.pressed('down') ? 1 : 0;
      if (dir === 0) return;
      const to = stepFrom(nodes, sel, dir);
      if (to !== sel) walkTo(to);
    },
    draw(ctx) {
      const view: MapView = {
        nodes,
        selected: sel,
        walk: hop ? { from: hop.from, to: hop.to, k } : null,
        lead: (party[0]?.id ?? 'mike') as CharId,
        party: party.map((p) => ({ id: p.id, level: p.level ?? 1 })),
        chapter: CHAPTERS[chapterOf(sel)]?.title ?? '',
        stage: opts.name(sel),
        hint: hintLine(getPromptDevice(), labelOf('attack')),
        t,
        calm: settings.reduceFlashing,
      };
      drawMapScreen(ctx, view);
    },
  };
}
