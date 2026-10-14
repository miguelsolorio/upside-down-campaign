// Shared types for the whole game. Pure types: no DOM, so Node tests can import this file.
// This file is the contract. Do not edit it from a sub-agent; report the change you need instead.
import type { ColorName } from '../gfx/palette.ts';

export type { ColorName };

// ---------------------------------------------------------------- geometry
export type Dir = 'down' | 'up' | 'left' | 'right';
export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// ---------------------------------------------------------------- identity
/** Playable in Level 1. Later: will, max, steve, nancy, hopper, robin, eddie. */
export type HeroId = 'mike' | 'dustin' | 'lucas' | 'eleven';
/** Anything with a hero-style sprite and portrait, playable or not. */
export type CharId = HeroId | 'will' | 'joyce';
export type EnemyKind = 'agent' | 'rat';
export type Utility = 'push' | 'burn' | 'smash' | 'shoot' | 'sense' | 'dash' | 'read' | 'riff' | 'compass';
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spd';
export type StatusId = 'burn' | 'stun' | 'slow' | 'confuse' | 'curse';
export type Difficulty = 'kid' | 'chief' | 'upside';

// ---------------------------------------------------------------- what gets drawn
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
  /** Small HP bar over an enemy once it has been hit. */
  bar: { hp: number; hpMax: number } | null;
}

export type FxKind =
  | 'slash' | 'push' | 'beam' | 'flame' | 'shield' | 'nova' | 'spark' | 'dust'
  | 'rock' | 'candy' | 'dart' | 'blast' | 'heal' | 'ring' | 'spore';

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

export type ItemKind = 'eggo' | 'coke' | 'quarter';
export interface ItemView { kind: ItemKind; x: number; y: number; t: number }

export type PropKind = 'log' | 'gate' | 'target' | 'lights' | 'bike' | 'sign' | 'van' | 'floodlight' | 'crate';
export type PropState = 'closed' | 'open' | 'lit' | 'off';
export interface PropView {
  id: string; kind: PropKind;
  /** Top-left and size in world px. */
  x: number; y: number; w: number; h: number;
  state: PropState; t: number;
}

export interface Floater { text: string; x: number; y: number; t: number; life: number; color: ColorName; big: boolean }
export interface LightSource { x: number; y: number; r: number; flicker?: number }
/** A stage is either in daylight, drawn with the normal art, or at night, drawn with the night art. */
export type TimeOfDay = 'day' | 'night';

export interface PartyHud {
  id: HeroId; name: string; level: number;
  hp: number; hpMax: number; mp: number; mpMax: number;
  xp: number; xpNext: number; ko: boolean; active: boolean;
}
export interface HudView {
  party: PartyHud[];
  /** Party burst meter, 0..1. */
  burst: number; burstReady: boolean;
  quarters: number;
  /** Seconds of Nat 20 Inspiration left. */
  inspiration: number;
  /** How recharged the hero swap is: 0 just swapped, 1 ready. */
  swapReady: number;
  boss: { name: string; hp: number; hpMax: number } | null;
}
export interface SimView {
  /** Y-sorted, painter's order: heroes, followers, enemies, npcs. */
  actors: ActorView[];
  fx: FxView[];
  items: ItemView[];
  props: PropView[];
  floaters: Floater[];
  hud: HudView;
  /** Camera focus: the active hero's feet. */
  focus: Vec2;
  /** Screen shake offset in px, already scaled to 0 when settings.shake is 0. */
  shake: Vec2;
  /** 0..1 white screen flash (burst, Nat 20). Reduce-flashing clamps it. */
  flash: number;
}

// ---------------------------------------------------------------- sim
export interface Grid { w: number; h: number; solid: Uint8Array }

export interface SimInput {
  mx: number; my: number;
  attackHeld: boolean; attackPressed: boolean;
  specialPressed: boolean; specialHeld: boolean;
  swapDelta: -1 | 0 | 1;
  /** 0..3 = swap to that party slot, -1 = none. */
  swapTo: number;
  burstPressed: boolean;
}

