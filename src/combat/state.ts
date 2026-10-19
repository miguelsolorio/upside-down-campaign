// Internal state of one simulation. Only src/combat, src/heroes and src/enemies import this.
import type {
  AnimId, CamDef, CharId, Dir, EnemyKind, Floater, FxView, Grid, HazardDef, HeroId, ItemKind, PropKind, PropState,
  RunStats, SimEvent, SfxId, Utility, Burrow, DefenseDef, DefenseWave, Stash,
} from '../core/types.ts';
import type { Rng, Stats } from '../progression/xp.ts';
import type { TalentState } from './talent_state.ts';
import type { GhoulState, HouseState } from './house.ts';
import type { FlayerState, LegState, Pool } from './flayer_state.ts';
import type { BatState } from '../enemies/demobat_hit.ts';
import type { RoofState } from './roof.ts';
import type { BondMods } from '../heroes/bonds.ts';

export type { Rng, Stats };
export type { FlayerMove, FlayerState, LegMove, LegState, Pool, SweepBand } from './flayer_state.ts';

export interface Pos { x: number; y: number }

/** Burn, stun, slow and confuse are live (confuse is on enemies only, combat/confuse.ts). Curse is a type only. */
export interface Statuses { burn: number; burnTick: number; burnDmg: number; stun: number; slow: number; confuse: number }
/** The most frames `Hero.unhurt` counts up to. A hero starts a level fully unhurt. */
export const UNHURT_CAP = 600;
export const noStatus = (): Statuses => ({ burn: 0, burnTick: 0, burnDmg: 0, stun: 0, slow: 0, confuse: 0 });

/**
 * Max's Skate dash while it runs (heroes/skate.ts plans it when she casts). She rolls `len` px along (ux, uy), `gone` so far,
 * and every enemy her body passes through takes one hit (`hit` holds their uids). `gaps` are the drops she crosses: they
 * open when she lands.
 */
export interface Dash { ux: number; uy: number; len: number; gone: number; hit: number[]; gaps: string[] }

export interface Hero {
  id: HeroId;
  level: number;
  /** XP carried toward the next level. */
  xp: number;
  hp: number;
  mp: number;
  /** hp and mp here are the maxima. */
  st: Stats;
  /** d20 bonus received so far, in stat units. */
  bonus: Stats;
  advantage: boolean;
  ko: boolean;
  x: number; y: number;
  dir: Dir;
  /** Radians, snapped to eight directions. */
  aim: number;
  vx: number; vy: number;
  z: number;
  moving: boolean;
  anim: AnimId; animT: number;
  flash: number;
  invuln: number;
  /** True while the flicker should show (after a hit or a swap). */
  blink: boolean;
  hurtT: number;
  /** Frames left in the current attack or cast animation. */
  actT: number;
  act: 'basic' | 'special' | null;
  lock: number;
  /** Bumped when an action is cancelled, so delayed effects know to stand down. */
  actId: number;
  cdBasic: number; cdSpecial: number;
  combo: number; comboT: number;
  stat: Statuses;
  nosebled: boolean;
  /** Max's Skate dash while it runs, else null. */
  dash: Dash | null;
  /** Frames since this hero last took a hit, capped at 600. Steve's Hair of steel reads it. */
  unhurt: number;
  /** Frames Special has been held toward a Lv 6 variant (heroes/hold.ts), or Hopper's Attack toward his wind-up, 0 when it isn't. -1 after the variant fired, until the key comes up. */
  holdT: number;
  /** What the party's bonds change for this hero (combat/bonds.ts writes it every tick). */
  bond: BondMods;
}

export type EnemyMode = 'idle' | 'patrol' | 'chase' | 'windup' | 'lunge' | 'recover' | 'lured';

/**
 * What the Demogorgon is doing (enemies/demogorgon.ts). walk: stalking. swipe: the close-range wind-up. wind: planted before
 * the charge. run: the charge. stun: dazed against a wall. roar: the petals opening. spit: the acid wind-up. crouch: before
 * the leap. air: the leap. recover: after a swipe, a spit or a landing. pinned: at 0 HP after three stuns, waiting for the beam.
 */
export type DemoMove = 'walk' | 'swipe' | 'wind' | 'run' | 'stun' | 'roar' | 'spit' | 'crouch' | 'air' | 'recover' | 'pinned';

