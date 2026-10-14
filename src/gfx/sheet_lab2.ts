// Sheet pieces for the hard Lab: the new tiles beside their neighbours, a three-room dressing stage (animal lab,
// power room, records wing), the new props and the two overlays. Built from the legend in core/tiles.ts, so the rooms
// show the tiles the way the stage will bake them.
import type { ActorView, HazardState, HazardView, PropKind, PropState, PropView } from '../core/types.ts';
import { TILES } from '../core/tiles.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawProp } from './props.ts';
import { drawCamCone, drawHazard } from './overlays.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';
import type { ActorMaker } from './sheet_lab.ts';

// Every new tile beside the neighbours it is meant to have.
const CONTEXT2 = [
  'VVVVVVVVVVVVVVVV',
  'WWYWWMMWWYWWiiWW',
  'LLLLaaaDaaBBNNee',
  'aaaaaaxaaaaaeeCC',
  'qqqEEEqEEUUUeeeC',
];

// Three rooms in a row, 16 tiles each: the animal lab, the power room, the records wing. Hazard stripes mark the doorways.
const DRESS = [
  'VVVVVVVVVVVVVVVV' + 'VVVVVVVVVVVVVVVV' + 'VVVVVVVVVVVVVVVV',
  'VWWiiWWWMMWWiiWV' + 'VWWiiiWWWiiiWWWV' + 'VWYWWWMMWWYWWMWV',
  'VaBBaaaUUUaBBaaV' + 'VELLLqqEEEEqqEEV' + 'VeCCeeeeeeCCeeeV',
  'VaaaaaaUUaaaaaaV' + 'VEEqEEEEEEEEqEEV' + 'VeeeeeeeeeeeeUeV',
  'VcaaDaaaaaaaaxaV' + 'VEEqEEEEqqqqqEEV' + 'VeCeeeCCeeeCeUUV',
  'VcaaaaaDaaaaaaaz' + 'zEEqqEEEEEEEEEEz' + 'zeeeeeeeeeeeeeeV',
  'VaaaaaaaaaaaaaDz' + 'zEEEEEEEEEEEEEEz' + 'zeeUeeeeeeeeeeeV',
  'VcaaaxaaaaDaaaaV' + 'VEEEEqqEEEEEEEEV' + 'VeeCCeeeCeeCCeeV',
  'VaaaaaaaaaaavvaV' + 'VEEEEEqEEEEEEEEV' + 'VeeeeeeUeeeeeeeV',
  'VaaDaaaaUaaaaaaV' + 'VEEEEEqqqqEExEEV' + 'VeNNeeUUeeeeNNeV',
  'VaaaaaaaUUaaaaaV' + 'VEEEEEEEEEEEEEEV' + 'VeeeeeeUUeeeeeeV',
  'VVVVVVVVVVVVVVVV' + 'VVVVVVVVVVVVVVVV' + 'VVVVVVVVVVVVVVVV',
];

const baked = new Map<string, BakedStage>();
function bake(key: string, rows: string[]): BakedStage {
  let b = baked.get(key);
  if (!b) { b = bakeStage(rows); baked.set(key, b); }
  return b;
}

const solidAt = (rows: string[]) => (tx: number, ty: number): boolean => {
  const ch = rows[ty]?.[tx];
  return ch === undefined ? true : (TILES[ch] ?? TILES['.'])?.solid === true;
};

const prop = (kind: PropKind, x: number, y: number, w: number, h: number, state: PropState, t: number, extra: Partial<PropView> = {}): PropView => ({ id: `${kind}${x}${y}`, kind, x, y, w, h, state, t, ...extra });

/** The state of a hazard that is on for `on` frames out of `period`, with the 24 frame warning before it, at frame t. */
function hazardPhase(period: number, on: number, t: number, offset = 0): { state: HazardState; t: number } {
  const ph = (t + offset) % period;
  if (ph >= period - on) return { state: 'on', t: ph - (period - on) };
  if (ph >= period - on - 24) return { state: 'warn', t: ph - (period - on - 24) };
  return { state: 'off', t: ph };
}
const hazard = (kind: 'electric' | 'steam', x: number, y: number, w: number, h: number, s: { state: HazardState; t: number }): HazardView => ({ id: `${kind}${x}${y}`, kind, x, y, w, h, state: s.state, t: s.t });

/** The new tiles beside their neighbours, 16 by 5 tiles, with its top edge at y. */
export function drawLab2Context(ctx: Ctx, y: number, t: number): void {
  ctx.save();
  ctx.translate(0, y);
  drawStage(ctx, bake('context2', CONTEXT2), 0, 0, t);
  ctx.restore();
}

