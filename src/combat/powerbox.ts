// The power box and the breaker (docs/level-8.md, "Grigori"). The chamber has `powerbox` props (a floor plate, not solid) and a
// `breaker` (a wall switch, hitBy 'shoot', behind solid tiles so only a shot reaches it).
//
// A shot lights the breaker (targetHit, from lightTarget in props.ts), and every powerbox fires for 30 frames: state 'lit', the `zap`
// sfx and an 'arcs' fx (w and h the plate's size). Whatever stands on a plate while it fires, feet inside its rect, is hit once:
//   Grigori is stunned for 180 frames and loses 8 percent of his max HP (enemies/grigori_hit.ts).
//   Any other enemy loses 30 percent of its max HP.
//   The active hero takes 15 (before difficulty) and is thrown clear through the nearest edge.
// The breaker goes back to 'closed' 300 frames after it was lit, and can be shot again. The plates go back to 'closed' when the
// 30 frames are up.
import { stunGrigori } from '../enemies/grigori_hit.ts';
import { untouchable } from '../enemies/hold.ts';
import type { Enemy, Prop, S } from './state.ts';
import { activeHero } from './state.ts';
import { addFx, floater, sfx, sparks } from './fx.ts';
import { hurtHeroFlat } from './damage.ts';
import { BODY_Y } from './space.ts';

/** Frames the plates fire for, frames from a shot to the breaker re-arming, and the numbers of the hits. */
export const ZAP_FRAMES = 30;
export const REARM_FRAMES = 300;
export const BOX_FOE_SHARE = 0.3;
export const BOX_HERO_DMG = 15;
/** The shove that throws a hero off the plate, in px a frame. */
const THROW_KB = 4;

/** True when the body standing with its feet at (x, y) is on the plate: the middle of its foot box is inside the rect. */
export function onPlate(p: Prop, x: number, y: number): boolean {
  const fy = y - 4;
  return x >= p.x && x < p.x + p.w && fy >= p.y && fy < p.y + p.h;
}

/** The breaker was lit: every powerbox fires. Called from lightTarget. */
export function fireBoxes(s: S): void {
  const boxes = s.props.filter((p) => p.kind === 'powerbox');
  // One more than the window: the tick that fires them counts down too, and the plates are drawn lit for ZAP_FRAMES frames.
  s.zap = { left: ZAP_FRAMES + 1, hit: new Set() };
  for (const p of boxes) {
    p.state = 'lit';
    p.t = 0;
    addFx(s, 'arcs', p.x + p.w / 2, p.y + p.h / 2, 'down', 0, ZAP_FRAMES + 1, p.w, p.h);
  }
  sfx(s, 'zap');
}

/** A non-boss enemy on a plate loses 30 percent of its max HP. A kill is noticed afterward, in reapEnemies. */
function zapFoe(s: S, e: Enemy): void {
  const dmg = Math.max(1, Math.round(e.hpMax * BOX_FOE_SHARE));
  s.stats.damageDealt += Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  e.flash = 1;
  e.hurtSeen = true;
  e.stagger = Math.max(e.stagger, 20);
  floater(s, String(dmg), e.x, e.y - 15, 'sky');
  sparks(s, e.x, e.y - BODY_Y, 4);
}

/** The active hero on a plate takes 15 and is thrown straight out through the nearest edge. */
function zapHero(s: S, p: Prop): void {
  const h = activeHero(s);
  if (h.ko || !onPlate(p, h.x, h.y)) return;
  const fx = h.x, fy = h.y - 4;
  const edges: [number, number][] = [
    [fx - p.x, Math.PI], [p.x + p.w - fx, 0], [fy - p.y, -Math.PI / 2], [p.y + p.h - fy, Math.PI / 2],
  ];
  let a = Math.PI / 2, best = Infinity;
  for (const [gap, angle] of edges) if (gap < best - 0.001) { best = gap; a = angle; }
  hurtHeroFlat(s, h, p.x + p.w / 2, p.y + p.h / 2, BOX_HERO_DMG, THROW_KB, a);
}

/** Re-arms the breaker, and while the plates fire, hits whatever stands on one. Runs after updateProps, which counts p.t. */
export function updatePowerboxes(s: S): void {
  for (const p of s.props) {
    if (p.kind === 'breaker' && p.state === 'lit' && p.t >= REARM_FRAMES) { p.state = 'closed'; p.t = 0; }
  }
  const z = s.zap;
  if (!z) return;
  const boxes = s.props.filter((p) => p.kind === 'powerbox');
  for (const p of boxes) {
    zapHero(s, p);
    for (const e of s.enemies) {
      if (e.dead || e.dormant || e.hp <= 0 || z.hit.has(e.uid) || untouchable(e) || !onPlate(p, e.x, e.y)) continue;
      z.hit.add(e.uid);
      if (e.grigori) stunGrigori(s, e);
      else if (e.demo === null && e.alpha === null) zapFoe(s, e);
    }
  }
  if (--z.left <= 0) {
    s.zap = null;
    for (const p of boxes) { p.state = 'closed'; p.t = 0; }
  }
}
