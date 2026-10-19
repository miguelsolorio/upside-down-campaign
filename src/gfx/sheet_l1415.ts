// Sheet page for level 14 (docs/level-14.md), stage 5.1, Hawkins under lockdown: the trooper in the states the sim can put him in (shield up, shield
// down, broken, flanking, bursting, hurt, down), the Commander with his shield whole and cracked, the army's props (the floodlight with its cone,
// the boom gate shut and smashed), and a checkpoint baked and lit the way the stage is, at night. Every actor goes through drawActor from a view, so
// it shows what the game draws. The Abyss and the map are in sheet_l1415b.ts.
import type { ActorView, Dir, PropKind, PropState } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText, drawTinyText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawProp } from './props.ts';
import { drawTowerCone, towerPool } from './props_army.ts';
import { paintGlow } from './glow.ts';
import type { Glow } from './glow.ts';
import { PAL } from './palette.ts';
import { drawStage } from './tiles.ts';
import { view } from './sheet_a.ts';
import type { Page } from './sheet_a.ts';
import { bake, head, prop } from './sheet_l56b.ts';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
export const label = (ctx: Ctx, text: string, x: number, y: number, color: 'mist' | 'cream' = 'mist'): void => { drawTinyText(ctx, text, x, y, color); };
/** An enemy view with the fields the sim would set. */
export const foe = (id: string, x: number, y: number, over: Partial<ActorView> = {}): ActorView => view(id, x, y, { kind: 'enemy', ...over });

interface State { name: string; over: Partial<ActorView> }
const walk = (t: number): Partial<ActorView> => ({ anim: 'walk', t });
const TROOPER_STATES: State[] = [
  { name: 'UP', over: { anim: 'idle', guarding: true } }, { name: 'WALK', over: walk(0) }, { name: 'WALK', over: walk(7) },
  { name: 'AIM', over: { anim: 'attack', alert: true, t: 0 } }, { name: 'BURST', over: { anim: 'attack', t: 0 } }, { name: 'BURST', over: { anim: 'attack', t: 3 } },
  { name: 'FLANK', over: { ...walk(0), pose: 'flank' } }, { name: 'FLANK', over: { ...walk(7), pose: 'flank' } },
  { name: 'DOWN', over: { anim: 'idle', guarding: false } }, { name: 'HURT', over: { anim: 'hurt' } }, { name: 'KO', over: { anim: 'ko' } },
];
const COMMANDER_STATES: State[] = [
  { name: 'STAND', over: { anim: 'idle' } }, { name: 'WALK', over: walk(0) }, { name: 'WALK', over: walk(7) },
  { name: 'PLANT', over: { anim: 'idle', pose: 'plant', t: 0 } }, { name: 'PLANT', over: { anim: 'idle', pose: 'plant', t: 8 } },
  { name: 'RUSH', over: { anim: 'walk', pose: 'charge', t: 0 } }, { name: 'RUSH', over: { anim: 'walk', pose: 'charge', t: 4 } },
  { name: 'STUN', over: { anim: 'idle', pose: 'stun', t: 0 } }, { name: 'STUN', over: { anim: 'idle', pose: 'stun', t: 16 } },
  { name: 'HURT', over: { anim: 'hurt' } }, { name: 'KO', over: { anim: 'ko' } },
];

/** A row of one foe in each state, `x0` the first column and `gap` between them. */
function row(ctx: Ctx, id: string, dir: Dir, states: State[], y: number, over: Partial<ActorView> = {}, gap = 21, x0 = 22): void {
  states.forEach((s, i) => drawActor(ctx, foe(id, x0 + i * gap, y, { dir, ...over, ...s.over })));
}

