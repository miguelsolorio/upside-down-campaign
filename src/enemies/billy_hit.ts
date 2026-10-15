// What a hit, Word vomit and the reach do to Flayed Billy, and how it looks (docs/level-9.md, "Billy"). combat/damage.ts, combat/status.ts,
// combat/confuse.ts, combat/kills.ts and combat/view.ts call these; the brain is billy.ts.
//
// A wall stun takes x1.5. Hits never stagger him or break a wind-up, and knock him back a quarter as far (weight 4 in defs.ts). Word vomit
// staggers him for 30 frames (combat/confuse.ts) and drops a hero he held.
//
// Pinned: the hit that would take him to 0 HP leaves him kneeling instead (pose 'pinned'), with { t: 'pinned', spawnId } once. Inside he
// holds 1 HP, because every hit, shot and sweep skips an enemy at 0; the view reports 0 (no boss bar, an empty bar over his head). From then
// on every hit does nothing and is reported as a try: { t: 'poked', propId: 'billy', hero }. A knocked-out Eleven stands back up for it.
//
// The reach: while Eleven is the active hero, standing, within 32 px of him, ActorView.k climbs by 1/60 a frame, else it falls by 1/120
// toward 0. `t` holds it in whole units of 1/7200, so sixty frames of climbing land exactly on 1. At 1 he is freed: the 'reach' sfx, a
// 'reveal' fx, and he dies like any enemy (the kill, his XP, groupCleared). A dead Billy becomes an npc `billy` where he knelt.
import type { ActorView, HeroId } from '../core/types.ts';
import type { BillyState, Enemy, Hero, S } from '../combat/state.ts';
import { addFx, dust, floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { BODY_Y, dist } from '../combat/space.ts';
import { standHero } from '../combat/pokes.ts';
import { ENEMY_DEFS } from './defs.ts';
import { releaseHold } from './hold.ts';

const X = ENEMY_DEFS.billy.x;
/** The reach at 1, in units: a frame of climbing adds reachFall of them, a frame of falling takes reachRise. */
const FULL = X.reachRise * X.reachFall;

export function newBilly(): BillyState {
  return { move: 'walk', t: 0, chargeCd: X.chargeFirst as number, grabCd: X.grabFirst as number, raged: false, pokeCd: 0 };
}

/** The pose gfx draws: 'charge' from the "!" through the run, 'grab' from the "!" through the hold, 'stun' on the wall, 'pinned' on his knees. */
export function billyPose(b: BillyState): ActorView['pose'] {
  switch (b.move) {
    case 'wind': case 'run': return 'charge';
    case 'grab': case 'hold': return 'grab';
    case 'stun': return 'stun';
    case 'pinned': return 'pinned';
    default: return undefined;
  }
}

export const isBillyPinned = (e: Enemy): boolean => e.billy?.move === 'pinned';

/** The reach, 0..1, while he is pinned. */
export const billyK = (b: BillyState): number => (b.move === 'pinned' ? b.t / FULL : 0);

/** How much of a hit he takes: half again while he is stunned against a wall. */
export const billyTakes = (e: Enemy): number => (e.billy?.move === 'stun' ? X.stunMul : 1);

/** A hit does not shove him off the line of a charge, out of a hold or off his knees. */
export const billyImmovable = (e: Enemy): boolean => {
  const m = e.billy?.move;
  return m === 'run' || m === 'hold' || m === 'pinned';
};

/** Back to walking: the wind-up is gone, and so is the hero he held. */
function stopMove(s: S, e: Enemy, b: BillyState): void {
  releaseHold(s, e);
  b.move = 'walk';
  b.t = 0;
  e.mode = 'chase';
  e.modeT = 0;
}

/** Word vomit: he staggers instead of being confused. A wind-up in progress is lost and a hero he held is dropped. */
export function billyDazed(s: S, e: Enemy): void {
  const b = e.billy;
  if (!b || b.move === 'recover') return;
  stopMove(s, e, b);
}

/** Eleven can't reach a boss she is out for: she stands up, and the hero in front is the one who tried. */
function standEleven(s: S): void {
  const el = s.heroes.find((h) => h.id === 'eleven');
  if (el?.ko) standHero(s, el, X.reviveHp);
}

/**
 * A hit on a pinned Billy: no damage, a small clink, and a try for the stage to hear. A knocked-out Eleven stands back up. Returns true
 * when the hit was swallowed.
 */
export function billyPoke(s: S, by: HeroId, e: Enemy): boolean {
  const b = e.billy;
  if (!b || b.move !== 'pinned') return false;
  sparks(s, e.x, e.y - BODY_Y, 2);
  sfx(s, 'block');
  if (b.pokeCd <= 0) {
    b.pokeCd = X.pokeGap;
    s.events.push({ t: 'poked', propId: e.id, hero: by });
  }
  standEleven(s);
  return true;
}

/** Pins him where he stands. Emits `pinned` once. */
export function pinBilly(s: S, e: Enemy): void {
  const b = e.billy;
  if (!b || b.move === 'pinned') return;
  releaseHold(s, e);
  b.move = 'pinned';
  b.t = 0;
  e.mode = 'idle';
  e.vx = 0; e.vy = 0; e.z = 0; e.ax = 0; e.ay = 0;
  e.stagger = 0;
  e.hp = 1;
  e.anim = 'idle'; e.animT = 0;
  s.events.push({ t: 'pinned', spawnId: e.id });
  sfx(s, 'thud');
  shake(s, 4);
  flashScreen(s, 0.3);
  dust(s, e.x, e.y, 6);
  floater(s, 'PINNED', e.x, e.y - 34, 'yellow', true, 60);
}

/** Called after a hit or a burn tick has lowered `e.hp`: the damage that would have finished him pins him instead. */
export function billySettle(s: S, e: Enemy): void {
  if (!e.billy || e.hp > 0) return;
  if (e.billy.move === 'pinned') e.hp = 1; else pinBilly(s, e);
}

/** Eleven reaches him: the 'reach' sfx, a 'reveal' fx, and his HP goes. reapEnemies does the rest (combat/kills.ts). */
function free(s: S, e: Enemy): void {
  sfx(s, 'reach');
  addFx(s, 'reveal', e.x, e.y - BODY_Y, 'down', 0, 40, 24, 24);
  floater(s, 'FREE', e.x, e.y - 34, 'yellow', true, 60);
  e.by = 'eleven';
  e.hp = 0;
}

/** One tick of the pinned Billy: the reach climbs while Eleven stands within reach of him and falls when she does not. */
export function billyReach(s: S, e: Enemy, hero: Hero): void {
  const b = e.billy as BillyState;
  if (b.pokeCd > 0) b.pokeCd--;
  const near = hero.id === 'eleven' && !hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.reachR;
  b.t = near ? Math.min(FULL, b.t + X.reachFall) : Math.max(0, b.t - X.reachRise);
  if (b.t >= FULL) free(s, e);
}

/** A freed Billy stays on the floor as scenery: an npc where he knelt. Called from kill(). */
export function leaveBilly(s: S, e: Enemy): void {
  if (!e.billy) return;
  s.npcs.push({ id: 'billy', x: e.x, y: e.y, dir: e.dir, t: 0 });
}
