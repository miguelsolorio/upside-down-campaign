// The party picks design review (picks-variations.html): five layouts for the panel, each drawn over the real map screen
// with the game's own renderer. Every card shows the same state (stage 2.2, six heroes, four picked, Max locked, the cursor
// on Dustin, START live) at 3x with a real size copy beside it. The panel draws inside inFrame, as the built one will.
import { drawMapScreen, drawTinyText } from '../../gfx/index.ts';
import { MAP_PLACE } from '../../core/mapdata.ts';
import type { MapNode, MapView } from '../../core/mapdata.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf } from '../../core/campaign.ts';
import { inFrame } from '../kit.ts';
import { STAGE, sampleState } from './picks_kit.ts';
import type { PicksOption } from './picks_kit.ts';
import { ROW } from './picks_row.ts';
import { LIST } from './picks_list.ts';
import { GRID } from './picks_grid.ts';
import { SLOTS } from './picks_slots.ts';
import { BAND } from './picks_band.ts';

export const PICKS_OPTS: PicksOption[] = [ROW, LIST, GRID, SLOTS, BAND];

/** The canvas: the screen at 3x, then a 1x copy at the right. */
export const CARD_W = 1040, CARD_H = 672;
const SCALE = 3, REAL_X = 784;

/** The map behind the panel: 1.1 to 2.1 cleared, the stage open, the token on it, and the band showing the party. The map's
 * own hints are off while a panel is open, since the panel prints its own legend. */
function mapBehind(party: { id: MapView['lead']; level: number }[], t: number): MapView {
  const at = STAGE_ORDER.indexOf(STAGE);
  const nodes: MapNode[] = STAGE_ORDER.map((id, i) => ({
    id, place: MAP_PLACE[id] as MapNode['place'], name: id, state: i < at ? 'cleared' : i === at ? 'open' : 'locked',
  }));
  return {
    nodes, selected: STAGE, walk: null, lead: party[0]?.id ?? 'mike', party,
    chapter: CHAPTERS[chapterOf(STAGE)]?.title ?? '', stage: 'The tunnels', hint: '', t, calm: false,
  };
}

export interface PicksCard { o: PicksOption; canvas: HTMLCanvasElement; render(t: number): void }

export function picksCard(o: PicksOption): PicksCard {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  canvas.setAttribute('data-snap', `picks-${o.slug}`);
  canvas.setAttribute('aria-label', `${o.name}: the party picks panel over the map, at 3x and at real size`);
  const off = document.createElement('canvas');
  off.width = 256;
  off.height = 224;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const og = off.getContext('2d') as CanvasRenderingContext2D;
  const state = sampleState();
  const party = state.rows.filter((r) => r.slot > 0).sort((a, b) => a.slot - b.slot).map((r) => ({ id: r.id, level: r.level }));
  return {
    o, canvas,
    render(t) {
      og.save();
      drawMapScreen(og, mapBehind(party, t));
      inFrame(og, () => o.draw(og, state, t));
      og.restore();
      g.fillStyle = '#0a0a14';
      g.fillRect(0, 0, CARD_W, CARD_H);
      g.imageSmoothingEnabled = false;
      g.drawImage(off, 0, 0, 256 * SCALE, 224 * SCALE);
      g.drawImage(off, REAL_X, 12);
      drawTinyText(g, '1X REAL SIZE', REAL_X, 3, 'mist');
    },
  };
}
