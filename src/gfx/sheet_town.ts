// Sheet pages for the rest of stage 2.1: the demodog, the vine, the pod and Max in every pose (up and down change the way
// they face, the last sub page is a live scene), Will's bolt and the reveal shimmer, and the map screen in each state it
// has. The tiles, the stages and the props are in sheet_patch.ts.
import type { ActorView, Dir, FxKind, FxView } from '../core/types.ts';
import type { MapView, NodeState } from '../core/mapdata.ts';
import { MAP_PLACE } from '../core/mapdata.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawFx } from './fx.ts';
import { drawProp } from './props.ts';
import { drawMapScreen } from './map.ts';
import { hopLength } from './map_geo.ts';
import { drawPortrait } from './ui.ts';
import { PAL } from './palette.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const foe = (id: string, x: number, y: number, over: Partial<ActorView>): ActorView => view(id, x, y, { kind: 'enemy', ...over });

const DOG: [string, Partial<ActorView>][] = [
  ['IDLE', { anim: 'idle', t: 0 }], ['IDLE2', { anim: 'idle', t: 30 }], ['STEP1', { anim: 'walk', t: 0 }], ['STEP2', { anim: 'walk', t: 12 }], ['WIND', { anim: 'attack', alert: true, t: 0 }],
  ['WIND2', { anim: 'attack', alert: true, t: 4 }], ['LUNGE', { anim: 'dash' }], ['HURT', { anim: 'hurt' }], ['KO', { anim: 'ko' }],
];
const VINE: [string, Partial<ActorView>][] = [
  ['COIL', { anim: 'idle', t: 0 }], ['COIL2', { anim: 'idle', t: 40 }], ['REAR', { anim: 'attack', alert: true, t: 0 }], ['REAR2', { anim: 'attack', alert: true, t: 8 }],
  ['LASH', { anim: 'attack', t: 34 }], ['HURT', { anim: 'hurt' }], ['WILT', { anim: 'ko' }], ['HIDE', { anim: 'idle', hidden: true }],
];
const POD: [string, Partial<ActorView>][] = [
  ['REST', { anim: 'idle' }], ['SWELL', { anim: 'attack', alert: true, t: 8 }], ['MORE', { anim: 'attack', alert: true, t: 18 }], ['TAUT', { anim: 'attack', alert: true, t: 30 }],
  ['GOING', { anim: 'attack', alert: true, t: 39 }], ['BURST', { anim: 'ko', t: 1 }], ['SHARDS', { anim: 'ko', t: 5 }], ['HUSK', { anim: 'ko', t: 12 }], ['HIDE', { anim: 'idle', hidden: true }],
];

const floorBake = (night: boolean): BakedStage => bakeStage(Array.from({ length: 14 }, () => '^'.repeat(16)), night);
let floor: BakedStage | null = null;

const foes: Page = {
  title: 'PATCH FOES AND MAX',
  subs: 5,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.soil1;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 4) { live(ctx, t); return; }
    const dir = DIRS[sub] as Dir;
    drawText(ctx, `DEMODOG VINE POD MAX FACING ${dir.toUpperCase()}`, 4, 3, 'white', { shadow: true });
    DOG.forEach(([name, over], i) => { drawActor(ctx, foe('demodog', 14 + i * 28, 42, { dir, ...over })); drawTinyText(ctx, name, 14 + i * 28 - ((name.length * 4 - 1) >> 1), 44, 'cream'); });
    VINE.forEach(([name, over], i) => { drawActor(ctx, foe('vine', 16 + i * 32, 84, { dir, ...over })); drawTinyText(ctx, name, 16 + i * 32 - ((name.length * 4 - 1) >> 1), 86, 'cream'); });
    POD.forEach(([name, over], i) => { drawActor(ctx, foe('pod', 14 + i * 28, 124, { dir, ...over })); drawTinyText(ctx, name, 14 + i * 28 - ((name.length * 4 - 1) >> 1), 126, 'cream'); });
    for (let i = 0; i < 4; i++) {
      drawActor(ctx, view('max', 14 + i * 28, 168, { kind: 'npc', dir: DIRS[i] as Dir, anim: 'idle', t }));
      drawActor(ctx, view('max', 130 + i * 28, 168, { kind: 'npc', dir, anim: 'walk', t: t + i * 7 }));
    }
    drawText(ctx, 'MAX', 4, 172, 'cream', { shadow: true });
    (['neutral', 'happy', 'determined', 'worried'] as const).forEach((e, i) => drawPortrait(ctx, 'max', e, 10 + i * 28, 178));
  },
};