/** The Demogorgon's own state, the pit one's too. Every other enemy has `demo: null`. */
export interface DemoState {
  move: DemoMove;
  /** Frames left in the current move. */
  t: number;
  /** Wall stuns so far. */
  stuns: number;
  /** The petals have opened (once, at 60 percent HP). */
  petals: boolean;
  /** Frames until each attack can start. */
  chargeCd: number; spitCd: number; leapCd: number;
  /** Frames before another try at the pinned boss is reported. */
  pokeCd: number;
  /** Leap flight: where it jumped from and where it comes down. */
  sx: number; sy: number; tx: number; ty: number;
  /** The growing mark under a leap, so a pin can take it away. */
  mark: FxView | null;
}

/** An acid glob: flies from (sx, sy) to (x, y), splashes when its age reaches life, and its splash is drawn for a few frames more. `kind` is the Demogorgon that spat it. */
export interface Glob { sx: number; sy: number; x: number; y: number; ang: number; age: number; life: number; atk: number; mark: FxView; kind: EnemyKind }

/**
 * What the Demodog Alpha is doing (enemies/alpha.ts). walk: stalking. bite: the close-range wind-up. wind: planted before the
 * lunge, the line already locked. run: the lunge. crouch: before the pounce. air: the pounce. stun: dazed after landing.
 * howl: stopped, calling the pack. recover: after a bite or a lunge.
 */
export type AlphaMove = 'walk' | 'bite' | 'wind' | 'run' | 'crouch' | 'air' | 'stun' | 'howl' | 'recover';

/** The Alpha's own state. Every other enemy has `alpha: null`. */
export interface AlphaState {
  move: AlphaMove;
  /** Frames left in the current move. */
  t: number;
  /** Frames until a lunge or a pounce can start. */
  lungeCd: number; pounceCd: number;
  /** Howls done so far, at 75, 50 and 25 percent HP. */
  howls: number;
  /** Pounce flight: where it jumped from and where it comes down. */
  sx: number; sy: number; tx: number; ty: number;
  /** The growing mark under a pounce, so a death can take it away. */
  mark: FxView | null;
}

/**
 * What a Flayed is doing (enemies/flayed.ts). walk: shambling at the hero. rise: coming up out of the goo, untouchable. wind: the
 * "!" before the reach. reach: the arm out. hold: holding the hero. recover: after a hold or a miss.
 */
export type FlayedMove = 'walk' | 'rise' | 'wind' | 'reach' | 'hold' | 'recover';

/** A Flayed's own state. Every other enemy has `flayed: null`. */
export interface FlayedState { move: FlayedMove; t: number }

/**
 * What a Russian soldier is doing (enemies/soldier.ts). walk: keeping its distance. wind: the "!" before a burst. fire: the burst, one
 * round every few frames along the aim locked when the wind-up ended. butt: the rifle butt wind-up. recover: after either.
 */
export type SoldierMove = 'walk' | 'wind' | 'fire' | 'butt' | 'recover';

/** A soldier's own state. Every other enemy has `soldier: null`. `shots` is how many rounds of the burst are left, `backing` that it is stepping back. */
export interface SoldierState { move: SoldierMove; t: number; shots: number; aim: number; backing: boolean; buttCd: number }

/**
 * What Grigori is doing (enemies/grigori.ts). walk: coming at the hero, facing him. hay: the haymaker wind-up. grab: the wind-up of
 * the lunge. lunge: the lunge. hold: holding the hero. recover: after a haymaker, a missed lunge or a throw, not turning. stun: on
 * the power box.
 */
export type GrigoriMove = 'walk' | 'hay' | 'grab' | 'lunge' | 'hold' | 'recover' | 'stun';

/** Grigori's own state. Every other enemy has `grigori: null`. `raged` is set once, at half HP. */
export interface GrigoriState { move: GrigoriMove; t: number; grabCd: number; raged: boolean }

/**
 * What Flayed Billy is doing (enemies/billy.ts). walk: hunting the hero. wind: planted under the "!" before the charge. run: the charge.
 * stun: dazed against a wall. grab: the "!" before the hold. hold: holding the hero. jab: the "!" before the first jab. jabs: between
 * the two. recover: after a jab, a missed grab, a throw or a charge that found no wall. pinned: at 0 HP, kneeling, until Eleven reaches him.
 */
export type BillyMove = 'walk' | 'wind' | 'run' | 'stun' | 'grab' | 'hold' | 'jab' | 'jabs' | 'recover' | 'pinned';

/**
 * Billy's own state. Every other enemy has `billy: null`. `t` is the frames left in the current move, and while he is pinned the reach in
 * whole units (enemies/billy_hit.ts turns it into ActorView.k). `raged` is set once, at half HP. `pokeCd` is the frames before another try
 * at the pinned Billy is reported.
 */