const troopers: Page = {
  title: 'LOCKDOWN FOES',
  subs: 4,
  draw(ctx, t, sub) {
    ctx.fillStyle = PAL.pine1;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sub === 0 || sub === 1) {
      const broken = sub === 1;
      drawText(ctx, broken ? 'THE TROOPER, SHIELD BROKEN' : 'THE TROOPER, SHIELD WHOLE', 4, 3, 'white', { shadow: true });
      DIRS.forEach((d, r) => { label(ctx, d.toUpperCase(), 1, 28 + r * 34); row(ctx, 'trooper', d, TROOPER_STATES, 40 + r * 34, broken ? { broken: true, guarding: false } : {}); });
      TROOPER_STATES.forEach((s, i) => label(ctx, s.name, 12 + i * 21, 146));
      label(ctx, 'UP: SHIELD RAISED  DOWN: RECOVERING OR STUNNED', 4, 154, 'cream');
      row(ctx, 'trooper', 'left', TROOPER_STATES.slice(0, 6), 194, { bar: { hp: 3, hpMax: 5 }, ...(broken ? { broken: true } : {}) }, 21, 22);
      drawActor(ctx, foe('trooper', 160, 194, { dir: 'left', anim: 'idle', guarding: true, tint: 'yellow', ...(broken ? { broken: true } : {}) }));
      drawActor(ctx, foe('trooper', 184, 194, { dir: 'left', anim: 'idle', guarding: true, flash: 1 }));
      label(ctx, 'BAR  TINT  FLASH', 150, 202);
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    if (sub === 2) {
      drawText(ctx, 'THE COMMANDER', 4, 3, 'white', { shadow: true });
      DIRS.forEach((d, r) => { label(ctx, d.toUpperCase(), 1, 22 + r * 30); row(ctx, 'commander', d, COMMANDER_STATES, 40 + r * 30, {}, 21, 22); });
      COMMANDER_STATES.forEach((s, i) => label(ctx, s.name, 12 + i * 21, 158));
      label(ctx, 'FROM HALF HP: THE SHIELD CRACKED', 4, 168, 'cream');
      row(ctx, 'commander', 'down', COMMANDER_STATES, 196, { cracked: true }, 21, 22);
      drawText(ctx, 'UP DOWN', 4, 212, 'slate');
      return;
    }
    // Both beside Hopper and a Lab agent, for scale.
    drawText(ctx, 'THE ARMY BESIDE THE PARTY', 4, 3, 'white', { shadow: true });
    drawActor(ctx, view('hopper', 40, 80, { kind: 'npc', dir: 'right', anim: 'walk', t }));
    drawActor(ctx, foe('agent5', 70, 80, { dir: 'left', anim: 'walk', t }));
    drawActor(ctx, foe('trooper', 110, 80, { dir: 'left', anim: 'walk', t, guarding: true }));
    drawActor(ctx, foe('trooper', 140, 80, { dir: 'left', anim: 'attack', t: t % 12, alert: t % 40 < 14 }));
    drawActor(ctx, foe('commander', 190, 84, { dir: 'left', anim: 'walk', t, bar: { hp: 4, hpMax: 5 } }));
    drawActor(ctx, foe('commander', 226, 84, { dir: 'left', anim: 'idle', pose: 'plant', t, cracked: true }));
    label(ctx, 'HOPPER  LAB AGENT  TROOPERS  COMMANDER', 6, 100, 'cream');
    drawActor(ctx, foe('demofoe', 50, 170, { dir: 'down', anim: 'walk', t }));
    drawActor(ctx, foe('demofoe', 110, 170, { dir: 'left', anim: 'idle', pose: 'charge', t }));
    label(ctx, 'THE 1.3 DEMOGORGON AS A FOE', 6, 176, 'cream');
    drawText(ctx, 'UP DOWN', 4, 212, 'slate');
  },
};

// ---------------------------------------------------------------- props and the checkpoint
/** A street: house fronts, lawn, sidewalk, two lanes round a double line with a stop line and a rift, sidewalk, lawn. 16 by 13 tiles. */
export const STREET = [
  '²²²²²²²²²²²²²²²²', '³³¶³³µ³³¶³³³³µ³³', '®®®®®®®®®®®®®®®®', '¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬', '¡¡¡¡¡¡¡¡¡©¡¡¡¡¡¡', '¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥¥', '¡¡¡¡¡¹»¼¡©¡¡¡¡¡¡',
  '¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬¬', '®®®®®®®®®®®®®®®®', '®®®®®®®®®®®®®®®®', '®®®®®®®®®®®®®®®®', '®®®®®®®®®®®®®®®®', '®®®®®®®®®®®®®®®®',
];

const pv = (kind: PropKind, id: string, x: number, y: number, w: number, h: number, state: PropState, t: number) => prop(kind, id, x, y, w, h, state, t);

