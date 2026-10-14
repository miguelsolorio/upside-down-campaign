// Floor hazards: rectangles of tiles that cycle off, warn, on. Only the active hero is hurt. Enemies and the bot walk through.
import type { HazardDef, HazardState, HazardView } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import type { S } from './state.ts';
import { activeHero } from './state.ts';
import { hurtHeroFlat } from './damage.ts';
import { sfx } from './fx.ts';

/** Frames of warning before a hazard goes on. */
export const HAZARD_WARN = 24;
/** Knockback speed that throws the hero clear of the rectangle. */
const THROW_KB = 4;
/** A hazard's sound plays only when it is this close to the active hero, in px. About the size of the screen. */
const HEARD_WITHIN = 220;

/**
 * Where a hazard is in its cycle at hazard time `t`. It first goes on at `phase` and then every `period` frames, for
 * `on` frames. The warning is the HAZARD_WARN frames before that. `t` is frames into the current state.
 */
export function hazardAt(h: HazardDef, t: number): { state: HazardState; t: number } {
  const period = Math.max(1, h.period);
  const pos = (((t - (h.phase ?? 0)) % period) + period) % period;
  if (pos < h.on) return { state: 'on', t: pos };
  const warnAt = Math.max(h.on, period - HAZARD_WARN);
  if (pos >= warnAt) return { state: 'warn', t: pos - warnAt };
  return { state: 'off', t: pos - h.on };
}

export function hazardRect(h: HazardDef): { x: number; y: number; w: number; h: number } {
  return { x: h.tx * TILE, y: h.ty * TILE, w: h.w * TILE, h: h.h * TILE };
}

export function hazardViews(s: S): HazardView[] {
  return s.hazards.map((h) => {
    const r = hazardAt(h, s.hazT);
    return { id: h.id, kind: h.kind, ...hazardRect(h), state: r.state, t: r.t };
  });
}

/** Advances the clock, sounds a hazard that just went on, and hurts the active hero standing in one that is on. */
export function updateHazards(s: S): void {
  if (s.hazards.length === 0) return;
  s.hazT++;
  const hero = activeHero(s);
  for (let i = 0; i < s.hazards.length; i++) {
    const h = s.hazards[i] as HazardDef;
    const state = hazardAt(h, s.hazT).state;
    const was = s.hazPrev[i];
    s.hazPrev[i] = state;
    const r = hazardRect(h);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (state !== 'on') continue;
    if (was !== 'on' && Math.hypot(hero.x - cx, hero.y - cy) <= HEARD_WITHIN + Math.max(r.w, r.h) / 2) {
      sfx(s, h.kind === 'electric' ? 'zap' : 'steam');
    }
    if (hero.ko) continue;
    // The hero is in it when the middle of the foot box is inside the rectangle.
    const fx = hero.x, fy = hero.y - 4;
    if (fx < r.x || fx >= r.x + r.w || fy < r.y || fy >= r.y + r.h) continue;
    // Thrown straight out through the nearest edge, so a hero in a narrow lane is thrown across it and lands clear.
    const edges: [number, number][] = [
      [fx - r.x, Math.PI], [r.x + r.w - fx, 0], [fy - r.y, -Math.PI / 2], [r.y + r.h - fy, Math.PI / 2],
    ];
    let a = Math.PI / 2, best = Infinity;
    for (const [gap, angle] of edges) if (gap < best - 0.001) { best = gap; a = angle; }
    hurtHeroFlat(s, hero, cx, cy, h.dmg, THROW_KB, a);
  }
}