export interface BillyState { move: BillyMove; t: number; chargeCd: number; grabCd: number; raged: boolean; pokeCd: number }

export interface Enemy {
  uid: number;
  id: string;
  kind: EnemyKind;
  group: string;
  x: number; y: number;
  hx: number; hy: number;
  dir: Dir;
  vx: number; vy: number;
  z: number;
  hp: number; hpMax: number;
  atk: number; def: number;
  dormant: boolean;
  dead: boolean;
  deadT: number;
  /** Knows where the hero is. Drives aggro(). */
  aware: boolean;
  mode: EnemyMode; modeT: number;
  cd: number;
  stagger: number;
  flash: number;
  hurtSeen: boolean;
  anim: AnimId; animT: number;
  patrol: Pos[]; pi: number; wait: number;
  /** Locked attack target, set when the wind-up ends. */
  ax: number; ay: number;
  hitDone: boolean;
  lostT: number;
  backT: number;
  stuckT: number;
  lastX: number; lastY: number;
  wanderT: number; wanderA: number;
  noLure: number;
  by: HeroId | null;
  stat: Statuses;
  /** The XP a kill is worth, quarter drop chance and multipliers. Elites carry the scaled values, everyone else the def's. */
  xp: number; drop: number;
  /** Elite tier: true when the spawn asked for it. spd scales every walking speed, cdMul every attack cooldown. */
  elite: boolean;
  spd: number; cdMul: number;
  /** Guards and wardens only (zero on everything else). */
  /** Frames the shield stays broken. */
  broken: number;
  /** Frames after a break during which another break does nothing. */
  grace: number;
  /** Frames the hero has been in the blind side. The guard turns when this reaches its turn time. */
  turnT: number;
  /** Attacks started so far. Every third one is a slam for the warden. */
  swings: number;
  /** The current wind-up and recover are the warden's slam. */
  slam: boolean;
  /** The growing ring that telegraphs a slam, so a break can remove it. */
  ring: FxView | null;
  /** The Demogorgon only. */
  demo: DemoState | null;
  /** Spawned `hidden`: drawn faint, until Cold spot shows it or it attacks (which clears this for good). */
  hidden: boolean;
  /** Spawned `hidden`, for good. Will's Cold spot still shows it and hurts it more when it is near him after it has struck. */
  cloaked: boolean;
  /** A demodog in the air or in the wind-up before it: the pack lets one do that at a time. */
  lunging: boolean;
  /** Frames this enemy stays taunted onto Steve (Babysit). Zero when it is not. The defense's targeting reads it. */
  taunt: number;
  /** The Demodog Alpha only. */
  alpha: AlphaState | null;
  /** A run-time spawn: a howl's pup, a defense wave's enemy or a bat of the 4.3 roof (combat/spawns.ts). Worth 1 XP (the roof's 0), drops nothing. */
  rt: 'howl' | 'wave' | 'roof' | null;
  /** The target its current attack is locked on: Eleven in a defense, instead of the hero. Chosen again after each attack. */
  onWard: boolean;
  /** The frame a hero last hit it. The defense's targeting reads it. */
  hitAt: number;
  /** A Flayed, a soldier, Grigori or Flayed Billy only (docs/level-7.md, docs/level-8.md, docs/level-9.md). */
  flayed: FlayedState | null;
  soldier: SoldierState | null;
  grigori: GrigoriState | null;
  billy: BillyState | null;
  /** The Mind Flayer's body, or one of its legs, only (docs/level-9.md). */
  flayer: FlayerState | null;
  leg: LegState | null;
  /** A Creel ghoul only (docs/level-11.md), and a demobat only (docs/level-12.md). */
  ghoul: GhoulState | null;
  bat: BatState | null;
}

/** A Flayed, Grigori or Billy holding the active hero (enemies/hold.ts). `t` counts the frames of the hold. At most one at a time. */
export interface Hold { by: Enemy; hero: Hero; t: number }

/** The power box firing (combat/powerbox.ts): frames left in the window, and the uids of the enemies it has already hit. */
export interface Zap { left: number; hit: Set<number> }

/**
 * The stage's defense while it runs (combat/defense.ts). `left` counts frames down from `total`. `down` is set once her HP
 * hits 0, `done` once the clock runs out with her standing. `animT` is the ward's anim clock.
 */