const props: Page = {
  title: 'LOCKDOWN PROPS',
  subs: 2,
  draw(ctx, t, sub) {
    if (sub === 0) {
      ctx.fillStyle = PAL.shadow;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      drawText(ctx, 'THE ARMY\'S PROPS, NIGHT', 4, 3, 'white', { shadow: true });
      const list: [PropKind, PropState, number, number, number, number, string][] = [
        ['truck', 'closed', 6, 40, 64, 32, 'TRUCK'], ['truck', 'open', 80, 40, 64, 32, 'TRUCK OPEN'], ['tent', 'closed', 154, 36, 48, 36, 'TENT'],
        ['booth', 'closed', 208, 40, 32, 32, 'BOOTH'], ['sandbags', 'closed', 6, 100, 32, 16, 'SANDBAGS'], ['sandbags', 'closed', 48, 92, 32, 24, 'TALL'],
        ['barricade', 'closed', 92, 100, 32, 16, 'BARRICADE'], ['barrier', 'closed', 134, 100, 32, 16, 'BARRIER'], ['curfew', 'closed', 176, 84, 26, 32, 'CURFEW'],
        ['crack', 'closed', 206, 84, 24, 48, 'BOOM'], ['crack', 'open', 232, 84, 24, 48, 'SMASH'], ['tower', 'closed', 8, 196, 16, 16, 'TOWER'], ['tower', 'off', 36, 196, 16, 16, 'OFF'],
        ['crack', 'closed', 90, 160, 48, 24, 'BOOM FLAT'], ['crack', 'open', 150, 160, 48, 24, 'SMASHED FLAT'],
      ];
      for (const [kind, state, x, y, w, h, name] of list) {
        drawProp(ctx, pv(kind, name, x, y, w, h, state, t), true);
        label(ctx, name, x, y + h + 3);
      }
      label(ctx, 'EACH STANDS ON THE BOTTOM OF ITS FOOTPRINT', 64, 198, 'cream');
      label(ctx, 'A CRACK 40 PX OR MORE LONG IS THE BOOM GATE', 64, 206, 'cream');
      return;
    }
    // The checkpoint: the street baked at night, with the tower's cone and pool under everything that stands.
    const stage = bake('l14street', STREET);
    const tower = pv('tower', 'tower1', 152, 40, 16, 16, 'closed', t), tower2 = pv('tower', 'tower2', 40, 56, 16, 16, 'closed', t + 300);
    const pools: Glow[] = [{ x: 150, y: 64 + VIEW_TOP, r: 40, flicker: 0.3 }, ...[tower, tower2].map((p): Glow => ({ x: towerPool(p).x, y: towerPool(p).y + VIEW_TOP, r: 36, k: 0.8, flicker: 0.1 }))];
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawStage(ctx, stage, 0, 0, t);
    ctx.restore();
    paintGlow(ctx, pools, t);
    ctx.save();
    ctx.translate(0, VIEW_TOP);
    drawTowerCone(ctx, tower, 0, 0, false);
    drawTowerCone(ctx, tower2, 0, 0, false);
    const items: [number, () => void][] = [
      [90, () => drawProp(ctx, pv('sandbags', 's1', 84, 74, 32, 16, 'closed', t), true)], [90, () => drawProp(ctx, pv('sandbags', 's2', 168, 74, 32, 16, 'closed', t), true)],
      [58, () => drawProp(ctx, pv('booth', 'booth1', 120, 40, 32, 32, 'closed', t), true)], [64, () => drawProp(ctx, tower, true)], [72, () => drawProp(ctx, tower2, true)],
      [76, () => drawProp(ctx, pv('curfew', 'sign1', 10, 38, 26, 32, 'closed', t), true)], [112, () => drawProp(ctx, pv('crack', 'boom1', 216, 64, 24, 48, 'closed', t), true)],
      [124, () => drawProp(ctx, pv('barricade', 'b1', 40, 112, 32, 16, 'closed', t), true)], [128, () => drawProp(ctx, pv('barrier', 'b2', 120, 120, 32, 16, 'closed', t), true)],
      [150, () => drawProp(ctx, pv('truck', 'truck1', 168, 134, 64, 32, 'open', t), true)], [190, () => drawProp(ctx, pv('tent', 'tent1', 20, 166, 48, 36, 'closed', t), true)],
      [200, () => drawProp(ctx, pv('sandbags', 's3', 120, 180, 48, 16, 'closed', t), true)],
      [112, () => drawActor(ctx, foe('trooper', 196, 104, { dir: 'left', anim: 'idle', guarding: true }))],
      [128, () => drawActor(ctx, foe('trooper', 170, 124, { dir: 'left', anim: 'attack', t: t % 12, alert: t % 40 < 14 }))],
      [118, () => drawActor(ctx, foe('agent5', 100, 118, { dir: 'right', anim: 'walk', t }))],
      [140, () => drawActor(ctx, view('mike', 70, 150, { kind: 'hero', dir: 'right', anim: 'walk', t }))],
      [143, () => drawActor(ctx, view('hopper', 54, 152, { kind: 'hero', dir: 'right', anim: 'walk', t: t + 3 }))],
    ];
    items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
    ctx.restore();
    head(ctx, 'THE CHECKPOINT: CONES, SANDBAGS, THE ARMY');
  },
};

export const L1415_PAGES: Page[] = [troopers, props];