/** A scene as the game plays it: a pack of demodogs taking turns, a vine lashing, a pod swelling, bursting and going quiet. */
function live(ctx: Ctx, t: number): void {
  floor ??= floorBake(false);
  ctx.save();
  ctx.translate(0, VIEW_TOP);
  drawStage(ctx, floor, 0, 0, t);
  drawText(ctx, 'LIVE: A PACK, A VINE, A POD', 4, 4 - VIEW_TOP + 3, 'white', { shadow: true });
  const hero = { x: 120, y: 96 };
  drawActor(ctx, view('mike', hero.x, hero.y, { dir: 'right', anim: 'idle', t }));
  [0, 1, 2].forEach((i) => {
    const k = (t + i * 70) % 210;
    const a = (t / 90 + i * 2.1), r = 46;
    let x = hero.x + Math.cos(a) * r, y = hero.y + Math.sin(a) * r * 0.8, over: Partial<ActorView> = { anim: 'walk', t, dir: Math.cos(a) > 0 ? 'left' : 'right' };
    if (k >= 100 && k < 128) over = { anim: 'attack', alert: true, t: k - 100, dir: x < hero.x ? 'right' : 'left' };
    else if (k >= 128 && k < 142) { const u = (k - 128) / 14; x += (hero.x - x) * u * 0.8; y += (hero.y - y) * u * 0.8; over = { anim: 'dash', t: k - 128, dir: x < hero.x ? 'right' : 'left' }; }
    else if (k >= 142 && k < 172) { x += (hero.x - x) * 0.8; y += (hero.y - y) * 0.8; over = { anim: 'idle', t: k, dir: x < hero.x ? 'right' : 'left' }; }
    drawActor(ctx, foe('demodog', x, y, over));
  });
  const k = t % 100;
  drawActor(ctx, foe('vine', 40, 60, { dir: 'right', anim: k < 30 ? 'attack' : k < 42 ? 'attack' : 'idle', alert: k < 30, t: k < 42 ? k : t }));
  const p = t % 180;
  if (p < 50) drawActor(ctx, foe('pod', 210, 60, { dir: 'down', anim: 'idle', t }));
  else if (p < 90) drawActor(ctx, foe('pod', 210, 60, { dir: 'down', anim: 'attack', alert: true, t: p - 50 }));
  else if (p < 140) { drawActor(ctx, foe('pod', 210, 60, { dir: 'down', anim: 'ko', t: p - 90 })); drawFx(ctx, { kind: 'spore', x: 210, y: 60, dir: 'down', angle: 0, t: p - 90, life: 50, w: 56, h: 32 }); }
  ctx.restore();
}

const fxv = (kind: FxKind, x: number, y: number, t: number, life: number, angle = 0, w = 0, h = 0): FxView => ({ kind, x, y, dir: 'right', angle, t, life, w, h });

