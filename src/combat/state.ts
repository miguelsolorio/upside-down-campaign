// Internal state of one simulation. Only src/combat, src/heroes and src/enemies import this.
import type {
  AnimId, CamDef, CharId, Dir, EnemyKind, Floater, FxView, Grid, HazardDef, HeroId, ItemKind, PropKind, PropState,
  RunStats, SimEvent, SfxId, Utility,
} from '../core/types.ts';
import type { Rng, Stats } from '../progression/xp.ts';

export type { Rng, Stats };

export interface Pos { x: number; y: number }

/** Burn and stun are live. Slow is cheap, so it works too. Confuse and curse are types only. */
export interface Statuses { burn: number; burnTick: number; burnDmg: number; stun: number; slow: number }
export const noStatus = (): Statuses => ({ burn: 0, burnTick: 0, burnDmg: 0, stun: 0, slow: 0 });

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
}

export type EnemyMode = 'idle' | 'patrol' | 'chase' | 'windup' | 'lunge' | 'recover' | 'lured';

/**
 * What the Demogorgon is doing (enemies/demogorgon.ts). walk: stalking. swipe: the close-range wind-up. wind: planted before
 * the charge. run: the charge. stun: dazed against a wall. roar: the petals opening. spit: the acid wind-up. crouch: before
 * the leap. air: the leap. recover: after a swipe, a spit or a landing. pinned: at 0 HP after three stuns, waiting for the beam.
 */
export type DemoMove = 'walk' | 'swipe' | 'wind' | 'run' | 'stun' | 'roar' | 'spit' | 'crouch' | 'air' | 'recover' | 'pinned';

/** The Demogorgon's own state. Every other enemy has `demo: null`. */
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

/** An acid glob: flies from (sx, sy) to (x, y), splashes when its age reaches life, and its splash is drawn for a few frames more. */
export interface Glob { sx: number; sy: number; x: number; y: number; ang: number; age: number; life: number; atk: number; mark: FxView }

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
}

export interface Proj {
  kind: 'rock' | 'dart' | 'candy';
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
  /** Candy lobs: start and end, and what happens on landing. */
  lob: { sx: number; sy: number; ex: number; ey: number; onLand: () => void } | null;
}

export interface Zone {
  x: number; y: number;
  angle: number; r: number; half: number;
  age: number; life: number; tick: number;
  power: number; burn: number; burnTick: number;
  by: HeroId;
  cds: Map<number, number>;
}

export interface Lure { x: number; y: number; age: number; life: number; pull: number }
/** The DM screen: a dome of radius `half` px centered at x, y (chest height). `angle` is the way Mike faced. */
export interface Shield { x: number; y: number; angle: number; half: number; age: number; life: number }

export interface Item { id: string; kind: ItemKind; x: number; y: number; t: number }
export interface Prop {
  id: string; kind: PropKind;
  x: number; y: number; w: number; h: number;
  solid: boolean; state: PropState; t: number;
  hitBy?: Utility; pushBy?: Utility;
  /** Cameras only: the sweep, and the frames the head has been turning. */
  cam?: CamDef; camT: number;
  /** Frames before this prop can report another attempt (see pokes.ts). */
  pokeCd: number;
  /** Vines only: frames of burning left before they are gone. */
  burnT: number;
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
  mult: number;
  /** The stage's own enemy factor (StageData.enemyMult): enemy HP and the damage enemies deal, not hazards. 1 by default. */
  foeMult: number;
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
  projs: Proj[];
  zones: Zone[];
  lure: Lure | null;
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
  /** Frames since an enemy last knew where the hero was. */
  calm: number;
  /** Mike's DM fiat: the next hit he lands is a crit. */
  armed: boolean;
  over: boolean;
  nextUid: number;
  nextDrop: number;
  stats: RunStats;
  buf: Buf;
  flow: Flow;
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