export type SfxId =
  | 'swing' | 'hit' | 'crit' | 'kill' | 'hurt' | 'ko'
  | 'rock' | 'rockHit' | 'dart' | 'push' | 'beam' | 'flame' | 'shield' | 'lure' | 'candyPop'
  | 'dash' | 'swap' | 'burst' | 'pickup' | 'heal' | 'noMp' | 'nosebleed'
  | 'select' | 'confirm' | 'cancel' | 'pause' | 'dialogOpen'
  | 'gateOpen' | 'targetHit' | 'logPush' | 'lights' | 'flicker' | 'growl'
  | 'roll' | 'rollLand' | 'natTwenty' | 'levelUp' | 'alert' | 'step';

export interface LevelUpInfo {
  hero: HeroId; from: number; to: number;
  /** The d20 result that sized the bonus points. With advantage, the higher of two rolls. */
  roll: number; advantage: boolean;
  /** Stat deltas actually applied, fixed growth plus bonus points. */
  gains: Partial<Record<StatKey, number>>;
  /** New talent name and one-line text, if this level grants one. */
  talent: { name: string; text: string } | null;
}

export type SimEvent =
  | { t: 'sfx'; id: SfxId }
  | { t: 'hit'; dmg: number; crit: boolean; x: number; y: number; onEnemy: boolean }
  | { t: 'kill'; kind: EnemyKind; spawnId: string; group: string; by: HeroId; xp: number; x: number; y: number }
  | { t: 'levelUp'; info: LevelUpInfo }
  | { t: 'heroKO'; hero: HeroId }
  | { t: 'allDown' }
  | { t: 'swap'; from: HeroId; to: HeroId }
  | { t: 'pickup'; item: ItemKind; hero: HeroId }
  | { t: 'targetHit'; propId: string }
  | { t: 'propCleared'; propId: string }
  | { t: 'groupCleared'; group: string }
  | { t: 'burst' }
  | { t: 'natTwenty'; hero: HeroId; source: 'crit' | 'levelUp' };

export type SimSpawn =
  | { kind: 'enemy'; id: string; type: EnemyKind; tx: number; ty: number; group: string; dormant?: boolean; patrol?: { tx: number; ty: number }[] }
  | { kind: 'item'; id: string; item: ItemKind; tx: number; ty: number }
  | { kind: 'prop'; id: string; prop: PropKind; tx: number; ty: number; w?: number; h?: number; solid?: boolean; state?: PropState; hitBy?: Utility; pushBy?: Utility }
  | { kind: 'npc'; id: CharId; tx: number; ty: number; dir: Dir };

export interface PartySeed {
  id: HeroId; level?: number; xp?: number;
  /** d20 bonus received from level-ups so far, in stat units per stat. Carried between stages so stats survive a retry. */
  bonus?: Partial<Record<StatKey, number>>;
}

export interface SimOptions {
  grid: Grid;
  /** First entry is the active hero. */
  party: PartySeed[];
  /** Active hero feet position in world px. */
  start: Vec2;
  spawns: SimSpawn[];
  /** Spawn ids already cleared (retry from a checkpoint). */
  skipSpawns?: string[];
  /** Prop ids already opened or cleared. */
  openProps?: string[];
  difficulty?: Difficulty;
  seed?: number;
  god?: boolean;
}

export interface HeroSnapshot {
  id: HeroId; level: number; xp: number; hp: number; hpMax: number;
  /** d20 bonus received so far, in stat units per stat. Pass the snapshot back as a PartySeed to keep the hero's stats. */
  bonus?: Partial<Record<StatKey, number>>;
}

export interface RunStats {
  kills: number;
  killsByKind: Partial<Record<EnemyKind, number>>;
  damageDealt: number; damageTaken: number;
  xpEarned: number; quarters: number;
  levelUps: { hero: HeroId; from: number; to: number }[];
  frames: number; kos: number;
}

export interface SimDev {
  god: boolean;
  hitboxes: boolean;
  /** Same rules as a kill: the active hero gets it all, the bench gets half. */
  giveXp(n: number): void;
  /** Sets the active hero's level and recomputes stats. */
  setLevel(n: number): void;
  killAll(): void;
  teleport(px: number, py: number): void;
}

