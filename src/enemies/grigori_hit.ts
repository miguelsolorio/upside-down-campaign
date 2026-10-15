// What a hit, a power box and Word vomit do to Grigori, and how it looks (docs/level-8.md, "Grigori"). combat/damage.ts, combat/
// powerbox.ts and combat/confuse.ts call these; the brain is grigori.ts.
//
// A hit from inside 70 degrees of his front deals 25 percent (the arc math is inFront in enemies/shield.ts, read off the way he faces)
// and sounds `block`. From the side or behind it deals full damage. Standing on the power box when it fires stuns him for 180 frames
// (pose 'stun'): he takes 8 percent of his max HP at once, and then full damage from every side, times 1.5. Hits never stagger him.
import type { ActorView } from '../core/types.ts';
import type { Enemy, GrigoriState, S } from '../combat/state.ts';
import { floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { BODY_Y } from '../combat/space.ts';
import { ENEMY_DEFS } from './defs.ts';
import { releaseHold } from './hold.ts';

const X = ENEMY_DEFS.grigori.x;

export function newGrigori(): GrigoriState { return { move: 'walk', t: 0, grabCd: X.grabFirst as number, raged: false }; }

/** The pose gfx draws: 'grab' from the wind-up of the lunge to the throw, 'stun' on the power box, nothing while he walks or swings. */
export function grigoriPose(g: GrigoriState): ActorView['pose'] {
  switch (g.move) {
    case 'grab': case 'lunge': case 'hold': return 'grab';
    case 'stun': return 'stun';
    default: return undefined;
  }
}

export const grigoriStunned = (e: Enemy): boolean => e.grigori?.move === 'stun';

/**
 * His front guard is up: awake, not stunned and not recovering. The recovery after a haymaker or a throw is the opening the spec
 * names, and he takes full damage from every side in it, not only from behind. With the guard up through it, a player who stands in
 * front and swings (the careless bot) never won: 0 of 20 on the stage.
 */
export const grigoriGuards = (e: Enemy): boolean =>
  e.grigori !== null && !e.dead && !e.dormant && e.grigori.move !== 'stun' && e.grigori.move !== 'recover';

/** How much of a hit he takes on top of the front guard: half again while stunned. */
export const grigoriTakes = (e: Enemy): number => (grigoriStunned(e) ? X.stunMul as number : 1);

/** A hit while he lunges doesn't push him off the line. */
export const grigoriImmovable = (e: Enemy): boolean => e.grigori?.move === 'lunge';

/** Back to walking: the wind-up is gone, and so is the hero he held. */
function stopMove(s: S, e: Enemy, g: GrigoriState): void {
  releaseHold(s, e);
  g.move = 'walk';
  g.t = 0;
  e.mode = 'chase';
  e.modeT = 0;
}

/** Word vomit: he staggers instead of being confused. A wind-up in progress is lost and a hero he held is dropped. */
export function grigoriDazed(s: S, e: Enemy): void {
  const g = e.grigori;
  if (!g || g.move === 'stun' || g.move === 'lunge') return;
  if (g.move !== 'recover') stopMove(s, e, g);
}

/** The power box fired under his feet: 180 frames of stun and 8 percent of his max HP. Once per firing, and not again while stunned. */
export function stunGrigori(s: S, e: Enemy): void {
  const g = e.grigori;
  if (!g || e.dead || e.dormant || g.move === 'stun') return;
  stopMove(s, e, g);
  g.move = 'stun';
  g.t = X.stunT;
  e.mode = 'recover';
  e.stagger = 0;
  e.anim = 'hurt'; e.animT = 0;
  const dmg = Math.max(1, Math.round(e.hpMax * (X.stunHp as number)));
  e.hp -= dmg;
  e.flash = 1;
  e.hurtSeen = true;
  s.stats.damageDealt += Math.min(dmg, Math.max(0, e.hp + dmg));
  floater(s, String(dmg), e.x, e.y - 15, 'sky');
  floater(s, 'STUNNED', e.x, e.y - 26, 'yellow', true, 60);
  sparks(s, e.x, e.y - BODY_Y, 6);
  sfx(s, 'zap');
  shake(s, 4);
  flashScreen(s, 0.2);
}