export interface Defense {
  def: DefenseDef;
  waves: DefenseWave[];
  started: boolean;
  left: number; total: number;
  hp: number; hpMax: number;
  down: boolean; done: boolean;
  flash: number;
  animT: number;
  /** The next wave to bring up, and where the round of burrows is. */
  next: number; cursor: number;
  /** Where she stands (feet). `ward` marks it as hers for the enemies' steering (enemies/steer.ts). */
  pos: Pos & { ward: true };
}

export interface Proj {
  kind: 'rock' | 'dart' | 'candy' | 'bolt' | 'fireball' | 'scoop' | 'bullet' | 'bottle';
  mine: boolean;
  x: number; y: number;
  vx: number; vy: number;
  age: number; life: number;
  r: number;
  by: HeroId | null;
  power: number; kb: number; atk: number;
  util: Utility | null;
  /** How many more enemies it can pass through. */
  pierce: number;
  /** Where the shooter stood (feet) when it fired. Used for knockback and the DM screen test. */
  ox: number; oy: number;
  /** Enemy uids already hit. */
  hit: number[];
  /** The most a hit may leave an enemy's shove at (before its weight), so a volley that all lands does not stack (Nancy's Shotgun). */
  kbCap?: number;
  /** Enemy rounds only: the frames of invulnerability a hit leaves the hero, where it isn't the usual 45 (a soldier's burst). */
  invuln?: number;
  /** Candy lobs: start and end, and what happens on landing. */
  lob: { sx: number; sy: number; ex: number; ey: number; onLand: () => void } | null;
  /** A fireball: called with where it ended (an enemy, a solid prop or the end of its flight). It does the damage; the shot itself does none. */
  end: ((x: number, y: number) => void) | null;
}

export interface Zone {
  x: number; y: number;
  angle: number; r: number; half: number;
  age: number; life: number; tick: number;
  power: number; burn: number; burnTick: number;
  /** Knockback of each hit, and each burn tick's share of the caster's ATK. */
  kb: number; burnAtk: number;
  by: HeroId;
  cds: Map<number, number>;
}

/** One of Nancy's bear traps on the floor (heroes/nancy.ts). It holds the first non-boss enemy that steps on it. */
export interface Trap { x: number; y: number; age: number; life: number; by: HeroId }
export interface Lure { x: number; y: number; age: number; life: number; pull: number }
/** The DM screen: a dome of radius `half` px centered at x, y (chest height). `angle` is the way Mike faced. */
export interface Shield { x: number; y: number; angle: number; half: number; age: number; life: number }

export interface Item { id: string; kind: ItemKind; x: number; y: number; t: number }
export interface Prop {
  id: string; kind: PropKind;
  x: number; y: number; w: number; h: number;
  solid: boolean; state: PropState; t: number;
  hitBy?: Utility; pushBy?: Utility;
  /** Any hero's basic attack from up close lights it too (see smashAimed). */
  smash?: boolean;
  /** Whether it is solid when shut, so closeProp can put a seal back. A prop spawned open has solid false until then. */
  shutSolid: boolean;
  /** Cameras only: the sweep, and the frames the head has been turning. */
  cam?: CamDef; camT: number;
  /** Frames before this prop can report another attempt (see pokes.ts). */
  pokeCd: number;
  /** A cipher door only: how far it is decoded, 0..1 (docs/level-8.md). */
  k: number;
  /** Vines only: frames of burning left before they are gone. */
  burnT: number;
  /** A clock only: the basic attacks from up close that break it for a hero without the riff, and the ones it has taken. */
  hits: number; struck: number;
}
export interface Npc { id: CharId; x: number; y: number; dir: Dir; t: number }
export interface Body { id: HeroId; x: number; y: number; dir: Dir; t: number }
export interface Timer { n: number; fn: () => void }

export interface Buf {
  attack: number; special: number; burst: number;
  /** Pending swap request: 0 none, frames left otherwise. */
  swapT: number; swapDelta: number; swapTo: number;
}

export interface BurstSeq { t: number; fired: number }

export interface Nav { w: number; h: number; blocked: Uint8Array }

/** BFS distances to the active hero's tile, shared by every chasing enemy. */
export interface Flow { tx: number; ty: number; dist: Int16Array | null; nav: Nav | null; age: number }

