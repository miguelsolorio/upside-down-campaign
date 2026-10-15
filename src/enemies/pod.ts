// The spore pod (docs/level-4.md): rooted. A hero within 48 px starts a 40 frame swell under the red "!", and at its end the
// pod bursts into a 28 px cloud ('spore' fx) that hurts and slows whoever is in it. It dies in its own burst and gives no XP
// that way. Killed first, it is worth its 3.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dist, los } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { slowHero } from '../combat/status.ts';
import { setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.pod;
const X = DEF.x;

function burst(s: S, e: Enemy, hero: Hero): void {
  addFx(s, 'spore', e.x, e.y, 'down', 0, X.cloudT, X.cloud * 2, 32);
  sfx(s, 'steam');
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.cloud && los(s, e.x, e.y, hero.x, hero.y)) {
    if (hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb) > 0) slowHero(s, hero, X.slowT);
  }
  // It dies in the burst: the reaper sees 0 HP and files a kill that pays nothing.
  // A drop of -1 stays below any roll, even with Dustin's Compass added.
  e.xp = 0;
  e.drop = -1;
  e.hp = 0;
}

export function podUpdate(s: S, e: Enemy, hero: Hero): void {
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (e.mode === 'windup') {
    setEnemyAnim(e, 'attack');
    if (--e.modeT <= 0) burst(s, e, hero);
    return;
  }
  if (d > DEF.aggro + 30) { e.aware = false; e.mode = 'idle'; return; }
  e.mode = 'chase';
  setEnemyAnim(e, 'idle');
  if (clear && d <= DEF.aggro) {
    e.mode = 'windup';
    e.modeT = DEF.windup;
    sfx(s, 'alert');
    setEnemyAnim(e, 'attack');
  }
}
