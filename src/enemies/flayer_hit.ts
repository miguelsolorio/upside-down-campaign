// What a hit and a death do to the Mind Flayer and its legs, and how they look (docs/level-9.md, "The Mind Flayer"). combat/damage.ts,
// combat/kills.ts, combat/view.ts and enemies/hold.ts call these; the brains are flayer.ts and flayer_legs.ts.
//
// The body is shielded while it is up and any leg stands: a hit on it does nothing but a spark and the `block` sfx. With every leg severed
// its head is down and it takes x1.5. Nothing moves either of them: knockback, Push and the candy bar do nothing.
//
// A leg at 0 HP is severed, not dead. It keeps hp 0, so every hit, shot and sweep skips it, and `legHeld` keeps the reaper off it while
// its body lives. At the body's 0 HP the legs go to 0 with it, so the body and all four legs die in one pass: one `groupCleared`, and a
// retry's kill list never holds a leg by itself.
import type { ActorView, EnemyKind } from '../core/types.ts';
import type { Enemy, FlayerState, LegState, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { dust, floater, sfx, sparks } from '../combat/fx.ts';
import { ENEMY_DEFS } from './defs.ts';

/** The group the Flayed waves belong to (enemies/flayer.ts). */
export const WAVE_GROUP = 'waves';

/** The Mind Flayer's body is the 3.3 one or the final boss's (`flayer5`): the same brain on its own numbers, so `kind` picks the def. */
export function newFlayer(kind: EnemyKind = 'flayer'): FlayerState {
  const X = ENEMY_DEFS[kind].x;
  return { move: 'up', t: 0, legs: [], slamCd: X.slamFirst as number, sweepCd: X.sweepFirst as number, waveCd: X.waveFirst as number, phase2: false, waves: 0 };
}

/** A leg grows from (rx, ry), the feet position of its spawn. Its tip is set when the spawns are linked (flayer_legs.ts). */
export function newLeg(rx: number, ry: number): LegState {
  return { body: null, move: 'idle', t: 0, rx, ry, sweep: null, struck: false, at: -1 };
}

/** The pose gfx draws: 'rise' coming in through the skylight, 'down' with its head on the floor. */
export function flayerPose(f: FlayerState): ActorView['pose'] {
  return f.move === 'rise' ? 'rise' : f.move === 'down' ? 'down' : undefined;
}

/** The pose of a leg: 'warn' while its line or band is shown, 'slam' while it strikes, 'severed' once cut. */
export function legPose(l: LegState): ActorView['pose'] {
  return l.move === 'warn' ? 'warn' : l.move === 'slam' ? 'slam' : l.move === 'severed' ? 'severed' : undefined;
}

/** A leg that is not cut and not dead. */
export const legStands = (l: Enemy): boolean => !l.dead && l.hp > 0 && l.leg !== null && l.leg.move !== 'severed';

/** The body is up and a hit does nothing: in 3.3 while a leg stands, for the final boss's (`flayer5`) while its chest is shut. */
export const flayerShielded = (e: Enemy): boolean =>
  e.flayer !== null && e.flayer.move === 'up' && (e.fin !== null ? e.fin.open <= 0 : e.flayer.legs.some(legStands));

/** The final boss's chest is open, for a hit on a leg or with its head down: Vecna shows in it, and only hits there move the bar. */
export const chestOpen = (e: Enemy): boolean => e.fin !== null && e.flayer !== null && !e.dead && (e.fin.open > 0 || e.flayer.move === 'down');

/** Neither the body nor a leg can be moved, held or lured. */
export const flayerRooted = (e: Enemy): boolean => e.flayer !== null || e.leg !== null;

/** How much of a hit the body takes: half again with its head on the floor. */
export const flayerTakes = (e: Enemy): number => (e.flayer?.move === 'down' ? (ENEMY_DEFS[e.kind].x.downMul as number) : 1);

/** A severed leg waits on the floor while its body lives, at 0 HP and not dead: the reaper leaves it alone. */
export const legHeld = (e: Enemy): boolean =>
  e.leg !== null && e.leg.move === 'severed' && e.leg.body !== null && !e.leg.body.dead && e.leg.body.hp > 0;

/** A hit on the shielded body: a spark and `block`, no damage. Returns true when the hit was swallowed. */
export function flayerBlock(s: S, e: Enemy): boolean {
  if (!flayerShielded(e)) return false;
  sparks(s, e.x, e.y - BODY_Y, 2);
  sfx(s, 'block');
  floater(s, 'BLOCK', e.x, e.y - 24, 'sky', false, 30);
  return true;
}

/** The body is at 0 HP: its legs go with it, so they are all killed in the same pass. Called at the top of reapEnemies. */
export function doomLegs(s: S): void {
  for (const b of s.enemies) {
    if (!b.flayer || b.dead || b.dormant || b.hp > 0) continue;
    for (const l of b.flayer.legs) if (!l.dead) l.hp = 0;
  }
}

/** The body died: the pools dry up, a band in the air goes, and the Flayed it sent fall with it for no XP and no kill. */
export function clearFlayer(s: S, e: Enemy): void {
  if (!e.flayer) return;
  s.pools = [];
  s.fx = s.fx.filter((f) => f.kind !== 'sweep');
  for (const o of s.enemies) {
    if (o.dead || o.rt === null || o.group !== WAVE_GROUP) continue;
    o.dead = true; o.deadT = 0; o.aware = false; o.mode = 'idle'; o.hp = 0; o.anim = 'ko'; o.animT = 0; o.vx = 0; o.vy = 0; o.z = 0;
    dust(s, o.x, o.y, 4);
  }
}