export interface S {
  grid: Grid;
  rng: Rng;
  /** Cosmetic randomness only (shake, dust). Never feeds gameplay. */
  frng: Rng;
  /** The difficulty's factor (DIFFICULTY_MULT): enemy HP and every hit on the party, hazards included. */
  mult: number;
  /** The stage's own enemy factor (StageData.enemyMult): enemy HP and the damage enemies deal, not hazards. 1 by default. */
  foeMult: number;
  /** The stage's XP factor (StageData.xpMult) for the enemies it builds. 1 by default. */
  xpMult: number;
  frame: number;
  heroes: Hero[];
  active: number;
  /** Frames until a swap brings the invulnerability and shockwave again. */
  swapCd: number;
  /** Frames until any swap is allowed. */
  swapLock: number;
  trailX: Float32Array; trailY: Float32Array; trailHead: number;
  /** Frames the active hero has stood still. The followers settle behind him once it passes a few frames. */
  standT: number;
  /** The way the active hero last walked (not the way he aims). Standing followers rest on the opposite side. */
  walkDir: Dir;
  /** The shut prop the active hero has been pushing against, and for how many frames. */
  bump: { id: string; t: number } | null;
  enemies: Enemy[];
  /** Acid globs the Demogorgon has spat, still in the air. */
  globs: Glob[];
  /** The frame the last demodog lunge ended, so the next one waits at least 20 frames. */
  lungeEnd: number;
  projs: Proj[];
  zones: Zone[];
  lure: Lure | null;
  /** Nancy's bear traps, oldest first. */
  traps: Trap[];
  /** The hero a Flayed, Grigori or Billy is holding right now, or null. */
  hold: Hold | null;
  /** The power box while it fires, or null. */
  zap: Zap | null;
  shield: Shield | null;
  fx: FxView[];
  floaters: Floater[];
  items: Item[];
  props: Prop[];
  /** Floor hazards, and the clock they run on. It stops whenever play does (hit-stop, burst, game over). */
  hazards: HazardDef[]; hazT: number; hazPrev: ('off' | 'warn' | 'on')[];
  npcs: Npc[];
  bodies: Body[];
  timers: Timer[];
  events: SimEvent[];
  sfxSeen: Set<SfxId>;
  hitstop: number;
  shake: number; shakeX: number; shakeY: number;
  flash: number;
  burst: number;
  seq: BurstSeq | null;
  /** Frames of Inspiration left. */
  inspire: number;
  /** Quarters the party walked in with (SimOptions.purse). The HUD's coins add the run's own. */
  purse: number;
  /** What is left of Erica's stash (SimOptions.stash). The sim spends it on its own (docs/level-7.md). */
  stash: Stash;
  /** The frame the stash last fed an Eggo to a hero in trouble, so it does not eat one every tick. */
  eggoAt: number;
  /** Frames since an enemy last knew where the hero was. */
  calm: number;
  /** Mike's DM fiat: the next hit he lands is a crit. */
  armed: boolean;
  /** Frames of Steve's Babysit left: he takes less damage and the whole party's DEF is up. */
  babysit: number;
  /** The Lv 6 talents' timers, Dart and the Ahoy leap (combat/talent_state.ts). */
  t6: TalentState;
  over: boolean;
  nextUid: number;
  nextDrop: number;
  stats: RunStats;
  buf: Buf;
  flow: Flow;
  /** The same BFS field, pointed at the ward: a defense enemy that has no line to her walks down it. */
  wardFlow: Flow;
  /** Where run-time enemies come up from, the defense (null without one) and a count for the ids the sim makes up. */
  burrows: Burrow[];
  defense: Defense | null;
  rtSeq: number;
  /** The Mind Flayer's goo pools, oldest first, and the frames until the next sting from one the active hero stands in. */
  pools: Pool[];
  poolCd: number;
  /** The haunted mirrors, the clock curse and Max's Walkman (combat/house.ts). */
  house: HouseState;
  /** The 4.3 roof's song (combat/roof.ts), the frame each demobat flock may next send a bat down (by group), and the heroes dismissed for good. */
  roof: RoofState;
  flocks: Map<string, number>;
  gone: Hero[];
  cleared: Set<string>;
  god: boolean;
  boxes: boolean;
}

export function activeHero(s: S): Hero { return s.heroes[s.active] as Hero; }

export function dirOfAngle(a: number): Dir {
  const c = Math.cos(a), sn = Math.sin(a);
  if (Math.abs(c) >= Math.abs(sn) - 1e-6) return c >= 0 ? 'right' : 'left';
  return sn >= 0 ? 'down' : 'up';
}

export function dirOfVec(dx: number, dy: number, fallback: Dir): Dir {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return fallback;
  return dirOfAngle(Math.atan2(dy, dx));
}

/** Snaps an angle to the nearest of eight directions. */
export function snap8(a: number): number {
  const q = Math.PI / 4;
  return Math.round(a / q) * q;
}

