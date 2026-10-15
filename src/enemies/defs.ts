// Enemy data: the rat and the Lab agent, the Lab's riot guard and Warden, the Demogorgon, and chapter 2's demodog, vine and pod.
import type { Difficulty, EnemyKind } from '../core/types.ts';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  atk: number;
  def: number;
  /** px per frame while chasing. */
  speed: number;
  /** XP the kill is worth. Not scaled by difficulty. */
  xp: number;
  /** Notice radius in px, with line of sight. */
  aggro: number;
  /** Frames of the red "!" before a real attack. */
  windup: number;
  /** Damage multiplier of the attack. */
  power: number;
  /** Frames between attacks, measured from the start of the wind-up. */
  cooldown: number;
  /** Chance a kill drops a quarter, 0..1. */
  drop: number;
  /** Knockback taken is scaled by this. Rats are light. */
  weight: number;
  /** Move-specific numbers. */
  x: Record<string, number>;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  rat: {
    kind: 'rat', name: 'Rat', hp: 10, atk: 6, def: 0, speed: 1.3, xp: 4, aggro: 72,
    windup: 24, power: 0.75, cooldown: 80, drop: 0.15, weight: 1.3,
    // range: distance in px at which it commits to a bite. lunge: frames and px per frame of the lunge.
    x: { range: 20, lungeT: 9, lungeSpeed: 2.8, recover: 20 },
  },
  agent: {
    kind: 'agent', name: 'Lab agent', hp: 24, atk: 10, def: 3, speed: 0.85, xp: 8, aggro: 90,
    windup: 24, power: 0.65, cooldown: 100, drop: 0.3, weight: 1,
    // near and far bound the distance band in px. dart: px per frame. range: dart reach in px.
    // patrol: px per frame on patrol. back: px per frame when backing off. stamina: frames it will back off before it plants.
    x: { near: 70, far: 100, dart: 2, range: 170, patrol: 0.5, back: 0.7, stamina: 50, recover: 18, lose: 240 },
  },
  // The shielded pair. x holds the numbers guard.ts reads.
  // range: px at which it commits to a bash. reach: how far the bash lands. arc: the shield's half angle in degrees.
  // block: the share of damage a blocked hit still deals. breakKb: the knockback that breaks the shield, breakT: for how many frames.
  // grace: frames after a break during which the shield cannot be broken again. turn: frames the hero must stay in the blind
  // side before the guard turns. kb: bash knockback. recover: frames of the bash recovery. patrol: px per frame on patrol.
  // lose: frames without sight before it gives up. hold: px it stops short of the hero.
  guard: {
    kind: 'guard', name: 'Riot guard', hp: 70, atk: 17, def: 8, speed: 0.7, xp: 24, aggro: 90,
    windup: 30, power: 1, cooldown: 110, drop: 0.35, weight: 1.4,
    x: { range: 26, reach: 30, arc: 75, block: 0.2, breakKb: 3.2, breakT: 45, grace: 30, turn: 12, kb: 4.2, recover: 36, patrol: 0.5, lose: 240, hold: 18 },
  },
  // The Warden adds a slam: slamWindup frames of growing ring, a shockwave of slamRadius px, slamRecover frames, and
  // slamCd frames before the next attack. Every slamEvery-th attack is a slam, every slamLow-th below half HP.
  warden: {
    kind: 'warden', name: 'Warden', hp: 260, atk: 20, def: 9, speed: 0.65, xp: 60, aggro: 100,
    windup: 34, power: 1, cooldown: 100, drop: 1, weight: 3,
    x: {
      range: 30, reach: 34, arc: 90, block: 0.25, breakKb: 3.2, breakT: 45, grace: 120, turn: 12, kb: 4.2, recover: 36, patrol: 0.5, lose: 300, hold: 20,
      slamWindup: 45, slamRadius: 46, slamPower: 1.3, slamKb: 5, slamRecover: 60, slamCd: 140, slamEvery: 3, slamLow: 2,
    },
  },
  // The chapter 1 boss (docs/level-3.md, enemies/demogorgon.ts). Tuned at enemyMult 1.7 against the stage's targets: HP and ATK
  // are up from the spec's 520 and 22 so the fight lasts about 45 seconds, and the hits that an undodged player eats (the swipe,
  // the charge, the leap, the acid) are down from 1.0, 1.2, 1.3 and 0.8 so that a player who dodges badly still wins sometimes.
  // Walk, windup, power and cooldown are the swipe's.
  // reach, arc (half angle in degrees), kb: the swipe. range: px at which it commits to one. recover: frames after it.
  // chargeEvery: frames between charges, counted from the end of the last one. chargeWindup, chargeSpeed, chargePower and
  // chargeKb: the charge. stunT: frames dazed against a wall, stunMul: damage taken meanwhile, stunsToPin: wall stuns before
  // 0 HP pins it. petalsAt and leapAt: the HP shares that open the petals and start the leap.
  // spitWindup, spitEvery, spitRecover, fan (radians between globs), flight (frames in the air), splash (px), splashT (frames the splash is drawn), globPower: the acid.
  // crouch, air, height (px of the arc), shock (px), leapPower, leapKb, leapRecover, leapEvery: the leap. roarT: frames of roar.
  demogorgon: {
    kind: 'demogorgon', name: 'Demogorgon', hp: 760, atk: 24, def: 6, speed: 0.8, xp: 60, aggro: 160,
    windup: 30, power: 0.5, cooldown: 100, drop: 1, weight: 4,
    x: {
      reach: 30, arc: 70, kb: 4, range: 26, recover: 22, hold: 16,
      chargeEvery: 150, chargeWindup: 36, chargeSpeed: 4.2, chargePower: 1, chargeKb: 5, stunT: 150, stunMul: 1.5, stunsToPin: 3,
      petalsAt: 0.6, leapAt: 0.3, roarT: 40,
      spitWindup: 26, spitEvery: 120, spitRecover: 20, fan: 0.38, flight: 40, splash: 14, splashT: 14, globPower: 0.3,
      crouch: 30, air: 45, height: 30, shock: 40, leapPower: 1, leapKb: 5, leapRecover: 50, leapEvery: 200,
    },
  },
  // Chapter 2 (docs/level-4.md, "New enemies"). HP, ATK and DEF are sized for the Lv 5 party that arrives at 2.1, so the
  // chapter's stages keep enemyMult near 1 instead of scaling chapter 1 numbers. At 2.1's 1.15 a Lv 5 Mike kills a demodog in
  // three to five swings, and a bite takes about a third of his HP.
  // The demodog circles `orbit` px out (between near and far), and a hero inside `range` px can be lunged at after the
  // `windup`. lungeT frames at lungeSpeed px a frame, recover frames after.
  // gap: the least frames between one pack lunge ending and the next wind-up. kb: the bite's knockback.
  demodog: {
    kind: 'demodog', name: 'Demodog', hp: 60, atk: 30, def: 4, speed: 1.2, xp: 9, aggro: 110,
    windup: 28, power: 0.9, cooldown: 90, drop: 0.2, weight: 1.1,
    x: { orbit: 48, near: 38, far: 58, range: 64, lungeT: 14, lungeSpeed: 4, recover: 30, gap: 20, kb: 2.4 },
  },
  // Rooted. The vine lashes `reach` px after its windup, the lash slows for slowT frames, and fire does burnMul times the damage.
  vine: {
    kind: 'vine', name: 'Vine', hp: 50, atk: 18, def: 4, speed: 0, xp: 5, aggro: 40,
    windup: 30, power: 0.8, cooldown: 100, drop: 0, weight: 99,
    x: { reach: 34, slowT: 90, burnMul: 2, recover: 24, swing: 10, kb: 2 },
  },
  // Rooted. A hero inside aggro starts the windup (the swell); at its end the pod bursts into a cloud of cloud px that hurts and
  // slows (slowT frames) whoever is in it, and dies doing it for no XP. cloudT: frames the spores are drawn.
  pod: {
    kind: 'pod', name: 'Spore pod', hp: 28, atk: 16, def: 2, speed: 0, xp: 3, aggro: 48,
    windup: 40, power: 0.6, cooldown: 160, drop: 0.1, weight: 99,
    x: { cloud: 28, slowT: 90, cloudT: 50, kb: 1.5 },
  },
  // The chapter 2 boss (docs/level-6.md, "Demodog Alpha", enemies/alpha.ts). Walk, windup, power and cooldown are the bite's. HP and
  // ATK are down from the spec's 1100 and 34: the fight's danger is its pack of nine and the pounce, and at the spec's numbers it was a
  // cliff (the bot won 35 of 40 at an effective factor of 1.0 and 4 of 40 at 1.1), so stage 2.3 had to sit at 0.7 for upside to clear
  // at all. At 700 and 16 the stage ran at 1.0 and the fight took about 17 s on chief (measured with measure-stage 2.3). The pace pass left chief
  // at 98 of 100 and upside at the floor; 560 HP shortens the fight for upside, and Eleven's HP (stage23_data.ts) brings chief back down.
  // reach, arc (half angle in degrees), kb: the bite. range: px at which it commits to one. recover: frames after it. hold: px it
  // stops short of the hero.
  // lungeEvery: frames between lunges, counted from the end of the last. lungeMin and lungeMax: the hero's distance band in px.
  // lungeWindup, lungeT, lungeSpeed, lungePower, lungeKb, lungeRecover: the lunge, along the line locked when its wind-up starts.
  // pounceEvery and pounceLow (below half HP): frames between pounces. pounceMin and pounceMax: the distance band. crouch, air,
  // height (px of the arc), shock (px), pouncePower, pounceKb: the pounce. stunT: frames dazed after it, stunMul: damage taken meanwhile.
  // howl1 to howl3: the HP shares that start each howl. howlT: frames stopped, howlMul: damage taken meanwhile, howlRing: the ring's
  // diameter, pack: demodogs it calls.
  alpha: {
    kind: 'alpha', name: 'Demodog Alpha', hp: 560, atk: 16, def: 6, speed: 1.1, xp: 70, aggro: 200,
    windup: 24, power: 1, cooldown: 100, drop: 1, weight: 4,
    x: {
      reach: 28, arc: 70, kb: 4, range: 26, recover: 20, hold: 14,
      lungeEvery: 120, lungeMin: 50, lungeMax: 120, lungeWindup: 30, lungeT: 18, lungeSpeed: 4.6, lungePower: 1.1, lungeKb: 4, lungeRecover: 24,
      pounceEvery: 240, pounceLow: 150, pounceMin: 24, pounceMax: 200, crouch: 30, air: 40, height: 28, shock: 36, pouncePower: 1.2, pounceKb: 5,
      stunT: 40, stunMul: 1.5,
      howl1: 0.75, howl2: 0.5, howl3: 0.25, howlT: 50, howlMul: 2, howlRing: 160, pack: 3,
    },
  },
};

/** Enemy HP and damage multiplier. */
export const DIFFICULTY_MULT: Record<Difficulty, number> = { kid: 0.7, chief: 1, upside: 1.4 };

/** What `tier: 'elite'` does to any enemy: more HP and damage, a quicker pace, shorter cooldowns, double XP and drops. */
export const ELITE = { hp: 1.9, atk: 1.6, speed: 1.1, cooldown: 0.75, xp: 2, drop: 2 } as const;