/** Camera swing for the sheet: a sweep between two headings, in radians. */
const sweep = (t: number, mid: number, span: number): number => mid + Math.sin(t / 70) * span;

/** Three themed rooms with their props, hazards, a camera and its cone, the guards and the warden. Draws the world part only. */
export function drawLab2Stage(ctx: Ctx, t: number, mk: ActorMaker): void {
  const stage = bake('dress', DRESS);
  const hx = 24 + ((t / 2) % 700);
  const camX = Math.max(0, Math.min(stage.w - SCREEN_W, Math.round(hx - 128)));
  ctx.save();
  ctx.translate(-camX, VIEW_TOP);
  drawStage(ctx, stage, camX, 0, t);
  const solid = solidAt(DRESS);
  const items: PropView[] = [
    prop('tank', 80, 32, 16, 32, 'closed', t), prop('tank', 96, 32, 16, 32, 'closed', t + 40),
    prop('generator', 272, 32, 32, 32, 'closed', t), prop('generator', 464, 32, 32, 32, 'closed', t + 70),
    prop('rack', 384, 32, 16, 32, 'closed', t), prop('rack', 400, 32, 16, 32, 'closed', t + 30),
  ];
  const camAlert = (t % 420) > 300;
  const cam = prop('camera', 640, 32, 16, 16, camAlert ? 'alert' : 'closed', t, { cam: { angle: sweep(t, Math.PI / 2, 0.55), range: 96, half: 0.42, live: true } });
  const hazards: HazardView[] = [
    hazard('electric', 336, 80, 64, 32, hazardPhase(180, 40, t)),
    hazard('steam', 192, 128, 32, 16, hazardPhase(200, 60, t, 60)),
  ];
  drawCamCone(ctx, cam, solid, camX, 0, t);
  for (const p of items) drawProp(ctx, p);
  drawProp(ctx, cam);
  for (const h of hazards) drawHazard(ctx, h, camX, 0, t);
  const foes: [string, number, number, Partial<ActorView>][] = [
    ['guard', 600, 100, { dir: 'left', anim: 'idle', guarding: true }],
    ['guard', 592, 138, { dir: 'down', anim: 'walk', elite: true, guarding: true }],
    ['warden', 736, 150, { dir: 'left', anim: 'idle', guarding: true, bar: { hp: 180, hpMax: 260 } }],
    ['agent', 440, 144, { dir: 'down', anim: 'idle', elite: true, bar: { hp: 20, hpMax: 40 } }],
    ['rat', 140, 100, { dir: 'left', anim: 'walk', bar: { hp: 2, hpMax: 4 } }],
  ];
  for (const [id, x, y, over] of foes) drawActor(ctx, mk(id, x, y, { t, ...over }));
  for (const [id, off] of [['lucas', 36], ['eleven', 18], ['mike', 0]] as [string, number][]) drawActor(ctx, mk(id, hx - off, 108, { dir: 'right', anim: 'walk', t }));
  ctx.restore();
}

const MINI = [
  'VVVVVVVVVVVVVVVV',
  'VWWWWWWWWWWWWWWV',
  'VooooooooooooooV',
  'VoooVVoooooVVooV',
  'VoooVVoooooVVooV',
  'VooooooooooooooV',
  'VVVVVVVVVVVVVVVV',
];

// The page behind the new props: a plain lab floor under a wall.
const PROPS2 = ['VVVVVVVVVVVVVVVV', 'VWWWWWWWWWWWWWWV', ...Array.from({ length: 11 }, (_, i) => 'V' + (i % 2 ? 'O' : 'o').repeat(14) + 'V'), 'VVVVVVVVVVVVVVVV'];

// The page behind the hazards: plate under the electric panels, vents under the steam.
const HAZ = [
  'VVVVVVVVVVVVVVVV',
  'VEEEoEEEoEEEoooV',
  'VooooooooooooooV',
  'VooooooooooooooV',
  'VovvoovvoovvoooV',
  'VooooooooooooooV',
  'VooooooooooooooV',
  'VooooooooooooooV',
];

