// The young demodog (docs/level-4.md): it circles the hero about 48 px out, then winds up for 28 frames under the red "!"
// and lunges for 14 frames at 4 px a frame, and recovers for 30. In a pack only one commits at a time (a wind-up or a lunge),
// the one that has had the fewest turns goes first, and at least 20 frames pass between one lunge ending and the next wind-up.
// In a defense a wave demodog goes for the ward instead of the hero (combat/defense.ts, wantsWard) and picks again after each attack.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { dist, los, moveBody } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { hurtWard, wantsWard, wardPos } from '../combat/defense.ts';
import { speedMul } from '../combat/status.ts';
import { wander } from './rat.ts';
import type { Aim } from './steer.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';

const DEF = ENEMY_DEFS.demodog;
const X = DEF.x;

const isDog = (e: Enemy): boolean => e.kind === 'demodog' && !e.dead && !e.dormant;

/** What this demodog is going for: the ward while its attack is locked on her, else the hero. */
const aimOf = (s: S, e: Enemy, hero: Hero): Aim => (e.onWard ? wardPos(s) : null) ?? hero;

/** Is this demodog the one whose turn it is? No other is winding up or lunging, the gap is over and no waiting pack-mate is owed the turn. */
function myTurn(s: S, e: Enemy, hero: Hero): boolean {
  if (s.frame - s.lungeEnd < X.gap) return false;
  for (const o of s.enemies) {
    if (o === e || !isDog(o)) continue;
    if (o.mode === 'windup' || o.mode === 'lunge') return false;
  }
  for (const o of s.enemies) {
    if (o === e || !isDog(o) || !o.aware || o.mode !== 'chase' || o.cd > 0 || o.stagger > 0) continue;
    const at = aimOf(s, o, hero);
    if (dist(o.x, o.y, at.x, at.y) > X.range || !los(s, o.x, o.y, at.x, at.y)) continue;
    if (o.swings < e.swings || (o.swings === e.swings && o.uid < e.uid)) return false;
  }
  return true;
}

/** Circles at the orbit radius: in when far, out when near, round when between. The way round turns over every 90 frames. */
function circle(s: S, e: Enemy, hero: Aim, d: number, clear: boolean): void {
  const sp = DEF.speed * e.spd * speedMul(e.stat);
  if (!clear) { setEnemyAnim(e, chaseHero(s, e, hero, sp, false) > 0 ? 'walk' : 'idle'); return; }
  if (d > X.far) {
    setEnemyAnim(e, stepToward(s, e, hero.x, hero.y, sp) > 0 ? 'walk' : 'idle');
  } else if (d < X.near) {
    const a = Math.atan2(e.y - hero.y, e.x - hero.x);
    setEnemyAnim(e, stepToward(s, e, e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, sp * 0.8) > 0 ? 'walk' : 'idle');
    faceHero(e, hero);
  } else {
    const side = ((e.uid + Math.floor(s.frame / 90)) & 1) === 0 ? 1 : -1;
    const phi = Math.atan2(e.y - hero.y, e.x - hero.x) + side * 0.5;
    setEnemyAnim(e, stepToward(s, e, hero.x + Math.cos(phi) * X.orbit, hero.y + Math.sin(phi) * X.orbit, sp * 0.9) > 0 ? 'walk' : 'idle');
    faceHero(e, hero);
  }
}

export function demodogUpdate(s: S, e: Enemy, hero: Hero): void {
  // A hit that broke a lunge off: the gap starts now.
  if (e.lunging && e.mode !== 'lunge') { e.lunging = false; s.lungeEnd = s.frame; }
  // Between attacks it picks its target again. Once an attack starts, it stays on the one it chose.
  if (e.mode !== 'windup' && e.mode !== 'lunge' && e.mode !== 'recover') e.onWard = wantsWard(s, e, hero);
  const ward = e.onWard ? wardPos(s) : null;
  if (!ward) e.onWard = false;
  const tgt: Aim = ward ?? hero;
  const d = dist(e.x, e.y, tgt.x, tgt.y);
  const clear = los(s, e.x, e.y, tgt.x, tgt.y);
  if (!e.aware) {
    if (d <= DEF.aggro && clear) alertEnemy(s, e);
    else { wander(s, e); return; }
  }
  if (d > 300) { e.aware = false; e.mode = 'idle'; return; }
  switch (e.mode) {
    case 'windup':
      faceHero(e, tgt);
      setEnemyAnim(e, 'attack');
      if (--e.modeT <= 0) {
        const a = Math.atan2(tgt.y - e.y, tgt.x - e.x);
        e.ax = Math.cos(a) * X.lungeSpeed;
        e.ay = Math.sin(a) * X.lungeSpeed;
        e.dir = dirOfVec(e.ax, e.ay, e.dir);
        e.mode = 'lunge';
        e.modeT = X.lungeT;
        e.hitDone = false;
        e.lunging = true;
        e.swings++;
        setEnemyAnim(e, 'dash');
        sfx(s, 'lunge');
      }
      return;
    case 'lunge':
      moveBody(s, e, e.ax, e.ay);
      if (!e.hitDone && Math.abs(e.x - hero.x) < 11 && Math.abs(e.y - hero.y) < 11) {
        e.hitDone = true;
        if (hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, DEF.power, e.atk, X.kb) > 0) sfx(s, 'chomp');
      } else if (!e.hitDone && ward && Math.abs(e.x - ward.x) < 11 && Math.abs(e.y - ward.y) < 11) {
        e.hitDone = true;
        if (hurtWard(s, DEF.power, e.atk) > 0) sfx(s, 'chomp');
      }
      if (--e.modeT <= 0) {
        e.mode = 'recover';
        e.modeT = X.recover;
        e.lunging = false;
        s.lungeEnd = s.frame;
        setEnemyAnim(e, 'idle');
      }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--e.modeT <= 0) e.mode = 'chase';
      return;
    default:
      e.mode = 'chase';
      circle(s, e, tgt, d, clear);
      if (clear && e.cd <= 0 && d <= X.range && myTurn(s, e, hero)) {
        e.mode = 'windup';
        e.modeT = DEF.windup;
        e.cd = Math.round(DEF.cooldown * e.cdMul);
        faceHero(e, tgt);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
  }
}
