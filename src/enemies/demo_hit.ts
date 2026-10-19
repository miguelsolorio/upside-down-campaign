// What a hit does to the Demogorgon, and how it gets pinned (docs/level-3.md, "Demogorgon"). The hit pipeline in
// combat/damage.ts and the burn tick in combat/status.ts call these; the brain is demogorgon.ts.
//
// Its HP can't drop below 1 until it has been stunned three times against a wall. After that, the hit that would
// take it to 0 pins it instead: pose 'pinned', no more attacks, and from then on only its finisher hurts it: Eleven's Mind Blast beam
// for the 1.3 one, Hopper's ground slam for the pit one of stage 4.1 (docs/level-10.md). Anything else that touches it is reported as a
// try ('poked' with its spawn id) and does nothing. (Chapter 5's foe Demogorgon, twins and Commander share the state and the stun, not the pin:
// they die at 0 HP.)
import type { DemoState, Enemy, S } from '../combat/state.ts';
import { floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { BODY_Y } from '../combat/space.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { ActorView, HeroId } from '../core/types.ts';
import { ENEMY_DEFS } from './defs.ts';

/** Frames before the same pinned boss reports another try. */
const POKE_GAP = 45;
/** Share of their HP the finisher stands back up with if they were down when the boss was pinned. */
const REVIVE_HP = 0.3;

export function newDemo(): DemoState {
  return {
    move: 'walk', t: 0, stuns: 0, petals: false, chargeCd: 120, spitCd: 0, leapCd: 60, pokeCd: 0,
    sx: 0, sy: 0, tx: 0, ty: 0, mark: null,
  };
}

/** The pose gfx draws for what it is doing, or undefined while it simply walks, swipes or recovers. */
export function demoPose(d: DemoState): ActorView['pose'] {
  switch (d.move) {
    case 'wind': case 'run': return 'charge';
    case 'stun': return 'stun';
    case 'spit': return 'spit';
    case 'crouch': case 'air': return 'leap';
    case 'pinned': return 'pinned';
    case 'plant': return 'plant';
    case 'fall': case 'below': return 'fall';
    case 'climb': return 'climb';
    default: return undefined;
  }
}

export const isPinned = (e: Enemy): boolean => e.demo?.move === 'pinned';

/** The Demogorgon is dazed against a wall: it takes 50 percent more damage. */
export const demoStunned = (e: Enemy): boolean => e.demo?.move === 'stun';

/** A hit while it flies or charges does not shove it off its line, and a pinned one does not move. */
export const demoImmovable = (e: Enemy): boolean => {
  const m = e.demo?.move;
  return m === 'run' || m === 'air' || m === 'pinned' || m === 'plant';
};

/**
 * Is this hit the one that finishes the boss? Eleven's Mind Blast beam for the 1.3 Demogorgon, Hopper's ground slam for the pit one.
 * `beam` and `slam` say which kind of hit it was.
 */
export function isFinisher(e: Enemy, by: HeroId, beam: boolean, slam: boolean): boolean {
  return e.kind === 'pitdemo' ? slam && by === 'hopper' : beam && by === 'eleven';
}

/**
 * A hit on a pinned boss that is not its finisher: no damage, a small clink, and a try for the stage to hear.
 * Returns true when the hit was swallowed.
 */
export function demoPoke(s: S, by: HeroId, e: Enemy, finisher: boolean): boolean {
  const d = e.demo;
  if (!d || d.move !== 'pinned' || finisher) return false;
  sparks(s, e.x, e.y - BODY_Y, 2);
  sfx(s, 'block');
  if (d.pokeCd <= 0) {
    d.pokeCd = POKE_GAP;
    s.events.push({ t: 'poked', propId: e.id, hero: by });
  }
  return true;
}

/** The hero who finishes a pinned boss can't finish a fight they are out of: if they were knocked down they stand up, with the MP for one cast. */
function standFinisher(s: S, e: Enemy): void {
  const id: HeroId = e.kind === 'pitdemo' ? 'hopper' : 'eleven';
  const el = s.heroes.find((h) => h.id === id);
  if (!el) return;
  if (el.ko) {
    el.ko = false;
    el.hp = Math.max(1, Math.ceil(el.st.hp * REVIVE_HP));
    el.anim = 'idle'; el.animT = 0;
    s.bodies = s.bodies.filter((b) => b.id !== id);
  }
  el.mp = Math.max(el.mp, HERO_DEFS[id].special.mp);
}

/** Pins the boss where it stands. Emits `pinned` once. */
export function pinBoss(s: S, e: Enemy): void {
  const d = e.demo;
  if (!d || d.move === 'pinned') return;
  d.move = 'pinned';
  d.t = 0;
  e.mode = 'idle';
  e.vx = 0; e.vy = 0; e.z = 0;
  e.hp = 1;
  e.anim = 'idle'; e.animT = 0;
  // Whatever it had in the air stops mattering.
  const marks = new Set<unknown>(s.globs.map((g) => g.mark));
  if (d.mark) marks.add(d.mark);
  s.globs = [];
  s.fx = s.fx.filter((f) => !marks.has(f));
  d.mark = null;
  s.events.push({ t: 'pinned', spawnId: e.id });
  sfx(s, 'roar');
  shake(s, 4);
  flashScreen(s, 0.3);
  floater(s, 'PINNED', e.x, e.y - 34, 'yellow', true, 60);
  standFinisher(s, e);
}

/**
 * Called after a hit or a burn tick has lowered `e.hp`. Holds the floor of 1, and pins the boss when the damage would
 * have finished it after its third stun. `finisher` is true for the hit that kills a pinned one (isFinisher).
 */
export function demoSettle(s: S, e: Enemy, finisher: boolean): void {
  const d = e.demo;
  // Only the 1.3 Demogorgon and the pit one hold at 1 HP and wait to be pinned. The foe, the twins and the Commander die at 0.
  if (!d || e.hp > 0 || (e.kind !== 'demogorgon' && e.kind !== 'pitdemo')) return;
  if (d.move === 'pinned') {
    if (finisher) return;
    e.hp = 1;
    return;
  }
  if (d.stuns >= ENEMY_DEFS[e.kind].x.stunsToPin) pinBoss(s, e);
  e.hp = 1;
}
