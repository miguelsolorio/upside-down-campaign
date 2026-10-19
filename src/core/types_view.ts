// What gets drawn: the actor and effect views the sim produces each frame (Sim.view()) and gfx draws. Split out of types.ts to keep that
// file under 500 lines; types.ts re-exports all of it, so import from there. The same contract rule applies: report changes, don't make them.
import type { ColorName, CharId, Dir, EnemyKind, Vec2 } from './types.ts';

// The sim produces these each frame (Sim.view()). gfx draws them. Nobody else invents draw state.
export type AnimId = 'idle' | 'walk' | 'attack' | 'cast' | 'dash' | 'hurt' | 'ko';

export interface ActorView {
  kind: 'hero' | 'enemy' | 'npc';
  id: CharId | EnemyKind;
  /** Feet position: bottom-center of the sprite, in world pixels. */
  x: number; y: number;
  dir: Dir;
  anim: AnimId;
  /** Frames spent in the current anim, for frame selection. */
  t: number;
  /** 0..1 white hit flash. */
  flash: number;
  /** True = skip drawing this frame (invulnerability flicker). */
  blink: boolean;
  /** Eleven's nosebleed: drawn when her MP is low. */
  strained: boolean;
  tint: ColorName | null;
  /** Red "!" over the head: an attack is about to land. */
  alert: boolean;
  /** Pixels above the ground (knockback arcs, leaps). */
  z: number;
  /** Small HP bar over an enemy once it has been hit, and over a hero who is standing. */
  bar: { hp: number; hpMax: number } | null;
  /** An elite enemy: gfx draws it with its own marks (red trim, a bigger bar). Absent means a normal one. */
  elite?: boolean;
  /** A guard or warden whose shield is up. It stops hits from the front, so gfx can show the shield raised or dropped. */
  guarding?: boolean;
  /** A boss's pose, when it is doing something other than walking. The Demogorgon uses charge to pinned
   *  (docs/level-3.md). The Alpha uses crouch (the pounce wind-up), leap (in the air), howl and stun (docs/level-6.md).
   *  A Flayed uses rise (coming up out of the goo) and grab (holding a hero), and Grigori uses grab and stun. Billy uses
   *  charge, grab, stun and pinned (kneeling). The Mind Flayer's body uses rise (coming in through the skylight) and down
   *  (its head on the floor), and a leg uses warn (its line shown), slam (striking down it) and severed (docs/level-9.md). The pit
   *  Demogorgon uses the Demogorgon's. A ghoul uses rise (stepping out of its mirror) (docs/level-11.md). A demobat uses crouch (its dive's wind-up), charge (the dive)
   *  and stun (docs/level-12.md). Vecna uses curse (the clock's chime), whip, float, throw, burn and stun; an orb uses severed when
   *  broken (docs/level-13.md). The Commander uses plant (the
   *  shield planted, whistling up a squad), charge and stun, and a trooper uses flank (walking round to a hero's side). A twin
   *  Demogorgon (5.2) uses the Demogorgon's, and fall (dropping into the void, k running 0 to 1) and climb (coming back up, k running
   *  1 to 0) (docs/level-14.md, docs/level-15.md). */
  pose?: 'charge' | 'stun' | 'spit' | 'leap' | 'pinned' | 'crouch' | 'howl' | 'rise' | 'grab' | 'warn' | 'slam' | 'severed' | 'down'
    | 'curse' | 'whip' | 'float' | 'throw' | 'burn' | 'plant' | 'flank' | 'fall' | 'climb';
  /** A Mind Flayer leg's tip in world px: the end of the line it strikes down. x, y is its root. Absent on everything else. */
  aim?: Vec2;
  /** 0..1 how far Eleven has reached a pinned Billy, or how far a twin Demogorgon has fallen (pose fall) or has left to climb (pose
   *  climb), or the share of its chest's window the final boss's Mind Flayer has left (`open`, 1 as a leg's hit opens it). Absent means 0. */
  k?: number;
  /** The Demogorgon's head petals are open (below 60% HP). */
  petals?: boolean;
  /** A hidden enemy that only Will's Cold spot shows, or Lucas under his Camo. gfx draws it faint or not at all. */
  hidden?: boolean;
  /** A held Special filling toward its Lv 6 variant, 0..1 (heroes/hold.ts). gfx draws a ring round the hero. */
  charge?: number;
  /** An enemy confused by Robin's Word vomit: it fights the other enemies. gfx draws a swirl over its head. */
  confused?: boolean;
  /** A dormant Flayed, waiting as a goo puddle until its group wakes. */
  puddle?: boolean;
  /** A hero under the clock curse: the chimes sounded so far, 1 to 3. gfx draws the clock mark and its four pips over them, and
   *  z lifts them. Drawn where the curse found them, benched or not (docs/level-11.md, "The curse"). Absent when not cursed. */
  curse?: number;
  /** A boss or elite marked by Eddie's Hellfire DM: the party's hits on it deal more. gfx draws a small d20 over it. On a memory orb
   *  (4.4) it is the orb the clock marked: breaking it lifts the curse, and gfx draws the orb lit red instead. */
  marked?: boolean;
  /** A trooper whose riot shield a smash has broken for good: gfx draws him without one, and `guarding` stays false. Absent otherwise.
   *  (The shield being up or down at the moment is `guarding`, as for the riot guard.) */
  broken?: boolean;
  /** The Commander below half HP: his shield is cracked, and he charges (docs/level-14.md). gfx draws the cracked shield. */
  cracked?: boolean;
  /** The second twin Demogorgon (5.2): gfx tints it, red or pale, so the pair read apart (docs/level-15.md). Absent on the first. */
  second?: boolean;
  /** The Mind Flayer of the final boss (`flayer5`) with its chest open, for 300 frames after a hit on a leg: Vecna shows in it, and only
   *  hits there move the bar (docs/level-16.md). Absent when it is shut. */
  open?: boolean;
}

