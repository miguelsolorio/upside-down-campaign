// A twin Demogorgon in the void (docs/level-15.md). A charge that ends against a tile that is a drop (Grid.drop: the Abyss's gaps, cliffs and
// the rock under its islands) doesn't stun it: it goes over the edge. It can't be hit while it is gone, it loses 15 percent of its max
// HP (never its last), and it climbs back where it went over, 180 frames after the fall began.
//
//   fall: x.fallT frames. ActorView pose 'fall', k running 0 to 1, a 'fall' fx at the edge and the `fall` sfx.
//   below: x.belowT frames, out of sight. Pose 'fall' with k at 1, so gfx draws nothing, and nothing can touch it.
//   climb: x.climbT frames. Pose 'climb', k running 1 to 0. Then it walks again.
import { TILE } from '../core/config.ts';
import type { ActorView } from '../core/types.ts';
import { ENEMY_DEFS } from './defs.ts';
import type { DemoMove, DemoState, Enemy, S } from '../combat/state.ts';
import { addFx, dust, floater, sfx, shake } from '../combat/fx.ts';
import { FOOT_H, FOOT_W } from '../combat/space.ts';
import { setEnemyAnim } from './steer.ts';

/** A twin in the void, or on its way out of it: out of play. */
export const isAway = (m: DemoMove): boolean => m === 'fall' || m === 'below' || m === 'climb';

/**
 * True when the foot box, two px on along (ux, uy) from (x, y), touches a tile that is a drop. A charge stopped by the wall it ran into
 * asks this of the axis it was stopped on: a drop is a fall, any other wall a stun.
 */
export function dropAhead(s: S, x: number, y: number, ux: number, uy: number): boolean {
  const drop = s.grid.drop;
  if (!drop) return false;
  const px = x + ux * 2, py = y + uy * 2;
  const tx0 = Math.floor((px - FOOT_W / 2) / TILE), tx1 = Math.floor((px + FOOT_W / 2 - 0.001) / TILE);
  const ty0 = Math.floor((py - FOOT_H) / TILE), ty1 = Math.floor((py - 0.001) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx >= 0 && ty >= 0 && tx < s.grid.w && ty < s.grid.h && drop[ty * s.grid.w + tx] === 1) return true;
    }
  }
  return false;
}

/** The charge ran out of floor: the twin goes over the edge. */
export function startFall(s: S, e: Enemy, d: DemoState): void {
  const X = ENEMY_DEFS[e.kind].x;
  d.move = 'fall';
  d.t = X.fallT as number;
  e.mode = 'idle';
  e.vx = 0; e.vy = 0; e.z = 0;
  setEnemyAnim(e, 'hurt');
  // Hurt, not killed: the fall takes a share of its max HP and leaves at least 1.
  e.hp = Math.max(1, e.hp - Math.round(e.hpMax * (X.fallLoss as number)));
  const a = Math.atan2(e.ay, e.ax);
  addFx(s, 'fall', e.x + Math.cos(a) * 6, e.y, e.dir, a, (X.fallT as number) + 8, 24, 24);
  sfx(s, 'fall');
  shake(s, 3);
  dust(s, e.x, e.y, 6);
  floater(s, 'FELL', e.x, e.y - 30, 'yellow', false, 50);
}

/** One tick of the fall, the time below and the climb. The twin walks again once the climb is over. */
export function fallUpdate(s: S, e: Enemy, d: DemoState): void {
  const X = ENEMY_DEFS[e.kind].x;
  if (--d.t > 0) return;
  if (d.move === 'fall') { d.move = 'below'; d.t = X.belowT as number; return; }
  if (d.move === 'below') { d.move = 'climb'; d.t = X.climbT as number; return; }
  d.move = 'walk';
  d.t = 0;
  d.chargeCd = Math.max(d.chargeCd, 45);
  e.mode = 'chase';
  setEnemyAnim(e, 'idle');
  dust(s, e.x, e.y, 5);
}

/** How far down a twin is, 0 on the edge to 1 out of sight, for ActorView.k. Undefined while it is on its feet. */
export function fallK(e: Enemy): ActorView['k'] {
  const d = e.demo;
  if (!d || !isAway(d.move)) return undefined;
  const X = ENEMY_DEFS[e.kind].x;
  if (d.move === 'fall') return 1 - d.t / (X.fallT as number);
  return d.move === 'below' ? 1 : d.t / (X.climbT as number);
}
