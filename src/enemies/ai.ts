// Enemy AI driver: shared per-tick upkeep (cooldowns, knockback, stagger, stun, the candy lure), then the
// kind-specific brain, then a soft push so enemies do not stack on one pixel.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { dist, moveBody } from '../combat/space.ts';
import { speedMul } from '../combat/status.ts';
import { ratUpdate } from './rat.ts';
import { agentUpdate } from './agent.ts';
import { setEnemyAnim, stepToward } from './steer.ts';

const FRICTION = 0.78;
const SEPARATION = 9;

function updateOne(s: S, e: Enemy, hero: Hero): void {
  e.animT++;
  if (e.flash > 0) e.flash = Math.max(0, e.flash - 0.1);
  if (e.cd > 0) e.cd--;
  if (e.noLure > 0) e.noLure--;
  if (e.vx !== 0 || e.vy !== 0) {
    moveBody(s, e, e.vx, e.vy);
    e.vx *= FRICTION; e.vy *= FRICTION;
    if (Math.hypot(e.vx, e.vy) < 0.1) { e.vx = 0; e.vy = 0; }
  }
  if (e.stagger > 0) { e.stagger--; setEnemyAnim(e, 'hurt'); return; }
  if (e.stat.stun > 0) { setEnemyAnim(e, 'hurt'); return; }
  if (s.over || hero.ko) { setEnemyAnim(e, 'idle'); return; }

  const def = ENEMY_DEFS[e.kind];
  const lure = s.lure;
  if (e.mode === 'lured') {
    if (!lure || e.noLure > 0) e.mode = e.aware ? 'chase' : e.patrol.length > 0 ? 'patrol' : 'idle';
  } else if (lure && e.noLure <= 0 && e.mode !== 'windup' && e.mode !== 'lunge' && dist(e.x, e.y, lure.x, lure.y) <= lure.pull) {
    e.mode = 'lured';
  }
  if (e.mode === 'lured' && lure) {
    const moved = dist(e.x, e.y, lure.x, lure.y) > 6 ? stepToward(s, e, lure.x, lure.y, def.speed * 0.9 * speedMul(e.stat)) : 0;
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
    return;
  }
  if (e.kind === 'rat') ratUpdate(s, e, hero);
  else agentUpdate(s, e, hero);
}

function separate(s: S): void {
  const list = s.enemies.filter((e) => !e.dead && !e.dormant);
  for (let i = 0; i < list.length; i++) {
    const a = list[i] as Enemy;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j] as Enemy;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= SEPARATION) continue;
      const nx = d > 0.01 ? dx / d : ((a.uid & 1) === 0 ? 1 : -1);
      const ny = d > 0.01 ? dy / d : 0;
      const push = (SEPARATION - d) * 0.25;
      moveBody(s, a, -nx * push, -ny * push);
      moveBody(s, b, nx * push, ny * push);
    }
  }
}

export function updateEnemies(s: S): void {
  const hero = activeHero(s);
  for (const e of s.enemies) {
    if (e.dead || e.dormant) continue;
    updateOne(s, e, hero);
  }
  separate(s);
}

/** True while any awake enemy is chasing or attacking the hero. Drives the music's combat layer. */
export function anyAggro(s: S): boolean {
  for (const e of s.enemies) {
    if (e.dead || e.dormant || !e.aware) continue;
    if (e.mode === 'chase' || e.mode === 'windup' || e.mode === 'lunge' || e.mode === 'recover') return true;
  }
  return false;
}
