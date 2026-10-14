// The Hawkins map between stages (docs/map-screen.md). gfx paints the land, trail, pads and the token; this scene owns the
// walk, the input and the text: a bar on top with the chapter and the stage, and a band at the bottom with the party that
// would go in, then one line of hints. The rules live in map_logic.ts so Node can test them.
import type { Scene } from '../core/scene.ts';
import type { CharId, PartySeed } from '../core/types.ts';
import type { MapNodeView, MapView } from '../core/mapdata.ts';
import type { Progress } from '../core/progress.ts';
import { CHAPTERS, chapterOf } from '../core/campaign.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { CHAR_NAMES, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { drawMap, drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import { bigText, box, dither, outline } from './kit.ts';
import type { Ctx } from './kit.ts';
import { hintLine, mapNodes, routeBetween, startNode, stepFrom, walkStep } from './map_logic.ts';
import type { Route } from './map_logic.ts';

export interface MapOpts {
  progress: Progress | null;
  /** Who would go into a stage, in party order. The first is the lead and the token. */
  party(stageId: string): PartySeed[];
  name(stageId: string): string;
  onPlay(stageId: string): void;
  onQuit(): void;
}

const BAND_Y = 176;
const CELL_W = 62;

/** Frames the map ignores input for after it opens. */
const GRACE = 30;

export function createMapScene(opts: MapOpts): Scene {
  const nodes = mapNodes(opts.progress);
  const nodeOf = (id: string): MapNodeView | undefined => nodes.find((n) => n.id === id);
  let sel = startNode(opts.progress);
  let party = opts.party(sel);
  let t = 0;
  let route: Route | null = null;
  let dist = 0;
  const here = nodeOf(sel);
  let pos = { x: here?.x ?? 0, y: here?.y ?? 0 };
  let left = false;

  const leave = (fn: () => void): void => {
    if (left) return;
    left = true;
    fn();
  };

  /** Starts the walk to `to`. The party, the bar and the pad ring switch to it at once. */
  const walkTo = (to: string): void => {
    route = routeBetween(nodes, sel, to);
    dist = 0;
    sel = to;
    party = opts.party(to);
    audio.sfx('select');
  };

  function drawBars(ctx: Ctx): void {
    const ch = CHAPTERS[chapterOf(sel)];
    drawPanel(ctx, 0, 0, SCREEN_W, 16, 'hud');
    if (ch) drawText(ctx, ch.title, 6, 4, 'mist', { shadow: true });
    drawText(ctx, opts.name(sel), SCREEN_W - 6, 4, 'yellow', { align: 'right', shadow: true });

    dither(ctx, 0, BAND_Y - 4, SCREEN_W, 4, 'ink', 4);
    box(ctx, 0, BAND_Y, SCREEN_W, 48, 'ink');
    box(ctx, 0, BAND_Y, SCREEN_W, 1, 'slate');
    box(ctx, 0, BAND_Y + 1, SCREEN_W, 1, 'shadow');
  }

  /** Face, name and level for each hero who would go in. Names sit under the face and the level beside it. */
  function drawParty(ctx: Ctx): void {
    const x0 = Math.round((SCREEN_W - party.length * CELL_W) / 2);
    party.forEach((p, i) => {
      const x = x0 + i * CELL_W + 5, y = BAND_Y + 3;
      drawPortrait(ctx, p.id, 'neutral', x, y);
      outline(ctx, x - 1, y - 1, 26, 26, 'dusk');
      drawText(ctx, CHAR_NAMES[p.id], x, y + 25, 'white', { shadow: true });
      drawText(ctx, 'LV', x + 28, y + 1, 'mist', { shadow: true });
      bigText(ctx, String(p.level ?? 1), x + 28, y + 10, 'yellow', 2, 'left', true);
    });
  }

  return {
    opaque: true,
    enter() {
      t = 0;
      audio.music('hawkins');
    },
    update(g) {
      t++;
      if (route) {
        const s = walkStep(route, dist);
        dist = s.dist;
        pos = { x: s.x, y: s.y };
        if (s.done) route = null;
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
        token: { x: pos.x, y: pos.y, who: (party[0]?.id ?? 'mike') as CharId, walking: route !== null },
        selected: sel,
        t,
      };
      drawMap(ctx, view);
      drawBars(ctx);
      drawParty(ctx);
      drawText(ctx, hintLine(getPromptDevice(), labelOf('attack')), 128, 216, 'mist', { align: 'center', shadow: true });
    },
  };
}
