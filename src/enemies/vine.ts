// The vine (docs/level-4.md): rooted. A hero inside its reach starts a 30 frame wind-up under the red "!", and the lash that
// follows hurts and slows him if he is still in reach. Fire does double damage to it (damage.ts, status.ts). It is often
// spawned hidden in the corn, and a hidden vine shows itself by lashing.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dist, los } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { slowHero } from '../combat/status.ts';
import { faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.vine;
const X = DEF.x;

export function vineUpdate(s: S, e: Enemy, hero: Hero): void {
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (e.mode !== 'windup' && d > DEF.aggro + 30) { e.aware = false; e.mode = 'idle'; return; }
  switch (e.mode) {
    case 'windup':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--e.modeT <= 0) {
        sfx(s, 'bash');
        // The lash lands only on a hero who is still in reach.
        if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.reach + 4 && los(s, e.x, e.y, hero.x, hero.y)) {
          if (hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb) > 0) slowHero(s, hero, X.slowT);
        }
        e.mode = 'recover';
        e.modeT = X.recover;
      }
      return;
    case 'recover':
      setEnemyAnim(e, e.modeT > X.recover - X.swing ? 'attack' : 'idle');
      if (--e.modeT <= 0) e.mode = 'chase';
      return;
    default:
      e.mode = 'chase';
      faceHero(e, hero);
      setEnemyAnim(e, 'idle');
      if (clear && e.cd <= 0 && d <= X.reach) {
        e.mode = 'windup';
        e.modeT = DEF.windup;
        e.cd = Math.round(DEF.cooldown * e.cdMul);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
  }
}
