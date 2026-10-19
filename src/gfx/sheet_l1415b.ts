// Sheet pages for level 15 (docs/level-15.md), stage 5.2, the Abyss, and for chapter 5 on the map: the twin Demogorgons (the grey one and the red one) in
// every pose, the fall and the climb back with the effect at the edge, the Abyss itself (the backdrop scrolling behind islands, a vine bridge and a hole
// in the floor, a twin charging over the edge) and the map screen with the lockdown and the Abyss on it. Actors go through drawActor from a view.
import type { ActorView, Dir, FxView } from '../core/types.ts';
import type { MapNode, MapView, NodeState } from '../core/mapdata.ts';
import { MAP_PLACE } from '../core/mapdata.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawMapScreen } from './map.ts';
import { ORDER, hopLength } from './map_geo.ts';
import { drawAbyssBg } from './ch5/abyss_bg.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { head } from './sheet_l56b.ts';
import { foe, label } from './sheet_l1415.ts';

const twin = (x: number, y: number, over: Partial<ActorView> = {}): ActorView => foe('twin', x, y, over);

interface State { name: string; over: Partial<ActorView> }
const TWIN_STATES: State[] = [
  { name: 'STAND', over: { anim: 'idle' } }, { name: 'WALK', over: { anim: 'walk', t: 0 } }, { name: 'WALK', over: { anim: 'walk', t: 14 } },
  { name: 'WINDUP', over: { anim: 'attack', alert: true } }, { name: 'STRIKE', over: { anim: 'attack' } }, { name: 'CHARGE', over: { anim: 'walk', pose: 'charge', t: 0 } },
  { name: 'STUN', over: { anim: 'idle', pose: 'stun', t: 0 } }, { name: 'ENRAGED', over: { anim: 'idle', petals: true } }, { name: 'HURT', over: { anim: 'hurt' } }, { name: 'KO', over: { anim: 'ko' } },
];

// ---------------------------------------------------------------- the Abyss
/** A bit of the Abyss: two islands (a lawn with a porch, a road), a vine bridge between them, a hole in the lawn, and a ring's edge. 16 by 13 tiles. */
export const ABYSS = [
  'ùùùùùùùùùùùùùùùù', 'ù¸¸¸¸ýùùùùÿÿÿÿÿù', 'ù¸¸¸¸¸øøøøþþþþþù', 'ù¸¸ù¸¸ùùùùÿÿÿÿÿù', 'ù¸¸¸¸¸ùùùùÿÿÿÿÿù', 'ùûûûûûùùùùûûûûûù', 'ùúúúúúùùùùúúúúúù',
  'ùùùùùùùùùùùùùùùù', 'ùùùùùùüüüüüüüüùù', 'ùùùùùùüüüüüüüüùù', 'ùùùùùùüüüüüüüüùù', 'ùùùùùùûûûûûûûûùù', 'ùùùùùùúúúúúúúúùù',
];
const baked = new Map<string, BakedStage>();
/** The Abyss is a day stage: baked with no night pass. */
function bakeDay(key: string, rows: string[]): BakedStage {
  let b = baked.get(key);
  if (!b) { b = bakeStage(rows, false); baked.set(key, b); }
  return b;
}

const fxAt = (x: number, y: number, t: number, life = 48): FxView => ({ kind: 'fall', x, y, dir: 'down', angle: 0, t, life, w: 24, h: 24 });