/** The new props at their sizes. The two overlays are on the next sub page. */
export function drawLab2Props(ctx: Ctx, t: number): void {
  drawStage(ctx, bake('props2', PROPS2), 0, 0, t);
  const label = (s: string, x: number, y: number): void => { drawText(ctx, s, x, y, 'teal0'); };
  drawText(ctx, 'LAB PROPS: CAMERA, TANK, RACK, GENERATOR', 4, 4, 'white', { shadow: true });
  const ang = sweep(t, Math.PI / 2, 0.9);
  const cams: [PropState, string][] = [['closed', 'CALM'], ['alert', 'ALERT'], ['lit', 'DEAD']];
  cams.forEach(([state, name], i) => {
    const x = 20 + i * 36;
    drawProp(ctx, prop('camera', x, 24, 16, 16, state, t, { cam: { angle: ang, range: 60, half: 0.4, live: state !== 'lit' } }));
    label(name, x - 4, 44);
  });
  [0, 4, 8, 12].forEach((k, i) => drawProp(ctx, prop('camera', 150 + i * 24, 24, 16, 16, 'closed', t, { cam: { angle: (k * Math.PI) / 8 + Math.PI / 4, range: 40, half: 0.4, live: true } })));
  label('HEADS TURN TO FACE', 146, 44);
  drawProp(ctx, prop('tank', 20, 66, 16, 32, 'closed', t)); drawProp(ctx, prop('tank', 44, 66, 16, 32, 'closed', t + 20));
  drawProp(ctx, prop('tank', 76, 82, 16, 16, 'closed', t)); drawProp(ctx, prop('tank', 100, 74, 32, 24, 'closed', t + 10));
  label('TANKS', 20, 102);
  drawProp(ctx, prop('rack', 152, 66, 16, 32, 'closed', t)); drawProp(ctx, prop('rack', 172, 66, 16, 32, 'closed', t + 21));
  drawProp(ctx, prop('rack', 196, 82, 16, 16, 'closed', t)); drawProp(ctx, prop('rack', 216, 74, 32, 24, 'closed', t));
  label('RACKS', 152, 102);
  drawProp(ctx, prop('generator', 20, 124, 16, 16, 'closed', t)); drawProp(ctx, prop('generator', 48, 116, 32, 24, 'closed', t));
  drawProp(ctx, prop('generator', 96, 108, 32, 32, 'closed', t));
  label('GENERATORS', 20, 144);
  drawText(ctx, 'FLUID, BUBBLES, LEDS, SPARKS ARE LIVE', 4, 162, 'slate');
  drawText(ctx, 'UP DOWN FOR HAZARDS AND CONE', 4, 174, 'slate');
}

/** Every state of the two hazards, and a camera cone in a small room with pillars and walls that stop it. */
export function drawLab2Overlays(ctx: Ctx, t: number): void {
  drawStage(ctx, bake('hazards', HAZ), 0, 0, t);
  const label = (s: string, x: number, y: number): void => { drawText(ctx, s, x, y, 'teal0'); };
  drawText(ctx, 'HAZARDS AND CAMERA CONE', 4, 4, 'white', { shadow: true });
  (['off', 'warn', 'on'] as HazardState[]).forEach((state, i) => {
    drawHazard(ctx, hazard('electric', 16 + i * 64, 16, 48, 16, { state, t: t % 36 }), 0, VIEW_TOP, t);
    label(`ELEC ${state.toUpperCase()}`, 16 + i * 64, 36);
    drawHazard(ctx, hazard('steam', 32 + i * 64, 64, 32, 16, { state, t: t % 60 }), 0, VIEW_TOP, t);
    label(`STEAM ${state.toUpperCase()}`, 32 + i * 64, 84);
  });
  ctx.save();
  ctx.translate(0, 104);
  drawStage(ctx, bake('mini', MINI), 0, 0, t);
  const solid = solidAt(MINI);
  const calm = prop('camera', 48, 32, 16, 16, 'closed', t, { cam: { angle: sweep(t, Math.PI / 2, 0.6), range: 70, half: 0.4, live: true } });
  const dead = prop('camera', 112, 32, 16, 16, 'lit', t, { cam: { angle: Math.PI / 2, range: 70, half: 0.4, live: false } });
  const alert = prop('camera', 208, 32, 16, 16, 'alert', t, { cam: { angle: sweep(t, Math.PI / 2, 0.5), range: 70, half: 0.4, live: true } });
  for (const p of [calm, dead, alert]) { drawCamCone(ctx, p, solid, 0, 0, t); drawProp(ctx, p); }
  label('CALM', 40, 84); label('SHOT', 104, 84); label('ALERT', 200, 84);
  ctx.restore();
  drawText(ctx, 'CONES STOP AT WALLS AND PILLARS', 4, 204, 'bone');
  drawText(ctx, 'UP DOWN', 200, 204, 'bone');
}
