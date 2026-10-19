// Enemy data: the rat and the Lab agent, the Lab's riot guard and Warden, the Demogorgon, chapter 2's demodog, vine, pod and Alpha, and
// chapter 3's melting rat, Flayed, soldier, Grigori, Flayed Billy and the Mind Flayer.
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

/** A Mind Flayer leg's numbers, shared by the 3.3 leg and the final boss's (leg5): the geometry and the beats are the same, the HP and ATK are not. */
const LEG_X = {
  warn: 40, warnLow: 28, slamT: 12, rest: 30, len: 150, halfW: 12, kb: 5, restLen: 56, daze: 30,
  sweepWarn: 40, sweepPower: 0.5, sweepKb: 4, bandH: 24,
  poolR: 20, poolLife: 480, poolMax: 4, poolPower: 0.07, poolEvery: 30, poolSlow: 20,
};

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
  // Chapter 3 (docs/level-7.md, "New enemies", docs/level-8.md). HP, ATK and DEF are sized for the party a real run brings to 3.1
  // (a Lv 6 lead, the bench at 4 and 5). The first numbers (30/26 for the melting rat, 90/32 for the Flayed, 70/30 for the soldier)
  // needed a stage factor of 3.3 in 3.1: the rats died in two hits and their short lunge rarely landed, and no Flayed ever got a grab
  // in. Now the rat lunges farther and bites harder, the Flayed reaches faster and shambles through light hits (combat/damage.ts), and
  // 3.1 sits at 1.7, as 1.3 does.
  // The melting rat swarms like the rat (enemies/rat.ts, same x). When it dies, by any cause, it bursts (combat/kills.ts): burst px
  // around it, power x.power, slow for x.slow frames.
  melter: {
    kind: 'melter', name: 'Melting rat', hp: 50, atk: 40, def: 2, speed: 1.3, xp: 4, aggro: 80,
    windup: 20, power: 0.75, cooldown: 80, drop: 0.15, weight: 1.3,
    x: { range: 34, lungeT: 11, lungeSpeed: 3.4, recover: 20, burst: 22, power: 0.5, slow: 60 },
  },
  // The Flayed (enemies/flayed.ts). range: px at which it commits to a reach. reachT and reachSpeed: the reach, in frames and px a frame.
  // hold and eliteHold: frames it holds the hero. kb: the shove that ends the hold. rise: frames coming up out of the goo.
  // recover: frames after a hold or a miss. A hit with knockback 3 or more (hold.ts, HOLD_BREAK_KB) frees the hero.
  flayed: {
    kind: 'flayed', name: 'Flayed', hp: 140, atk: 40, def: 4, speed: 0.55, xp: 11, aggro: 100,
    windup: 22, power: 0.8, cooldown: 110, drop: 0.25, weight: 1.6,
    x: { range: 30, reachT: 10, reachSpeed: 2.4, recover: 40, hold: 40, eliteHold: 50, kb: 3, rise: 40 },
  },
  // The Russian soldier (enemies/soldier.ts). near and far bound the band in px, panic is the distance it steps back from, back is the
  // px a frame it does it, stamina the frames it will before it plants. speed, range, r and kb are the bullet's: px a frame, reach in
  // px, size, shove. burst and eliteBurst: rounds, gap: frames between rounds, recover: frames after. butt: px at which it clubs
  // instead, with buttWindup, buttPower, buttKb, buttReach, buttRecover and buttGap (frames between butts).
  soldier: {
    kind: 'soldier', name: 'Soldier', hp: 90, atk: 38, def: 5, speed: 0.8, xp: 12, aggro: 130,
    windup: 30, power: 0.3, cooldown: 120, drop: 0.3, weight: 1.2,
    x: {
      near: 80, far: 120, panic: 60, back: 0.7, stamina: 50, speed: 3.2, range: 180, r: 3, kb: 1.8, burst: 3, eliteBurst: 5, gap: 6,
      recover: 50, butt: 22, buttWindup: 20, buttPower: 0.8, buttKb: 3, buttReach: 28, buttRecover: 30, buttGap: 60, patrol: 0.5, lose: 240,
    },
  },
  // The 3.2 mini-boss (enemies/grigori.ts, grigori_hit.ts). Walk, windup, power and cooldown are the haymaker's. HP is up from the spec's
  // 800 to 1200: the careful bot never takes a hit from him, so the fight is all HP against how fast it can flank. His hits are down
  // from 26 ATK and power 1.2 (a throw of 1.0) to 12, 1.0 and 0.7, his guard drops while he recovers, and at half HP he calls `call`
  // soldiers: at the first numbers the careless bot, which stands in front and never dodges, cleared 3.2 0 times in 20. On the stage at
  // enemyMult 1 he takes about 44 s on chief with a shooter's party and 95 s with none.
  // reach, arc (half angle in degrees), kb: the haymaker. range: px at which he commits to one. recover and rageRecover: frames after it.
  // hold: px he stops short of the hero. block: the share of a hit that gets through his front (arc is the same half angle).
  // rageAt: the HP share that enrages him, rageSpeed his walk then. grabFirst, grabEvery and grabLow (enraged): frames between grabs,
  // grabMin and grabMax: the hero's distance band. grabWindup, lungeT and lungeSpeed: the lunge. holdT: frames he holds. throwPower
  // and throwKb: the throw. grabRecover: frames after a miss or a throw. stunT: frames stunned on the power box, stunHp: the share of
  // his max HP it takes, stunMul: damage taken meanwhile. call: soldiers he calls in when he rages.
  grigori: {
    kind: 'grigori', name: 'Grigori', hp: 1200, atk: 12, def: 8, speed: 0.7, xp: 80, aggro: 200,
    windup: 30, power: 1, cooldown: 100, drop: 1, weight: 4,
    x: {
      reach: 32, arc: 70, kb: 5, range: 28, recover: 50, rageRecover: 36, hold: 18, block: 0.25, rageAt: 0.5, rageSpeed: 0.9,
      grabFirst: 150, grabEvery: 220, grabLow: 160, grabMin: 30, grabMax: 80, grabWindup: 24, lungeT: 12, lungeSpeed: 3.5, holdT: 45,
      throwPower: 0.7, throwKb: 6, grabRecover: 36, stunT: 180, stunHp: 0.08, stunMul: 1.5, call: 2,
    },
  },
  // Flayed Billy, phase one of the 3.3 boss (docs/level-9.md, "Billy", enemies/billy.ts, billy_hit.ts). HP, DEF, walk and XP are the
  // spec's. The lead's pass on the stage softened his hits so a player who doesn't dodge reaches the Mind Flayer alive: 18 ATK (the spec
  // had 30), jabs of 0.4, a charge of 0.8, a throw of 0.7 and one Flayed at rage. Windup, power and cooldown are the jab's: a 12 frame
  // wind-up, power 0.4 a hit, and 90 frames between the starts of two jabs. Weight 4 is the quarter knockback the spec gives a boss.
  // jabReach: px at which he commits to a jab, jabHit: how far a jab still lands once it comes out. jabGap: frames between the two
  // hits, jabKb: their shove (light, so the hero is still in reach for the second), jabInvuln: the frames of invulnerability the first leaves, short of the gap so the second can land.
  // jabRecover: frames after. hold: px he stops short of the hero (a hero at his melee distance can step out of a grab's reach in time).
  // chargeFirst: frames before the first charge, chargeEvery and chargeLow (enraged): frames between charges, counted from the end of the
  // last. chargeMin and chargeMax: the hero's distance band (the first charge comes as he closes in on a hero who walked in from afar). chargeWindup: frames of "!", chargeSpeed and rageSpeed (enraged): px a frame, chargeRange: px he runs at most,
  // chargePower and chargeKb: a hero in the way, chargeRecover: frames after a run that found no wall. stunT: frames dazed against a wall,
  // stunMul: damage taken meanwhile.
  // grabFirst and grabEvery: frames before the first grab and between grabs. grabReach: px at which he commits to one, grabHit: how far
  // it still takes hold once the wind-up is over. grabWindup: frames of "!". holdT: frames he holds. throwPower and throwKb: the throw.
  // grabRecover: frames after a miss or a throw.
  // rageAt: the HP share that enrages him, call: Flayed he calls in then.
  // reachR: px within which Eleven reaches him pinned, reachRise: frames to climb from 0 to 1, reachFall: frames to fall from 1 to 0.
  // pokeGap: frames before the pinned Billy reports another try, reviveHp: the share of her HP a knocked-out Eleven stands up with.
  billy: {
    kind: 'billy', name: 'Billy', hp: 700, atk: 18, def: 6, speed: 1.1, xp: 60, aggro: 200,
    windup: 12, power: 0.4, cooldown: 90, drop: 1, weight: 4,
    x: {
      jabReach: 24, jabHit: 28, jabGap: 8, jabKb: 1.4, jabInvuln: 6, jabRecover: 30, hold: 20,
      chargeFirst: 30, chargeEvery: 200, chargeLow: 140, chargeMin: 60, chargeMax: 160, chargeWindup: 24, chargeSpeed: 3.6, rageSpeed: 4.2, chargeRange: 160,
      chargePower: 0.8, chargeKb: 5, chargeRecover: 24, stunT: 60, stunMul: 1.5,
      grabFirst: 150, grabEvery: 240, grabReach: 26, grabHit: 28, grabWindup: 16, holdT: 50, throwPower: 0.7, throwKb: 6, grabRecover: 36,
      rageAt: 0.5, call: 1,
      reachR: 32, reachRise: 60, reachFall: 120, pokeGap: 45, reviveHp: 0.3,
    },
  },
  // The Mind Flayer, phase two of the 3.3 boss (docs/level-9.md, "The Mind Flayer", enemies/flayer.ts, flayer_hit.ts), and its four legs
  // (enemies/flayer_legs.ts). Both are rooted: speed 0 and the weight of a wall. The legs give 0 XP and init.ts keeps it 0. The lead's pass
  // on the whole stage (docs/level-9.md, "Result") made it a shorter, sharper fight: 800 HP and legs of 90 (the spec had 1600 and 180), the
  // head down for 420 frames at x3 so two downs or so finish it (it was seven), slams every 110 frames at 0.8 off 22 ATK, pools of 0.07, a
  // sweep of 0.5, and one Flayed every 600 frames, two at most. The waves and the slams were what killed a player who doesn't dodge. The
  // body's windup, power and cooldown are not used: its legs have them.
  // riseT: frames coming in through the skylight, hit by nothing. downT: frames the head is on the floor, downMul: damage it takes then.
  // slamFirst, slamEvery and slamRegrow: frames before the first slam, between two slams, and after the legs grow back. phaseAt: the HP share
  // that starts phase two, where two legs slam at once. sweepFirst and sweepEvery: frames before the first sweep and between sweeps (phase
  // two only). waveFirst, waveEvery, waveN and waveMax: the Flayed waves, while the head is up: frames before the first, between two, how many
  // come and how many may be alive.
  flayer: {
    kind: 'flayer', name: 'Mind Flayer', hp: 800, atk: 22, def: 6, speed: 0, xp: 120, aggro: 400,
    windup: 40, power: 1.2, cooldown: 70, drop: 1, weight: 99,
    x: {
      riseT: 40, downT: 420, downMul: 3, slamFirst: 90, slamEvery: 110, slamRegrow: 90, phaseAt: 0.5, sweepFirst: 240, sweepEvery: 480,
      waveFirst: 300, waveEvery: 600, waveN: 1, waveMax: 2,
    },
  },
  // A leg. Windup is the warn, power the slam's. warn and warnLow (phase two): frames the line is shown. slamT: frames of the strike. rest:
  // frames its tip lies on the floor after it. len: the line's length in px, halfW: how far either side of it a hero is hit, kb: the shove.
  // restLen: how far in front of its root a leg's tip lies before its first slam and after it grows back. daze: frames Word vomit holds it.
  // The sweep: sweepWarn and sweepPower and sweepKb, bandH: the band's height in px. The pools its tip leaves (combat/pools.ts): poolR and
  // poolLife, poolMax (a fifth replaces the oldest), poolPower and poolEvery (frames between stings), poolSlow (frames of slow it renews).
  flayerleg: {
    kind: 'flayerleg', name: 'Mind Flayer leg', hp: 90, atk: 22, def: 4, speed: 0, xp: 0, aggro: 400,
    windup: 40, power: 0.8, cooldown: 70, drop: 0, weight: 99,
    x: LEG_X,
  },
  // Chapter 4 (docs/level-10.md, docs/level-11.md). Starting numbers: Sim tunes them inside the stages' targets. The Kamchatka guard
  // is the soldier in winter (enemies/soldier.ts reads these x), the camp guard the riot guard with a baton (enemies/guard.ts), and the
  // pit Demogorgon the 1.3 one sized for Hopper alone (enemies/demogorgon.ts). Its x mirrors the 1.3 one's.
  kguard: {
    kind: 'kguard', name: 'Guard', hp: 80, atk: 36, def: 5, speed: 0.7, xp: 12, aggro: 130,
    windup: 30, power: 0.3, cooldown: 120, drop: 0.3, weight: 1.2,
    x: {
      near: 80, far: 120, panic: 60, back: 0.7, stamina: 50, speed: 3.2, range: 180, r: 3, kb: 1.8, burst: 3, eliteBurst: 5, gap: 6,
      recover: 50, butt: 22, buttWindup: 20, buttPower: 0.8, buttKb: 3, buttReach: 28, buttRecover: 30, buttGap: 60, patrol: 0.5, lose: 240,
    },
  },
  kbaton: {
    kind: 'kbaton', name: 'Camp guard', hp: 110, atk: 34, def: 7, speed: 0.7, xp: 16, aggro: 100,
    windup: 30, power: 0.9, cooldown: 110, drop: 0.35, weight: 1.4,
    x: { range: 26, reach: 30, arc: 75, block: 0.2, breakKb: 3.2, breakT: 45, grace: 30, turn: 12, kb: 3.6, recover: 36, patrol: 0.5, lose: 240, hold: 18 },
  },
  pitdemo: {
    kind: 'pitdemo', name: 'Demogorgon', hp: 600, atk: 34, def: 6, speed: 0.8, xp: 60, aggro: 200,
    windup: 30, power: 0.5, cooldown: 100, drop: 1, weight: 4,
    x: {
      reach: 30, arc: 70, kb: 4, range: 26, recover: 22, hold: 16,
      chargeEvery: 150, chargeWindup: 36, chargeSpeed: 4.2, chargePower: 1, chargeKb: 5, stunT: 150, stunMul: 1.5, stunsToPin: 3,
      petalsAt: 0.6, leapAt: 0.3, roarT: 40,
      spitWindup: 26, spitEvery: 120, spitRecover: 20, fan: 0.38, flight: 40, splash: 14, splashT: 14, globPower: 0.3,
      crouch: 30, air: 45, height: 30, shock: 40, leapPower: 1, leapKb: 5, leapRecover: 50, leapEvery: 200,
    },
  },
  // The Creel ghoul (docs/level-11.md, "The ghoul"). see: px from its mirror a hero must come within for it to step out. rise: frames
  // stepping out. gap: frames before the next ghoul of the same mirror. range, lungeT, lungeSpeed, recover, kb: the lunge. bob: px it
  // floats. light: px from a lit lights prop that it takes lightMul in.
  ghoul: {
    kind: 'ghoul', name: 'Creel ghoul', hp: 110, atk: 38, def: 4, speed: 0.8, xp: 14, aggro: 140,
    windup: 24, power: 0.8, cooldown: 90, drop: 0.25, weight: 1.1,
    x: { see: 80, rise: 40, gap: 90, range: 40, lungeT: 10, lungeSpeed: 3.2, recover: 30, kb: 3, bob: 2, light: 48, lightMul: 1.5 },
  },
  // Chapter 5 (docs/level-14.md, docs/level-15.md). Sized for the Lv 10 party that walks into 5.1 on HARD, at enemyMult 1: the stages
  // set their own factor when the maps are built. The guide is chapter 4's guards (80 to 110 HP, 34 to 36 ATK) for a Lv 7 party.
  // The trooper (enemies/trooper.ts, trooper_hit.ts). arc: the shield's half angle in degrees, block: the share of a blocked hit that
  // gets through (none), breakKb, breakT and grace: a shove that drops the shield for a while, turn: frames the hero must stay in the
  // blind side before it turns, smashes: smash hits that break the shield for good. far bounds the band it holds from the hero with a
  // line, and inside near it doesn't fire (it presses on to the butt); range is the burst's reach. speed, r and kb are a round's (px a
  // frame, size, shove), burst the rounds, gap the frames between them, recover the frames after. flankT frames of walking round to a
  // hero's side at flankSpeed (a multiple of its walk). butt and the rest are the rifle butt up close, as the soldier's, reach the same
  // for the bot's reading of it. patrol, lose and hold are the guard's.
  trooper: {
    kind: 'trooper', name: 'Trooper', hp: 130, atk: 34, def: 9, speed: 0.75, xp: 18, aggro: 120,
    windup: 30, power: 0.4, cooldown: 130, drop: 0.35, weight: 1.4,
    x: {
      arc: 60, block: 0, breakKb: 3.2, breakT: 45, grace: 90, turn: 12, smashes: 1,
      near: 64, far: 130, range: 170, speed: 3.2, r: 3, kb: 1.8, burst: 3, eliteBurst: 5, gap: 6, recover: 24, flankT: 60, flankSpeed: 1,
      butt: 22, buttWindup: 20, buttPower: 0.8, buttKb: 3, buttReach: 28, reach: 28, buttRecover: 30, buttGap: 60, patrol: 0.5, lose: 240, hold: 18,
    },
  },
  // The Lab agent at chapter 5 numbers: the 1.2 agent's brain (enemies/agent.ts) on its own def, so it keeps the same x.
  agent5: {
    kind: 'agent5', name: 'Lab agent', hp: 90, atk: 38, def: 8, speed: 0.9, xp: 14, aggro: 100,
    windup: 24, power: 0.65, cooldown: 100, drop: 0.3, weight: 1,
    x: { near: 70, far: 100, dart: 2, range: 170, patrol: 0.5, back: 0.7, stamina: 50, recover: 18, lose: 240 },
  },
  // The 5.1 mini-boss (enemies/commander.ts, trooper_hit.ts). Walk, windup, power and cooldown are the shield bash's; reach, arc (the shield's
  // half angle too), kb, range, recover, hold, turn, patrol and lose are as the riot guard's. smashes: smash hits it takes on the shield before
  // it breaks for good (one once the shield has cracked). crackAt: the HP share at which the shield cracks and the charges begin.
  // whistleFirst, whistleEvery: frames to the first whistle and between them, plantT: frames planted, squad: troopers a whistle calls in,
  // at most that many alive, squadHp and squadAtk the share of a trooper's HP and ATK they come with. The charge is the Demogorgon's (chargeEvery, chargeWindup, chargeSpeed, chargePower, chargeKb), stunT frames
  // dazed against a wall and stunMul the damage taken meanwhile.
  commander: {
    kind: 'commander', name: 'The Commander', hp: 700, atk: 28, def: 12, speed: 0.7, xp: 80, aggro: 140,
    windup: 34, power: 0.9, cooldown: 100, drop: 1, weight: 4,
    x: {
      range: 30, reach: 34, arc: 75, block: 0, breakKb: 99, breakT: 45, grace: 120, turn: 12, kb: 4.2, recover: 36, patrol: 0.5, lose: 300, hold: 20, smashes: 3,
      crackAt: 0.5, whistleFirst: 180, whistleEvery: 480, plantT: 72, squad: 3, squadHp: 0.75, squadAtk: 0.85,
      chargeEvery: 150, chargeWindup: 36, chargeSpeed: 4.2, chargePower: 1, chargeKb: 5, stunT: 120, stunMul: 1.5,
    },
  },
  // The foe Demogorgon (enemies/demogorgon.ts on this def): the 1.3 swipe, charge and wall stun at a foe's size, with no petals or leap
  // (petalsAt and leapAt 0 turn them off) and nothing to pin it (it dies at 0 HP). The keys are the Demogorgon's, above. The swipe and the
  // charge are down from the 1.3 boss's 0.6 and 1 (here and on the twins) to 0.3 and 0.4, as that boss's were tuned: stage 5.2 runs at
  // enemyMult 2.72 (docs/level-15.md, "Result"), so the hits an undodged player eats are about the 1.3 fight's, and a player who dodges
  // badly still wins sometimes: at 0.6 and 1 the bot that never dodges cleared 1 of 20 where the careful one cleared 19, and with these 13 and 16.
  demofoe: {
    kind: 'demofoe', name: 'Demogorgon', hp: 400, atk: 30, def: 9, speed: 0.85, xp: 40, aggro: 150,
    windup: 30, power: 0.3, cooldown: 100, drop: 0.5, weight: 3,
    x: {
      reach: 30, arc: 70, kb: 4, range: 26, recover: 22, hold: 16,
      chargeEvery: 150, chargeWindup: 36, chargeSpeed: 4.2, chargePower: 0.4, chargeKb: 5, stunT: 120, stunMul: 1.5,
      petalsAt: 0, leapAt: 0, roarT: 40,
      spitWindup: 26, spitEvery: 120, spitRecover: 20, fan: 0.38, flight: 40, splash: 14, splashT: 14, globPower: 0.3,
      crouch: 30, air: 45, height: 30, shock: 40, leapPower: 1, leapKb: 5, leapRecover: 50, leapEvery: 200,
    },
  },
  // One of the 5.2 twins (enemies/demogorgon.ts, twin.ts, twin_fall.ts): the foe's brain, taking turns. The petals (the acid) open when its
  // mate dies: it roars, walks enrage times as fast and spits every spitEvery frames. orbit and band: the radius in px it circles the hero at
  // while its mate charges, and how far off that it drifts; orbitSpeed is its pace then, a multiple of its walk. chargeRange: the most px a
  // charge runs (so it only reaches the edge of the ring when the hero stands within about that of it). turnWait: frames it holds
  // the turn without charging before the turn passes. fallT, belowT, climbT: frames falling into the void, gone, and climbing back (180 in all),
  // fallLoss the share of its max HP the fall costs (it never kills).
  twin: {
    kind: 'twin', name: 'Demogorgon', hp: 560, atk: 32, def: 10, speed: 0.8, xp: 70, aggro: 200,
    windup: 30, power: 0.3, cooldown: 100, drop: 1, weight: 4,
    x: {
      reach: 30, arc: 70, kb: 4, range: 26, recover: 22, hold: 16,
      chargeEvery: 150, chargeWindup: 36, chargeSpeed: 4.2, chargeRange: 230, chargePower: 0.4, chargeKb: 5, stunT: 120, stunMul: 1.5,
      petalsAt: 0, leapAt: 0, roarT: 40,
      spitWindup: 26, spitEvery: 300, spitRecover: 20, fan: 0.38, flight: 40, splash: 14, splashT: 14, globPower: 0.3,
      crouch: 30, air: 45, height: 30, shock: 40, leapPower: 1, leapKb: 5, leapRecover: 50, leapEvery: 200,
      enrage: 1.3, orbit: 96, band: 14, orbitSpeed: 0.9, turnWait: 360, fallT: 40, belowT: 100, climbT: 40, fallLoss: 0.15,
    },
  },
  // The final boss (docs/level-16.md, stage 5.3), sized for a Lv 11 to 12 party on HARD. Vecna in phase one (enemies/vecna5.ts) is a stand-in
  // until 4.4's kit is swapped in: a fast caster. windup, power and cooldown are the blast's. blastR: the blast's radius in px (centered on
  // him), blastWind: its warning ring in frames, blastKb its shove, blastCd the frames between blasts, blastRecover the frames after.
  // orbWind, orbCd and orbRecover are the orb's: orbN slow orbs, orbFan radians apart, each turning toward the active hero by orbTurn radians a frame at
  // orbSpeed px a frame, for orbLife frames, size orbR, orbPower and orbKb on a hero. near and far bound the band he holds from the hero, orbMin the least distance
  // he casts an orb from. sinkT: the frames his body stays, sinking into the floor, after 0 HP (the art's SINK_FRAMES).
  vecna5: {
    kind: 'vecna5', name: 'Vecna', hp: 800, atk: 30, def: 10, speed: 0.9, xp: 120, aggro: 400,
    windup: 28, power: 0.7, cooldown: 100, drop: 1, weight: 4,
    x: {
      blastR: 46, blastWind: 32, blastKb: 5, blastCd: 100, blastRecover: 26,
      orbWind: 34, orbCd: 180, orbRecover: 20, orbSpeed: 1.5, orbTurn: 0.03, orbLife: 220, orbR: 4, orbPower: 0.5, orbKb: 2, orbN: 2, orbFan: 0.4,
      near: 36, far: 90, orbMin: 70, sinkT: 64,
    },
  },
  // The Mind Flayer of phase two (the 3.3 body's brain, enemies/flayer.ts), with Vecna in its chest. Its numbers are the 3.3 body's, apart from
  // these: the body takes no hit while its chest is shut. A hit on a leg opens the chest for chestT frames (once it is shut again); with every leg
  // cut the head comes down for downT frames at downMul and the chest is open then too. clock16: the frames between the clock's chimes in the
  // lead's 4.4 kit (16 s), unused until it is wired.
  flayer5: {
    kind: 'flayer5', name: 'Mind Flayer', hp: 1000, atk: 22, def: 6, speed: 0, xp: 160, aggro: 400,
    windup: 40, power: 1.2, cooldown: 70, drop: 1, weight: 99,
    x: {
      riseT: 40, downT: 300, downMul: 2, slamFirst: 90, slamEvery: 110, slamRegrow: 90, phaseAt: 0.5, sweepFirst: 240, sweepEvery: 480,
      waveFirst: 300, waveEvery: 600, waveN: 1, waveMax: 2, chestT: 300, clock16: 960,
    },
  },
  leg5: {
    kind: 'leg5', name: 'Mind Flayer leg', hp: 120, atk: 22, def: 4, speed: 0, xp: 0, aggro: 400,
    windup: 40, power: 0.8, cooldown: 70, drop: 0, weight: 99,
    x: LEG_X,
  },
};

/** Enemy HP and damage multiplier. */
export const DIFFICULTY_MULT: Record<Difficulty, number> = { kid: 0.7, normal: 0.85, chief: 1, upside: 1.4 };

/** What `tier: 'elite'` does to any enemy: more HP and damage, a quicker pace, shorter cooldowns, double XP and drops. */
export const ELITE = { hp: 1.9, atk: 1.6, speed: 1.1, cooldown: 0.75, xp: 2, drop: 2 } as const;