const twins: Page = {
  title: 'THE ABYSS',
  subs: 5,
  draw(ctx, t, sub) {
    if (sub === 4) {
      // The abyss under the world: a camera drifting across it, so the backdrop scrolls against the tiles.
      const cam = { x: Math.round(40 + 40 * Math.sin(t / 180)), y: Math.round(10 + 8 * Math.sin(t / 130)) };
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
      ctx.clip();
      drawAbyssBg(ctx, t, cam.x, cam.y);
      ctx.translate(-cam.x, VIEW_TOP - cam.y);
      drawStage(ctx, bakeDay('l15abyss', ABYSS), cam.x, cam.y, t);
      drawActor(ctx, view('mike', 36, 60, { kind: 'hero', dir: 'right', anim: 'walk', t }));
      drawActor(ctx, foe('demofoe', 110, 40, { dir: 'left', anim: 'idle', t }));
      drawActor(ctx, twin(200, 150, { dir: 'down', anim: 'idle', t }));
      drawActor(ctx, twin(130, 168, { dir: 'down', anim: 'walk', pose: 'charge', t, second: true }));
      ctx.restore();
      head(ctx, 'THE VOID SCROLLS BEHIND THE ISLANDS');
      return;
    }
    ctx.fillStyle = PAL.blood0;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0) {
      drawText(ctx, 'THE TWIN DEMOGORGONS', 4, 3, 'white', { shadow: true });
      [false, true].forEach((second, r) => {
        label(ctx, second ? 'THE SECOND: RED' : 'THE FIRST: GREY', 4, 16 + r * 100, 'cream');
        (['down', 'left'] as Dir[]).forEach((d, q) => TWIN_STATES.forEach((s, i) => drawActor(ctx, twin(18 + i * 24, 62 + r * 100 + q * 38, { dir: d, second, ...s.over }))));
        TWIN_STATES.forEach((s, i) => label(ctx, s.name, 6 + i * 24, 104 + r * 100, 'mist'));
      });
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    if (sub === 1) {
      // Falling: k in eight steps, the grey one and the red one. The drop is what the sprite is drawn lower by.
      drawText(ctx, 'FALL: POSE FALL, K 0 TO 1', 4, 3, 'white', { shadow: true });
      [false, true].forEach((second, r) => {
        label(ctx, second ? 'THE SECOND' : 'THE FIRST', 4, 16 + r * 100, 'cream');
        for (let i = 0; i < 8; i++) {
          const k = i / 7;
          drawActor(ctx, twin(20 + i * 30, 52 + r * 100, { dir: 'down', pose: 'fall', k, second }));
          label(ctx, `K ${k.toFixed(1)}`, 10 + i * 30, 94 + r * 100);
        }
      });
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    // Climbing back: k from 1 to 0 over a ledge, then the effect at an edge, repeating.
    drawText(ctx, 'CLIMB: POSE CLIMB, K 1 TO 0', 4, 3, 'white', { shadow: true });
    [false, true].forEach((second, r) => {
      const y = 62 + r * 56;
      label(ctx, second ? 'THE SECOND' : 'THE FIRST', 4, y - 40, 'cream');
      for (let i = 0; i < 8; i++) {
        const k = 1 - i / 7;
        drawActor(ctx, twin(20 + i * 30, y, { dir: 'down', pose: 'climb', k, second }));
        ctx.fillStyle = PAL.soil1;
        ctx.fillRect(4 + i * 30, y + 1, 32, 3);
        label(ctx, `K ${k.toFixed(1)}`, 10 + i * 30, y + 8);
      }
    });
    ctx.fillStyle = PAL.soil1;
    ctx.fillRect(0, 176, SCREEN_W, 4);
    const ft = t % 80;
    drawFx(ctx, fxAt(60, 177, Math.min(47, ft)));
    drawFx(ctx, fxAt(170, 177, Math.min(47, (ft + 40) % 80)));
    label(ctx, 'THE FALL EFFECT AT AN EDGE, LOOPING', 4, 168, 'cream');
    drawText(ctx, 'UP DOWN', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- the map
const NAMES: Record<string, string> = {
  '1.1': 'The woods', '1.2': 'The lab', '1.3': 'The school', '2.1': 'The palace', '2.2': 'The tunnels', '2.3': 'The gate', '3.1': 'Starcourt Mall', '3.2': 'The base',
  '3.3': 'The food court', '4.1': 'Kamchatka', '4.2': 'The Creel House', '5.1': 'Hawkins Lockdown', '5.2': 'The Abyss',
};
const mapView = (cleared: number, selected: string, walk: MapView['walk'], t: number): MapView => ({
  nodes: ORDER.map((id, i): MapNode => ({ id, state: (i < cleared ? 'cleared' : i === cleared ? 'open' : 'locked') as NodeState, place: MAP_PLACE[id] as MapNode['place'], name: NAMES[id] as string })),
  selected, walk, lead: 'mike', party: [{ id: 'mike', level: 10 }, { id: 'dustin', level: 10 }, { id: 'hopper', level: 9 }, { id: 'eleven', level: 10 }],
  chapter: 'Chapter five', stage: NAMES[selected] as string, hint: 'ARROWS MOVE   Z PLAY   ESC BACK', t, calm: false,
});

const map: Page = {
  title: 'MAP CHAPTER 5',
  subs: 4,
  draw(ctx, t, sub) {
    if (sub === 3) {
      const a = hopLength('4.2', '5.1'), b = hopLength('5.1', '5.2'), cycle = Math.ceil((a + b) / 1.75) + 40, at = Math.min(a + b, (t % cycle) * 1.75);
      const [from, to, k] = at < a ? ['4.2', '5.1', at / a] as const : ['5.1', '5.2', (at - a) / b] as const;
      drawMapScreen(ctx, mapView(at < a ? 11 : 12, to, { from, to, k: Math.min(1, k) }, t));
    } else drawMapScreen(ctx, mapView([11, 12, 13][sub] as number, sub === 0 ? '5.1' : '5.2', null, t));
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 10, SCREEN_W, 9);
    drawText(ctx, ['5.1 IS NEXT', '5.2 IS NEXT', 'EVERYTHING CLEARED', 'LIVE: DOWN TO THE LOCKDOWN, THEN THE ABYSS'][sub] as string, 4, 11, 'white');
    drawText(ctx, 'UP DOWN', 200, 11, 'slate');
  },
};

export const L1415B_PAGES: Page[] = [twins, map];