const effects: Page = {
  title: 'BOLT AND REVEAL',
  subs: 2,
  draw(ctx, t, sub) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    floor ??= floorBake(false);
    drawStage(ctx, floor, 0, 0, t);
    if (sub === 0) {
      for (let i = 0; i < 8; i++) drawFx(ctx, fxv('bolt', 20 + i * 30, 20, i * 4, 160, (i * Math.PI) / 4, 8, 8));
      for (let i = 0; i < 6; i++) drawFx(ctx, fxv('bolt', 30 + i * 36, 50, i * 8, 160, 0, 8, 8));
      [0, 6, 12, 18, 24, 30, 36].forEach((f, i) => { drawProp(ctx, { id: `h${i}`, kind: 'hidden', x: 12 + i * 34, y: 76, w: 16, h: 32, state: f > 14 ? 'open' : 'closed', t: Math.max(0, f - 14) }); drawFx(ctx, fxv('reveal', 20 + i * 34, 92, f, 40, 0, 16, 32)); });
    } else {
      const k = t % 160;
      drawActor(ctx, view('will', 40, 90, { dir: 'right', anim: k < 20 ? 'cast' : 'idle', t: k }));
      for (let i = 0; i < 3; i++) { const s = 20 + i * 24, f = k - s; if (f >= 0 && f < 70) drawFx(ctx, fxv('bolt', 50 + f * 1.6, 82 + i * 8, f, 70, 0, 8, 8)); }
      const open = k > 110;
      drawProp(ctx, { id: 'hid', kind: 'hidden', x: 200, y: 64, w: 16, h: 32, state: open ? 'open' : 'closed', t: open ? k - 110 : 0 });
      if (k > 100 && k < 140) drawFx(ctx, fxv('reveal', 208, 80, k - 100, 40, 0, 16, 32));
    }
    ctx.restore();
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, SCREEN_W, VIEW_TOP);
    drawText(ctx, sub === 0 ? 'BOLT IN EIGHT WAYS, REVEAL OVER TIME' : 'LIVE: WILL AND THE HIDDEN PATH', 6, 6, 'white');
    drawText(ctx, 'UP DOWN', 200, 214, 'slate');
  },
};

// ---------------------------------------------------------------- the map
const IDS = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'];
const NAMES = ['The woods', 'The lab', 'The school', 'The palace', 'The tunnels', 'The gate'];
const PARTY = [{ id: 'mike' as const, level: 5 }, { id: 'dustin' as const, level: 4 }, { id: 'lucas' as const, level: 4 }, { id: 'eleven' as const, level: 4 }];
const mapView = (states: NodeState[], selected: string, walk: MapView['walk'], t: number): MapView => ({
  nodes: IDS.map((id, i) => ({ id, state: states[i] as NodeState, place: MAP_PLACE[id] as 'woods', name: NAMES[i] as string })),
  selected, walk, lead: 'mike', party: PARTY, chapter: `Chapter ${selected.startsWith('1') ? 'one' : 'two'}`, stage: NAMES[IDS.indexOf(selected)] as string,
  hint: 'ARROWS MOVE   Z PLAY   ESC BACK', t, calm: false,
});
const STATES: NodeState[][] = [
  ['open', 'locked', 'locked', 'locked', 'locked', 'locked'],
  ['cleared', 'cleared', 'open', 'locked', 'locked', 'locked'],
  ['cleared', 'cleared', 'cleared', 'cleared', 'locked', 'locked'],
];
const LABELS = ['A NEW GAME', 'THE SCHOOL IS NEXT', 'CHAPTER 1 AND THE PATCH CLEARED', 'LIVE: THE TOKEN WALKS THE ROUTE'];

const map: Page = {
  title: 'MAP',
  subs: 4,
  draw(ctx, t, sub) {
    if (sub < 3) {
      drawMapScreen(ctx, mapView(STATES[sub] as NodeState[], sub === 0 ? '1.1' : sub === 1 ? '1.3' : '2.1', null, t));
    } else {
      // Walk 1.1 to 2.1 and back, 1.75 px a frame along the route, with the states of the last page.
      const len = hopLength('1.1', '2.1'), cycle = Math.ceil(len / 1.75) + 40;
      const u = t % (2 * cycle), fwd = u < cycle, k = Math.min(1, (fwd ? u : u - cycle) / (cycle - 40));
      const from = fwd ? '1.1' : '2.1', to = fwd ? '2.1' : '1.1';
      drawMapScreen(ctx, mapView(STATES[2] as NodeState[], to, { from, to, k: k >= 1 ? 1 : k }, t));
    }
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 10, SCREEN_W, 9);
    drawText(ctx, LABELS[sub] as string, 4, 11, 'white');
    drawText(ctx, 'UP DOWN', 200, 11, 'slate');
  },
};

export const TOWN_PAGES: Page[] = [foes, effects, map];
