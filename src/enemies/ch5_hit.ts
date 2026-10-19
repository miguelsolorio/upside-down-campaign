// What a hit does to chapter 5's shield carriers (docs/level-14.md): the trooper's and the Commander's riot shield bounces a frontal hit
// for no damage (the `clang` sfx, damage.ts), and a smash, a hit from a hero with that utility (Steve, Hopper), breaks it for good
// (`shieldBreak`): once for a trooper, three times for the Commander, once more after the shield has cracked. A shield that is gone stays
// down (shield.ts, guarding). damage.ts calls these from the hit pipeline.
import type { Enemy, Hero, S } from '../combat/state.ts';
import { floater, sfx, shake } from '../combat/fx.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { ENEMY_DEFS } from './defs.ts';

/** The trooper and the Commander: the foes whose shield bounces a hit for nothing and a smash breaks. */
export const hasRiotShield = (e: Enemy): boolean => e.kind === 'trooper' || e.kind === 'commander';

/** A hit from a hero whose swing smashes: Steve's nail bat and Hopper's haymaker and slam. */
export const isSmash = (by: Hero): boolean => HERO_DEFS[by.id].utilities.includes('smash');

/** True while the shield is broken for good. */
export const shieldGone = (e: Enemy): boolean => e.ch5 !== null && e.ch5.gone;

/**
 * A smash lands on a shield that is up. It counts, and the one that is enough breaks the shield for good: the `shieldBreak` sfx, a BREAK
 * floater and a shake. The Commander's shield cracked at half HP needs only one more. Returns true when this smash broke it.
 */
export function smashShield(s: S, e: Enemy): boolean {
  const c = e.ch5;
  if (!c || c.gone) return false;
  const x = ENEMY_DEFS[e.kind].x;
  c.smashes++;
  if (c.smashes < (c.cracked ? 1 : x.smashes as number)) return false;
  c.gone = true;
  sfx(s, 'shieldBreak');
  shake(s, 2);
  floater(s, 'BREAK', e.x, e.y - 33, 'yellow', false, 36);
  return true;
}