export type FxKind =
  | 'slash' | 'push' | 'beam' | 'flame' | 'shield' | 'nova' | 'spark' | 'dust'
  | 'rock' | 'candy' | 'dart' | 'blast' | 'heal' | 'ring' | 'spore'
  /** acid: a Demogorgon spit glob in flight and its splash. mark: a shadow mark on the floor where it will land.
   *  bolt: Will's sketch bolt. reveal: a hidden path showing itself. */
  | 'acid' | 'mark' | 'bolt' | 'reveal'
  /** trail: the streak behind Max's Skate dash, w its length, angle its heading. howl: the Alpha's howl, a ring that
   *  grows to w. taunt: Steve's Babysit pulse, a ring that grows to w. */
  | 'trail' | 'howl' | 'taunt'
  /** scoop: Robin's ice cream in flight and its splat. babble: her Word vomit cone, w its reach. bullet: a pistol or rifle round
   *  in flight. goo: a melting rat's burst, w its diameter. trap: one of Nancy's bear traps on the floor. arcs: the power box
   *  firing, w and h its size. */
  | 'scoop' | 'babble' | 'bullet' | 'goo' | 'trap' | 'arcs'
  /** pet: Dustin's Dart, w 1 while he bites. bottle: Nancy's Molotov in flight, h its height off the ground. fire: its pool on the
   *  floor, w the diameter. */
  | 'pet' | 'bottle' | 'fire'
  /** slam: a Mind Flayer leg striking the floor, w its reach. glass: the skylight shattering as the Mind Flayer comes in,
   *  w the spread. sweep: a Mind Flayer leg sweeping a band across the arena: x, y its top-left, w and h its size, t < 40 the
   *  warning, then the strike. */
  | 'slam' | 'glass' | 'sweep'
  /** riff: Eddie's sound ring, x, y its center and w its diameter: the small one where his swing lands and each pulse of his solo.
   *  chime: a ring off a grandfather clock's face as it chimes, w its diameter. walkman: notes round Max as she plays her Walkman,
   *  w the spread (docs/level-11.md). */
  | 'riff' | 'chime' | 'walkman'
  /** fall: a twin Demogorgon dropping into the void (x, y the edge it went over, w its width, life the fall) (docs/level-15.md). */
  | 'fall'
  /** debris: a rock Vecna throws, in flight (h its height) and its splash. whip: one of his vine lashes, along `angle`, w its length.
   *  blaze: the fire over him in Burn, w its size (docs/level-13.md). */
  | 'debris' | 'whip' | 'blaze';

export interface FxView {
  kind: FxKind;
  x: number; y: number;
  dir: Dir;
  /** Radians, 0 = right. */
  angle: number;
  /** Frames elapsed and total frames. */
  t: number; life: number;
  /** Extent in px: beam length, nova diameter, slash reach. */
  w: number; h: number;
}
