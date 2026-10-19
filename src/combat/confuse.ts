// Confusion (Robin's Word vomit, docs/level-7.md). One shared brain takes over any confused enemy, whatever its kind: it forgets
// the party, walks to the nearest other enemy and bump-attacks it. The enemy's own brain does not run while it lasts
// (enemies/ai.ts hands over here). A boss is never confused. It staggers instead.
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { wander } from '../enemies/rat.ts';
import { setEnemyAnim, stepToward } from '../enemies/steer.ts';
import type { Enemy, S } from './state.ts';
import { dirOfVec } from './state.ts';
import { BODY_Y, dist, los } from './space.ts';
import { floater, sfx, sparks } from './fx.ts';
import { rollDamage, spreadRoll } from './damage.ts';
import { grigoriDazed } from '../enemies/grigori_hit.ts';
import { billyDazed } from '../enemies/billy_hit.ts';
import { untouchable } from '../enemies/hold.ts';
import { speedMul } from './status.ts';

/** Frames of wind-up before a bump, and the share of the attacker's ATK it lands with. */
export const BUMP_WINDUP = 20;
export const BUMP_POWER = 0.8;
/** Frames a boss staggers instead of being confused. */
export const BOSS_STAGGER = 30;
/** How close it comes to its mark, how close it must be to start a bump, and how far off the mark may drift before the bump whiffs. */
const CLOSE = 12;
const BUMP_RANGE = 18;
const BUMP_SLACK = 6;
const BUMP_KB = 2;

/** A boss: the Demogorgon, the Alpha, Grigori, Billy, the Mind Flayer or one of its legs, Vecna or one of his orbs, or any spawn in group `boss`. */
export function isBoss(e: Enemy): boolean {
  return e.demo !== null || e.alpha !== null || e.kind === 'grigori' || e.billy !== null || e.flayer !== null || e.leg !== null || e.vecna !== null || e.orb !== null || e.group === 'boss';
}

/** A boss caught in the cone staggers for a moment. Not while it is in the air or charging, where it would hang in mid-move. */
function stagger(s: S, e: Enemy): void {
  // Nothing moves the Mind Flayer's body. A leg staggers unless it is striking, and its slam waits.
  if (e.flayer || e.leg?.move === 'slam') return;
  // Nor Vecna or his orbs: they don't stagger at all.
  if (e.vecna || e.orb) return;
  const move = e.demo?.move ?? e.alpha?.move ?? e.grigori?.move ?? e.billy?.move;
  // Not in the air, charging or lunging, and not while stunned on the power box or against a wall: there it would hang in mid-move.
  if (move === 'air' || move === 'run' || (e.grigori && (move === 'lunge' || move === 'stun')) || (e.billy && (move === 'stun' || move === 'pinned'))) return;
  e.stagger = Math.max(e.stagger, BOSS_STAGGER);
  // Grigori and Billy also lose the wind-up they were in and drop a hero they held.
  grigoriDazed(s, e);
  billyDazed(s, e);
  floater(s, 'DAZED', e.x, e.y - 24, 'mist', false, 30);
}

/** Confuses an enemy for `frames` more (a longer spell is not shortened). A boss staggers instead. */
export function confuse(s: S, e: Enemy, frames: number): void {
  if (e.dead || e.dormant || e.hp <= 0 || untouchable(e)) return;
  if (isBoss(e)) { stagger(s, e); return; }
  if (e.stat.confuse <= 0) floater(s, 'CONFUSED', e.x, e.y - 24, 'purple', false, 40);
  e.stat.confuse = Math.max(e.stat.confuse, frames);
}

/** The nearest other enemy it can see: awake, standing, not a boss. */
function nearestOther(s: S, e: Enemy): Enemy | null {
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const o of s.enemies) {
    if (o === e || o.dead || o.dormant || o.hp <= 0 || isBoss(o) || untouchable(o)) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d >= bestD || !los(s, e.x, e.y, o.x, o.y)) continue;
    best = o; bestD = d;
  }
  return best;
}

/** The bump lands: the attacker's ATK times 0.8 against the other's DEF, scaled like the enemies' own HP. */
function bump(s: S, e: Enemy, t: Enemy): void {
  const raw = rollDamage(BUMP_POWER, e.atk, t.def, spreadRoll(s.rng));
  const dmg = Math.max(1, Math.round(raw * s.mult * s.foeMult));
  s.stats.damageDealt += Math.min(dmg, Math.max(0, t.hp));
  t.hp -= dmg;
  t.flash = 1;
  t.hurtSeen = true;
  t.stagger = Math.max(t.stagger, 10);
  if (t.mode === 'windup' || t.mode === 'lunge') { t.mode = 'chase'; t.modeT = 0; }
  const a = Math.atan2(t.y - e.y, t.x - e.x);
  const kb = BUMP_KB / ENEMY_DEFS[t.kind].weight;
  t.vx += Math.cos(a) * kb;
  t.vy += Math.sin(a) * kb;
  floater(s, String(dmg), t.x, t.y - 15, 'white');
  sfx(s, 'hit');
  sparks(s, t.x, t.y - BODY_Y, 3);
}

/**
 * One tick of a confused enemy. It walks to the nearest other enemy, and once in reach winds up for BUMP_WINDUP frames under
 * the "!" and bumps it. With nobody to fight it wanders. It never goes for the hero, and being hit does not end it.
 */
export function confusedUpdate(s: S, e: Enemy): void {
  const t = nearestOther(s, e);
  if (e.mode === 'windup') {
    if (t) e.dir = dirOfVec(t.x - e.x, t.y - e.y, e.dir);
    setEnemyAnim(e, 'attack');
    if (--e.modeT <= 0) {
      e.mode = 'chase';
      e.modeT = 0;
      if (t && dist(e.x, e.y, t.x, t.y) <= BUMP_RANGE + BUMP_SLACK) bump(s, e, t);
    }
    return;
  }
  e.mode = 'chase';
  if (!t) { wander(s, e); return; }
  const d = dist(e.x, e.y, t.x, t.y);
  if (d > CLOSE) {
    const moved = stepToward(s, e, t.x, t.y, ENEMY_DEFS[e.kind].speed * e.spd * speedMul(e.stat));
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
  } else {
    e.dir = dirOfVec(t.x - e.x, t.y - e.y, e.dir);
    setEnemyAnim(e, 'idle');
  }
  if (d <= BUMP_RANGE && e.cd <= 0) {
    e.mode = 'windup';
    e.modeT = BUMP_WINDUP;
    e.cd = Math.round(ENEMY_DEFS[e.kind].cooldown * e.cdMul);
    sfx(s, 'alert');
    setEnemyAnim(e, 'attack');
  }
}
