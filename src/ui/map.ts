// The Hawkins map between stages (docs/map-screen.md). gfx draws the whole screen from a MapView (gfx/map.ts); this scene owns
// the walk and the input and builds that view every frame: the nodes and their states, the party that would go in, the chapter,
// the stage name and one line of hints. The rules live in map_logic.ts so Node can test them.
import type { Scene } from '../core/scene.ts';
import type { CharId, HeroId, PartySeed } from '../core/types.ts';
import type { MapNode, MapView } from '../core/mapdata.ts';
import type { Progress } from '../core/progress.ts';
import { CHAPTERS, chapterOf, needsPicks, pickParty, poolFor, requiredFor } from '../core/campaign.ts';
import { shopOpen } from '../core/shop.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { audio } from '../audio/index.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { drawMapScreen, setLookStage } from '../gfx/index.ts';
import { box, inFrame } from './kit.ts';
import { hintLine, mapNodes, startHop, startNode, stepFrom, stepHop } from './map_logic.ts';
import type { Hop, ShopHint } from './map_logic.ts';
import { createPicksPanel } from './picks.ts';
import type { PicksPanel } from './picks.ts';
import { createShopPanel } from './shop.ts';
import type { ShopPanel } from './shop.ts';

export interface MapOpts {
  progress: Progress | null;
  /** Who would go into a stage, in party order. The first is the lead and the token. */
  party(stageId: string): PartySeed[];
  name(stageId: string): string;
  /** `picks` is who goes, lead first, from the party picks panel. A stage that needs no picks calls it without. */
  onPlay(stageId: string, picks?: HeroId[]): void;
  onQuit(): void;
  /** Erica's cart closed (docs/map-screen.md, "Erica's cart"): the progress it leaves, with the purse and stash it changed.
   *  Called on every close, bought or not. The map keeps the same record, so a reopened cart starts from it. */
  onShop?(p: Progress): void;
}

/** Frames the map ignores input for after it opens. */
const GRACE = 30;

export function createMapScene(opts: MapOpts): Scene {
  // The map's own copy of the record: Erica's cart changes the purse and the stash, and a reopened cart must start from them.
  let progress = opts.progress;
  const nodes = mapNodes(progress, opts.name);
  const nodeOf = (id: string): MapNode | undefined => nodes.find((n) => n.id === id);
  let sel = startNode(progress);
  let party = opts.party(sel);
  let t = 0;
  let hop: Hop | null = null;
  let k = 0;
  let left = false;
  /** The party picks panel while it is open over the map. */
  let picks: PicksPanel | null = null;
  /** Erica's cart while it is open over the map. */
  let shop: ShopPanel | null = null;

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

  /** Opens the picks panel for a stage with a pool bigger than the party, on the last party picked, fixed up for it. */
  const openPicks = (id: string): void => {
    picks = createPicksPanel({
      pool: poolFor(id, progress?.heroes ?? [], progress?.picks),
      locked: requiredFor(id),
      seed: pickParty(id, progress?.picks, progress?.heroes),
      onStart: (who) => leave(() => opts.onPlay(id, who)),
      onBack: () => { picks = null; },
    });
  };

  /** Opens the cart once chapter 3 is reached. On close the map keeps what it left and hands it to flow to save. */
  const openShop = (p: Progress): void => {
    audio.sfx('confirm');
    shop = createShopPanel({
      progress: p,
      onClose: (left) => { progress = left; shop = null; opts.onShop?.(left); },
    });
  };

  /** What the hint line needs to name SHOP, or nothing before the cart is open. */
  const cartHint = (): ShopHint | undefined => (shopOpen(progress) ? { key: labelOf('special'), pause: labelOf('pause') } : undefined);

  return {
    opaque: true,
    enter() {
      t = 0;
      audio.music('hawkins');
    },
    update(g) {
      t++;
      if (picks) { picks.update(g); return; }
      if (shop) { shop.update(g); return; }
      if (hop) {
        const s = stepHop(hop);
        hop = s.done ? null : s.hop;
        k = s.k;
        return;
      }
      // A short grace on arrival, so a confirm mashed through the results screen doesn't enter a stage at once.
      if (t < GRACE) return;
      const i = g.input;
      // Special opens the cart once chapter 3 is reached. X is special and cancel together, so this comes before cancel quits,
      // and a touch screen's B (the same pair) leaves by START instead.
      const cart = shopOpen(progress);
      if (cart && progress && i.pressed('special')) { openShop(progress); return; }
      if (i.pressed('cancel') || (cart && i.device() === 'touch' && i.pressed('pause'))) { audio.sfx('cancel'); leave(opts.onQuit); return; }
      if (i.pressed('confirm')) {
        if (nodeOf(sel)?.state === 'locked') { audio.sfx('cancel'); return; }
        audio.sfx('confirm');
        const id = sel;
        if (needsPicks(id)) { openPicks(id); return; }
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
        // The picks panel and the cart print their own legends, so the map's goes quiet while one is open. SHOP joins it
        // once the cart is open, and not before.
        hint: picks || shop ? '' : hintLine(getPromptDevice(), labelOf('attack'), cartHint()),
        t,
        calm: settings.reduceFlashing,
      };
      // On a wide window the map sits in the centered 256 px frame, like every other menu screen, over ink.
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      inFrame(ctx, () => {
        // The party band and the token wear the look of the selected stage's chapter (Hopper in Kamchatka, docs/level-10.md).
        setLookStage(view.selected);
        drawMapScreen(ctx, view);
        picks?.draw(ctx);
        shop?.draw(ctx);
      });
    },
  };
}
