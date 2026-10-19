// The army's props for stage 5.1 (docs/level-14.md), drawn from the painters in ch5/lockdown_props.ts: truck, tent, sandbags, barricade, barrier,
// tower (a floodlight tower), booth, curfew (the sign) and, as a 'crack' 40 px or more on its long side, the checkpoint's boom gate. Each is cached
// static art with a 1 px rim, repainted at night like any prop, drawn with its feet on the bottom of the spawn's footprint and centered on it, so a
// footprint may be just the part of the prop that blocks. truck and tent face left when `open`. The live bits are drawn over the art from PropView.t
// alone: the tower's lamps glint, the booth's lamp flashes, the boom gate's lamp blinks red while it is shut.
//
// The tower's cone is its own layer, drawn on the ground under everything that stands (drawTowerCone, called by drawWorld): the cone art's two kinds of
// pixel become two masks, laid over the ground at 48% and 80% white, which is what coneLift asks for. While the lamp is on, the cone sweeps slowly to
// either side in seven steps; with Reduce flashing it holds still.
import type { PropView } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { hash2, px32, rect } from './canvas.ts';
import type { Ctx } from './canvas.ts';
import { LOCKDOWN_PROP_SIZE, barricadeArt, barrierArt, boomArt, boothArt, curfewSignArt, floodlightArt, floodlightConeArt, sandbagArt, tentArt, truckArt } from './ch5/lockdown_props.ts';
import { rim } from './props_lab2.ts';
import type { ArtFn } from './props_lab2.ts';
import { Px } from './px.ts';

/** The tower's art height, and where its cone starts below the top of it (the lamp bank). */
const TOWER_H = LOCKDOWN_PROP_SIZE.floodlight[1], LAMP_DROP = 4;
const CONE_W = LOCKDOWN_PROP_SIZE.cone[0], CONE_H = LOCKDOWN_PROP_SIZE.cone[1];
/** The pool of light a cone leaves on the ground is this far below its lamp. */
const CONE_POOL_DROP = 61;
/** Where a tower's pool of light lies, in world px, for the glow under the cone. */
export const towerPool = (v: Pick<PropView, 'x' | 'y' | 'w' | 'h'>): { x: number; y: number } => ({ x: v.x + v.w / 2, y: v.y + v.h - TOWER_H + LAMP_DROP + CONE_POOL_DROP });
/** Whether a crack is the boom gate: 40 px or more on its long side. */
export const isBoom = (v: Pick<PropView, 'kind' | 'w' | 'h'>): boolean => v.kind === 'crack' && Math.max(v.w, v.h) >= 40;

const flipped = (p: Px): Px => new Px(p.w, p.h).blit(p, 0, 0, true);

/** Chips of a smashed arm: a few red and white splinters on the road under where it was. */
function splinters(p: Px, vertical: boolean): Px {
  const out = new Px(p.w, p.h).blit(p, 0, 0);
  for (let i = 0; i < 7; i++) {
    const a = hash2(i, 3, 61) % (vertical ? 20 : 40), b = 8 + (hash2(i, 5, 61) % 12);
    const x = vertical ? b : 10 + a, y = vertical ? 14 + a : b;
    out.rect(x, y, vertical ? 1 : 2, vertical ? 2 : 1, i & 1 ? 'red' : 'bone');
  }
  return out;
}

interface Piece { w: number; h: number; build: () => Px; key: string }

/** The art a prop of this view draws, or null for a kind that isn't the army's. */
function pieceOf(v: PropView, w: number, h: number): Piece | null {
  const open = v.state === 'open';
  switch (v.kind) {
    case 'truck': return { key: `truck${open}`, w: 64, h: 32, build: () => rim(open ? flipped(truckArt()) : truckArt()) };
    case 'tent': return { key: `tent${open}`, w: 48, h: 36, build: () => rim(open ? flipped(tentArt()) : tentArt()) };
    case 'booth': return { key: 'booth', w: 32, h: 32, build: () => rim(boothArt()) };
    case 'curfew': return { key: 'curfew', w: 26, h: 32, build: () => rim(curfewSignArt()) };
    case 'tower': { const lit = v.state !== 'off'; return { key: `tower${lit}`, w: 16, h: TOWER_H, build: () => rim(floodlightArt(lit)) }; }
    case 'sandbags': { const sw = Math.max(8, w), sh = Math.max(8, h); return { key: `bags${sw}x${sh}`, w: sw, h: sh, build: () => rim(sandbagArt(sw, sh)) }; }
    case 'barricade': { const bw = Math.max(16, w); return { key: `barr${bw}`, w: bw, h: 16, build: () => rim(barricadeArt(bw)) }; }
    case 'barrier': { const bw = Math.max(16, w); return { key: `barrier${bw}`, w: bw, h: 16, build: () => rim(barrierArt(bw)) }; }
    case 'crack': {
      if (!isBoom(v)) return null;
      const vertical = h > w;
      return { key: `boom${open}${vertical}`, w: vertical ? 24 : 48, h: vertical ? 48 : 24, build: () => rim(open ? splinters(boomArt(true, vertical), vertical) : boomArt(false, vertical)) };
    }
    default: return null;
  }
}