export interface Sim {
  /** One 60 Hz tick. Returns the events produced this tick. */
  step(input: SimInput): SimEvent[];
  view(): SimView;
  /** Joins at party average level minus one (min 1). Removes an npc spawn with the same id. */
  recruit(id: HeroId): void;
  /** Wakes every dormant enemy spawn in the group. */
  spawnGroup(group: string): void;
  /** Opens a gate or clears a log by prop id. */
  openProp(id: string): void;
  healParty(frac: number): void;
  heroPos(): Vec2;
  party(): HeroSnapshot[];
  stats(): RunStats;
  enemiesAlive(group?: string): number;
  /** True while any enemy is chasing or attacking. Drives the music's combat layer. */
  aggro(): boolean;
  readonly dev: SimDev;
}

/** Hooks the dev panel gets. World builds this from Sim and its own state. */
export interface DevHooks extends SimDev {
  spawnGroup(group: string): void;
  openProp(id: string): void;
  recruit(id: HeroId): void;
  state(): Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------- dialogue and story
export type Expr = 'neutral' | 'happy' | 'worried' | 'determined' | 'hurt' | 'shocked';
export type Speaker = CharId | 'dm' | 'narrator';
/** text: up to 3 lines of 32 characters. Use "\n" for a hard break. */
export interface DialogueLine { who: Speaker; text: string; expr?: Expr }
export interface DialogueScript { id: string; lines: DialogueLine[] }

export type BarkEvent = 'swapIn' | 'levelUp' | 'ko' | 'lowHp' | 'special' | 'kill' | 'eggo' | 'crit' | 'idle';

// ---------------------------------------------------------------- gfx vocabulary
export type IconId =
  | 'bulbRed' | 'bulbYellow' | 'bulbGreen' | 'bulbBlue' | 'bulbOff'
  | 'd20' | 'd20Glow' | 'eggo' | 'coke' | 'quarter' | 'arrow' | 'cursor' | 'heart' | 'mpGem';
export type PanelStyle = 'dialog' | 'hud' | 'menu';
export interface TextOpts { align?: 'left' | 'center' | 'right'; shadow?: boolean }

// ---------------------------------------------------------------- audio vocabulary
export type TrackId = 'static' | 'mirkwood';
export type JingleId = 'levelUp' | 'recruit' | 'clear' | 'gameOver' | 'item' | 'dice';
export type StingerId = 'scare' | HeroId;
export interface AudioMetrics {
  seconds: number;
  /** Peak sample after the limiter, 0..1. */
  peak: number;
  rmsDb: number;
  /** Largest gain reduction the limiter applied, in dB. */
  limiterDb: number;
  clipped: number;
  wav: ArrayBuffer | null;
}
export interface AudioApi {
  /** Call on the first key or pointer event. Safe to call repeatedly. A controller press can call it too, but a browser may ignore that. */
  unlock(): void;
  /** True once the browser lets sound play. The title asks a controller player for one click while this is false. */
  ready(): boolean;
  music(id: TrackId | null): void;
  /** 0..1 target for the combat layer. Smoothed inside. */
  intensity(v: number): void;
  jingle(id: JingleId): void;
  sfx(id: SfxId, opts?: { rate?: number; pan?: number }): void;
  /** One dialogue speech blip for this speaker. */
  blip(who: Speaker): void;
  stinger(id: StingerId): void;
  setVolumes(music: number, sfx: number): void;
  mute(on: boolean): void;
  isMuted(): boolean;
  /**
   * Tells the mixer whether the page has focus. An unfocused page goes silent: the music keeps its place,
   * effects are dropped. This is separate from mute(), so the player's own mute survives a focus change.
   */
  focus(on: boolean): void;
  tracks(): TrackId[];
  /** Offline render for QA and WAV export. */
  renderOffline(id: TrackId, seconds: number, opts?: { combat?: boolean }): Promise<AudioMetrics>;
}
