// Sheet pieces for the Hawkins Lab (stage 1.2): a hand-made room for the stage page, a strip of tiles beside their
// neighbours for the tile page, and the door and console states for the props page. All of it is built from the
// legend in core/tiles.ts, so it shows the tiles the way the stage will bake them.
import type { ActorView, PropKind, PropState } from '../core/types.ts';
import { SCREEN_W, VIEW_TOP } from '../core/config.ts';
import type { Ctx } from './canvas.ts';
import { drawText } from './font.ts';
import { drawActor } from './actors.ts';
import { drawProp } from './props.ts';
import { bakeStage, drawStage } from './tiles.ts';
import type { BakedStage } from './tiles.ts';

/** Builds an actor view for the sheet; sheet_a owns the real one. */
export type ActorMaker = (id: string, x: number, y: number, over: Partial<ActorView>) => ActorView;

// Two rooms and a doorway between them. Left: a corridor with a pipe run, a pillar, a vent and two doors.
// Right: the cages and an observation window. Hazard marks both doorways.
const LAB = [
  'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
  'VWWiiiiiWzzWWWWWWWWWWGGGGGWWWWWV',
  'ViOooooOozzoOoooVOcccoOooocccooV',
  'VioOovooVooooOooVoOooooVooooOooV',
  'ViooOoooWOooooOoVooOoooWOooooOoV',
  'VioooOooooOoooozzzooOooooOooooOV',
  'ViooooOooooOooozzzoooOooooOooooV',
  'ViOooooOooooOoooVOooooOovvoOoooV',
  'VioOooooOooovOooVoOooooOooooOooV',
  'VoooOooooOooooOoVooOooooOooooOoV',
  'VooooOooooOooooOVoooOooooOooooOV',
  'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
];

// Every tile beside the neighbours it is meant to have.
const CONTEXT = [
  'VVVVVVVVVVVVVVVV',
  'WWiiiiWWGGGGWWWW',
  'oOooOovoOooOzzzz',
  'OooOocoocOoozooO',
  'ooOoooOoooOoozoo',
  'VVVVVVVVVVVVVVVV',
];

// A bare room to show every state of the doors and consoles on.
const PROP_ROOM = [
  'VVVVVVVVVVVVVVVV',
  'VWzzWWWzzWWWWWWV',
  'VoOooooOooooVooV',
  'VooOooooOoooVOoV',
  'VoooOooooOooVoOV',
  'VooooOooooOozooV',
  'VOooooOooooOzooV',
  'VoOooooOoooozooV',
  'VooOooooOooozOoV',
  'VoooOooooOooVoOV',
  'VooooOooooOoVooV',
  'VVVVVVVVVVVVVVVV',
];

const baked = new Map<string, BakedStage>();
function bake(key: string, rows: string[]): BakedStage {
  let b = baked.get(key);
  if (!b) { b = bakeStage(rows); baked.set(key, b); }
  return b;
}

const prop = (kind: PropKind, x: number, y: number, w: number, h: number, state: PropState, t: number) => ({ id: kind, kind, x, y, w, h, state, t });

/** The lab room by day, with the camera following a hero through the doorway. Draws the world part only. */
export function drawLabStage(ctx: Ctx, t: number, mk: ActorMaker): void {
  const stage = bake('lab', LAB);
  const hx = 24 + ((t / 2) % 440);
  const camX = Math.max(0, Math.min(stage.w - SCREEN_W, Math.round(hx - 128)));
  ctx.save();
  ctx.translate(-camX, VIEW_TOP);
  drawStage(ctx, stage, camX, 0, t);
  const doorOpen = Math.abs(hx - 264) < 40;
  const flip = Math.floor(t / 150);
  drawProp(ctx, prop('door', 256, 80, 16, 32, doorOpen ? 'open' : 'closed', t));
  drawProp(ctx, prop('door', 144, 16, 32, 16, flip & 1 ? 'open' : 'closed', t));
  drawProp(ctx, prop('console', 208, 16, 16, 16, hx > 200 ? 'lit' : 'closed', Math.max(0, Math.round((hx - 200) * 2))));
  drawProp(ctx, prop('console', 448, 16, 16, 16, (flip >> 1) & 1 ? 'lit' : 'closed', t % 300));
  drawProp(ctx, prop('crate', 48, 128, 16, 16, 'closed', t));
  drawProp(ctx, prop('crate', 400, 128, 16, 16, 'closed', t));
  drawActor(ctx, mk('agent', 392, 104, { dir: 'left', anim: 'idle', t, alert: ((t >> 5) & 1) === 1 }));
  drawActor(ctx, mk('agent', 120, 150, { dir: 'down', anim: 'idle', t }));
  drawActor(ctx, mk('rat', 340, 60, { dir: 'left', anim: 'walk', t, bar: { hp: 2, hpMax: 4 } }));
  drawActor(ctx, mk('rat', 430, 90, { dir: 'left', anim: 'walk', t: t + 7 }));
  for (const [id, off] of [['lucas', 36], ['eleven', 18], ['mike', 0]] as [string, number][]) drawActor(ctx, mk(id, hx - off, 108, { dir: 'right', anim: 'walk', t }));
  ctx.restore();
}

/** The nine lab tiles beside their neighbours, 16 by 6 tiles, with its top edge at y. */
export function drawLabContext(ctx: Ctx, y: number, t: number): void {
  ctx.save();
  ctx.translate(0, y);
  drawStage(ctx, bake('context', CONTEXT), 0, 0, t);
  ctx.restore();
}

/** Every state of the door and the console, on a lab floor, in sizes the stage uses. */
export function drawLabProps(ctx: Ctx, t: number): void {
  drawStage(ctx, bake('props', PROP_ROOM), 0, 0, t);
  const label = (s: string, x: number, y: number): void => { drawText(ctx, s, x, y, 'teal0'); };
  drawText(ctx, 'LAB PROPS: DOOR, CONSOLE', 4, 4, 'white', { shadow: true });
  drawProp(ctx, prop('door', 32, 16, 32, 16, 'closed', t));
  drawProp(ctx, prop('door', 112, 16, 32, 16, 'open', t));
  label('DOOR CLOSED', 18, 36);
  label('DOOR OPEN', 100, 36);
  drawProp(ctx, prop('console', 24, 56, 16, 16, 'closed', t));
  drawProp(ctx, prop('console', 56, 56, 16, 16, 'lit', t % 60 + 30));
  label('DARK', 20, 76);
  label('LIT', 56, 76);
  drawProp(ctx, prop('crate', 96, 56, 16, 16, 'closed', t));
  label('CRATE', 90, 76);
  drawProp(ctx, prop('door', 192, 80, 16, 32, 'closed', t));
  drawProp(ctx, prop('door', 192, 112, 16, 32, 'open', t));
  label('V DOOR', 150, 96);
  label('OPEN', 150, 128);
  drawProp(ctx, prop('door', 24, 96, 48, 16, 'closed', t));
  drawProp(ctx, prop('door', 24, 128, 48, 16, 'open', t));
  label('48 WIDE', 80, 100);
}