/** Draws one of the army's props. Returns false for any other kind (and for a crack that isn't the boom gate). */
export function drawArmyProp(ctx: Ctx, v: PropView, art: ArtFn, calm: boolean): boolean {
  const x = Math.round(v.x), y = Math.round(v.y), w = Math.round(v.w), h = Math.round(v.h);
  const piece = pieceOf(v, w, h);
  if (!piece) return false;
  const boom = v.kind === 'crack';
  const ax = x + ((w - piece.w) >> 1), ay = boom ? y + ((h - piece.h) >> 1) : y + h - piece.h;
  ctx.drawImage(art(piece.key, piece.build), ax - 1, ay - 1);
  const on = (period: number, phase: number, len: number): boolean => ((v.t + phase) % period) < len;
  if (v.kind === 'tower' && v.state !== 'off' && !calm) {
    for (const [dx, dy] of [[1, 1], [14, 1], [-1, 4], [16, 4]] as [number, number][]) if (((v.t >> 3) + dx) & 1) rect(ctx, ax + dx, ay + dy, 1, 1, 'white');
  } else if (v.kind === 'booth' && (calm || on(90, 0, 14))) {
    rect(ctx, ax + 2, ay, 2, 1, 'white');
  } else if (boom && v.state !== 'open') {
    const vertical = piece.h > piece.w, lx = ax + (vertical ? 12 : 2), ly = ay + (vertical ? 2 : 12);
    rect(ctx, lx, ly, 1, 1, calm || on(48, 0, 24) ? 'hot' : 'blood1');
  }
  return true;
}

// ---------------------------------------------------------------- the tower's cone
const LEAN_STEPS = 3;
/** One cone's two masks: the pixels of strong light (white) and of light (bone), each its own canvas. */
interface Masks { white: HTMLCanvasElement; bone: HTMLCanvasElement }
const cones = new Map<number, Masks>();

function conesFor(step: number): Masks {
  let m = cones.get(step);
  if (!m) {
    const cone = floodlightConeArt(step / LEAN_STEPS), white = px32('white');
    const strong = new Px(cone.w, cone.h), soft = new Px(cone.w, cone.h);
    for (let i = 0; i < cone.d.length; i++) { const c = cone.d[i] as number; if (c) (c === white ? strong : soft).d[i] = white; }
    m = { white: strong.toCanvas(), bone: soft.toCanvas() };
    cones.set(step, m);
  }
  return m;
}

/** Which way the lamp is turned, in steps from -LEAN_STEPS to LEAN_STEPS: a slow sweep out and back, offset by where the tower stands. */
export function coneStep(v: Pick<PropView, 'x' | 'y' | 't'>, calm: boolean): number {
  if (calm) return 0;
  const period = 960, phase = ((v.t + (hash2(Math.round(v.x), Math.round(v.y), 41) % period)) % period) / period;
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return Math.round((tri * 2 - 1) * LEAN_STEPS);
}

/** Lays a lit tower's cone on the ground (call it after the tiles and the pools, before anything that stands). The camera is in world px. */
export function drawTowerCone(ctx: Ctx, v: PropView, camX: number, camY: number, calm: boolean): void {
  if (v.kind !== 'tower' || v.state === 'off') return;
  const x = Math.round(v.x + v.w / 2) - (CONE_W >> 1), y = Math.round(v.y + v.h) - TOWER_H + LAMP_DROP;
  if (x + CONE_W < camX || x > camX + SCREEN_W || y + CONE_H < camY || y > camY + SCREEN_H - VIEW_TOP) return;
  const m = conesFor(coneStep(v, calm));
  ctx.globalAlpha = 0.48;
  ctx.drawImage(m.bone, x, y);
  ctx.globalAlpha = 0.8;
  ctx.drawImage(m.white, x, y);
  ctx.globalAlpha = 1;
}
