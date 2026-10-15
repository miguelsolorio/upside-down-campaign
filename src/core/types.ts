// Shared types for the whole game. Pure types: no DOM, so Node tests can import this file.
// This file is the contract. Do not edit it from a sub-agent; report the change you need instead.
import type { ColorName } from '../gfx/palette.ts';

export type { ColorName };

// ---------------------------------------------------------------- geometry
export type Dir = 'down' | 'up' | 'left' | 'right';
export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// ---------------------------------------------------------------- identity
/** Playable so far. Will joins in chapter 2, Max and Steve in 2.2, Robin and Nancy in 3.1. Later: hopper, eddie. */
export type HeroId = 'mike' | 'dustin' | 'lucas' | 'eleven' | 'will' | 'max' | 'steve' | 'robin' | 'nancy';
/** Anything with a hero-style sprite and portrait, playable or not. Max is an npc at the arcade in 2.1 and plays from
 *  2.2 on. Hopper is an npc at the Gate in 2.3. Erica is an npc at Scoops Ahoy in 3.1 and runs the cart on the map. */
export type CharId = HeroId | 'joyce' | 'hopper' | 'erica';
/**
 * guard: a riot guard with a shield that stops frontal hits. warden: the Lab's mini-boss, a bigger shielded guard.
 * demogorgon: the chapter 1 boss (docs/level-3.md). demodog: a young demodog, lunges in packs (docs/level-4.md).
 * vine: a rooted tendril that lashes and slows. pod: a rooted spore pod that bursts into a slowing cloud. Both burn.
 * alpha: the Demodog Alpha, the chapter 2 boss (docs/level-6.md).
 * melter: a melting rat that bursts into goo when it dies. flayed: a slow grabber that rises from goo (docs/level-7.md).
 * soldier: a Russian soldier with burst fire. grigori: the 3.2 mini-boss, who shrugs off frontal hits (docs/level-8.md).
 */
export type EnemyKind =
  | 'agent' | 'rat' | 'guard' | 'warden' | 'demogorgon' | 'demodog' | 'vine' | 'pod' | 'alpha'
  | 'melter' | 'flayed' | 'soldier' | 'grigori';
/** An elite is the same enemy, tougher and meaner: more HP and damage, a faster pace, double XP. Set per spawn. */
export type EnemyTier = 'elite';
export type Utility = 'push' | 'burn' | 'smash' | 'shoot' | 'sense' | 'dash' | 'read' | 'riff' | 'compass';
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spd';
export type StatusId = 'burn' | 'stun' | 'slow' | 'confuse' | 'curse';
/** normal and chief are the player's NORMAL and HARD. kid and upside are for the measure scripts and the tests, in no menu. */
export type Difficulty = 'kid' | 'normal' | 'chief' | 'upside';

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
  /** Small HP bar over an enemy once it has been hit, and over a hero who is standing. */
  bar: { hp: number; hpMax: number } | null;
  /** An elite enemy: gfx draws it with its own marks (red trim, a bigger bar). Absent means a normal one. */
  elite?: boolean;
  /** A guard or warden whose shield is up. It stops hits from the front, so gfx can show the shield raised or dropped. */
  guarding?: boolean;
  /** A boss's pose, when it is doing something other than walking. The Demogorgon uses charge to pinned
   *  (docs/level-3.md). The Alpha uses crouch (the pounce wind-up), leap (in the air), howl and stun (docs/level-6.md).
   *  A Flayed uses rise (coming up out of the goo) and grab (holding a hero), and Grigori uses grab and stun. */
  pose?: 'charge' | 'stun' | 'spit' | 'leap' | 'pinned' | 'crouch' | 'howl' | 'rise' | 'grab';
  /** The Demogorgon's head petals are open (below 60% HP). */
  petals?: boolean;
  /** A hidden enemy that only Will's Cold spot shows. gfx draws it faint or not at all. */
  hidden?: boolean;
  /** An enemy confused by Robin's Word vomit: it fights the other enemies. gfx draws a swirl over its head. */
  confused?: boolean;
  /** A dormant Flayed, waiting as a goo puddle until its group wakes. */
  puddle?: boolean;
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
  | 'scoop' | 'babble' | 'bullet' | 'goo' | 'trap' | 'arcs';

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

/**
 * camera: a sweeping security camera (see CamDef). Shooting it lights it, which switches it off.
 * tank, rack, generator: animated lab furniture the sim treats as plain solid blocks.
 * vines: a wall of Upside Down vines across a doorway. hitBy 'burn' burns it away (propCleared).
 * firebox: a red fire-door release box on a wall. hitBy 'shoot' lights it (targetHit), like a console.
 * hidden: a hidden path, solid and drawn as plain wall until a hero with `sense` stands near it (hitBy 'sense').
 * arcade: an arcade cabinet with a live screen, solid furniture.
 * gap: a one-tile drop across a tunnel. Always solid to walking and to enemies; only Max's Skate dash crosses it. Her first
 *   crossing sets it 'open' (the puzzle is solved) but it stays solid. Drawn the same in both states.
 * crack: a cracked wall across a passage, hitBy 'smash'. Steve's nail bat breaks it: open and walkable.
 * rift: the Gate, a tear in the Lab's floor and wall. Solid. Its PropView.k is how far it has closed during the defense.
 * shutter: a mall's rolling security grille across a concourse. Solid until the `open` step rolls it up.
 * cipher: a steel door with a Russian keypad, hitBy 'read'. Robin standing near it decodes it (PropView.k), then it opens.
 * powerbox: a floor plate that fires when a breaker is shot. Not solid. Lit while it fires.
 * breaker: a wall switch, hitBy 'shoot'. Lit by a shot, it fires every powerbox, then goes back to closed to be shot again.
 */
export type PropKind =
  | 'log' | 'gate' | 'target' | 'lights' | 'bike' | 'sign' | 'van' | 'floodlight' | 'crate' | 'door' | 'console'
  | 'camera' | 'tank' | 'rack' | 'generator' | 'vines' | 'firebox' | 'hidden' | 'arcade' | 'gap' | 'crack' | 'rift'
  | 'shutter' | 'cipher' | 'powerbox' | 'breaker';
/** alert: a camera that has just spotted the party. */
export type PropState = 'closed' | 'open' | 'lit' | 'off' | 'alert';
export interface PropView {
  id: string; kind: PropKind;
  /** Top-left and size in world px. */
  x: number; y: number; w: number; h: number;
  state: PropState; t: number;
  /** A camera's current cone. angle is in radians, 0 = right, y down. live is false once it is shot. */
  cam?: { angle: number; range: number; half: number; live: boolean };
  /** 0..1 progress a prop shows: how far the Gate (a rift) has closed during the defense, or how far a cipher door is
   *  decoded. Absent means 0. */
  k?: number;
}

/** A sweeping camera. It turns between two headings, spots a hero inside its cone with a clear line, and raises the alarm. */
export interface CamDef {
  /** The two headings it sweeps between, in degrees. 0 = right, 90 = down. */
  from: number; to: number;
  /** Frames for one full sweep there and back. */
  period: number;
  /** Reach of the cone in px. */
  range: number;
  /** Half the cone's width, in degrees. */
  half: number;
}

/**
 * A floor hazard: a rectangle of tiles that goes off on a cycle. It is on for `on` frames out of every `period`,
 * after a warning, offset by `phase`. A hero standing in it while it is on takes `dmg` (before difficulty) and is
 * thrown clear. electric: arcing panels. steam: a vent that vents.
 */
export interface HazardDef {
  id: string;
  kind: 'electric' | 'steam';
  /** Top-left tile and size in tiles. */
  tx: number; ty: number; w: number; h: number;
  period: number; on: number;
  phase?: number;
  dmg: number;
}
export type HazardState = 'off' | 'warn' | 'on';
export interface HazardView {
  id: string; kind: HazardDef['kind'];
  /** Top-left and size in world px. */
  x: number; y: number; w: number; h: number;
  state: HazardState;
  /** Frames into the current state. */
  t: number;
}

export interface Floater { text: string; x: number; y: number; t: number; life: number; color: ColorName; big: boolean }
export interface LightSource { x: number; y: number; r: number; flicker?: number }
/** A stage is either in daylight, drawn with the normal art, or at night, drawn with the night art. */
export type TimeOfDay = 'day' | 'night';

export interface PartyHud {
  id: HeroId; name: string; level: number;
  hp: number; hpMax: number; mp: number; mpMax: number;
  /** What the hero's special costs, so the MP bar can show casts. */
  mpCost: number;
  xp: number; xpNext: number; ko: boolean; active: boolean;
}
export interface HudView {
  party: PartyHud[];
  /** Crit meter (the code calls it burst), 0..1. */
  burst: number; burstReady: boolean;
  quarters: number;
  /** Seconds of Nat 20 Inspiration left. */
  inspiration: number;
  /** How recharged the hero swap is: 0 just swapped, 1 ready. */
  swapReady: number;
  boss: { name: string; hp: number; hpMax: number } | null;
  /**
   * The defense (docs/level-6.md): who the party guards, their health, and the clock in frames. left counts down from
   * total to 0. The HUD draws it where the boss bar goes. Null outside a defense.
   */
  ward: { name: string; hp: number; hpMax: number; left: number; total: number } | null;
  /** What is left of the stash bought from Erica (docs/level-7.md, "Erica and the stash"). */
  stash: Stash;
}
export interface SimView {
  /** Y-sorted, painter's order: heroes, followers, enemies, npcs. */
  actors: ActorView[];
  fx: FxView[];
  items: ItemView[];
  props: PropView[];
  /** Floor hazards and what each is doing now. Empty on a stage without any. */
  hazards: HazardView[];
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
  | 'gateOpen' | 'targetHit' | 'logPush' | 'lights' | 'flicker' | 'growl' | 'klaxon'
  /** zap: an electric panel firing. steam: a vent venting. spotted: a camera sees you. block: a shield stops a hit.
   *  bash: a guard's swing. slam: the Warden's ground slam. */
  | 'zap' | 'steam' | 'spotted' | 'block' | 'bash' | 'slam'
  /** roar: the Demogorgon's call. acid: a spit. lunge: a charge or demodog lunge. petals: the head opening.
   *  chomp: a bite landing. thud: a charge hitting a wall. reveal: a hidden path showing. sizzle: vines burning away. */
  | 'roar' | 'acid' | 'lunge' | 'petals' | 'chomp' | 'thud' | 'reveal' | 'sizzle'
  /** howl: the Alpha calling its pack. skate: Max's dash rolling. crack: a cracked wall breaking. taunt: Steve's Babysit.
   *  rumble: the Gate tearing at the floor during the defense. gateShut: the Gate closing for good. */
  | 'howl' | 'skate' | 'crack' | 'taunt' | 'rumble' | 'gateShut'
  /** pistol and shotgun: Nancy. scoop and babble: Robin. rifle: a soldier's burst, one per round. melt: a melting rat bursting.
   *  grab: a Flayed or Grigori taking hold. decode: a cipher door opening. stash: an item from Erica's stash used. buy: a
   *  purchase at Erica's cart. */
  | 'pistol' | 'shotgun' | 'scoop' | 'babble' | 'rifle' | 'melt' | 'grab' | 'decode' | 'stash' | 'buy'
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
  /** A camera saw the party. */
  | { t: 'spotted'; propId: string }
  /** A hero tried a gate, door, log, crate, lantern or console that is still shut: swung or fired at it, or pushed against it. */
  | { t: 'poked'; propId: string; hero: HeroId }
  /** The Demogorgon hit 0 HP and is pinned: only Eleven's Mind Blast finishes it. spawnId is the boss's spawn. */
  | { t: 'pinned'; spawnId: string }
  /** The Alpha howled and called its pack. Once per howl. */
  | { t: 'howl'; spawnId: string }
  /** The one the party guards in a defense went down. The stage treats it like the whole party going down. */
  | { t: 'wardDown'; id: CharId }
  /** The defense clock ran out with the ward standing: the Gate is shut. Once. */
  | { t: 'defended' }
  /** An item from Erica's stash was used. The play scene writes the stash back to progress at once. */
  | { t: 'stashUsed'; item: StashItem }
  | { t: 'burst' }
  | { t: 'natTwenty'; hero: HeroId; source: 'crit' | 'levelUp' };

export type SimSpawn =
  /** hidden: drawn faint until Will's Cold spot shows it or it attacks (docs/level-4.md). */
  | { kind: 'enemy'; id: string; type: EnemyKind; tx: number; ty: number; group: string; dormant?: boolean; patrol?: { tx: number; ty: number }[]; tier?: EnemyTier; dir?: Dir; hidden?: boolean }
  | { kind: 'item'; id: string; item: ItemKind; tx: number; ty: number }
  /** smash: any hero's basic attack from up close lights it too, on top of the `hitBy` hero's way of doing it. */
  | { kind: 'prop'; id: string; prop: PropKind; tx: number; ty: number; w?: number; h?: number; solid?: boolean; state?: PropState; hitBy?: Utility; pushBy?: Utility; smash?: boolean; cam?: CamDef }
  | { kind: 'npc'; id: CharId; tx: number; ty: number; dir: Dir };

/** A tile the sim may bring enemies up from at run time: the Alpha's howl and the defense waves. */
export interface Burrow { tx: number; ty: number }

/** One wave of a defense: `n` enemies of `type`, `at` frames after the defense starts, from the burrows. */
export interface DefenseWave { at: number; n: number; type: EnemyKind; tier?: EnemyTier }

/**
 * A defense (docs/level-6.md, "The defense"): an npc channels for `frames` while the party keeps enemies off them. The npc
 * gets `hp` (before difficulty) and a bar. Enemies favor the npc over the hero. The clock always runs. When it reaches 0
 * the sim emits `defended`, every enemy still up from the defense waves dies with no XP, and `prop` (the rift) shows
 * k = 1. If the npc's HP reaches 0 first, the sim emits `wardDown` once and stops the clock.
 */
export interface DefenseDef {
  /** The npc spawn id (a CharId) the party guards. */
  npc: CharId;
  hp: number;
  frames: number;
  /** A rift prop whose k follows the clock, from 0 at the start to 1 at the end. */
  prop?: string;
  waves: DefenseWave[];
}

/** What Erica sells and the sim spends by itself (docs/level-7.md, "Erica and the stash"). */
export type StashItem = 'eggo' | 'coke';
export type Stash = Record<StashItem, number>;

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
  /** Floor hazards the stage has. */
  hazards?: HazardDef[];
  /** Scales this stage's enemies on top of the difficulty setting: their HP and the damage they deal (not hazards). 1 if left out. */
  enemyMult?: number;
  /** Scales the XP this stage's enemies are worth, rounded per enemy and at least 1, so a stage's XP fits the campaign's
   *  pace (docs/pace.md). Run-time spawns stay at 1. 1 if left out. */
  xpMult?: number;
  /** Tiles the sim brings run-time enemies up from: the Alpha's howl and the defense waves. */
  burrows?: Burrow[];
  /** The stage's defense, started by Sim.defend(). */
  defense?: DefenseDef;
  /** Quarters the party walked in with. The HUD's coins show this plus what the run picks up. 0 if left out. */
  purse?: number;
  /** Items bought from Erica, spent by the sim on its own. Empty if left out. */
  stash?: Stash;
  /** Spawn ids already cleared (retry from a checkpoint). Run-time spawns are never skipped. */
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
  /** Shuts a prop that is open, such as a vine seal across the Alpha's den: closed and solid again. A hero standing in it
   *  is moved out to the nearest open tile, so nobody is ever stuck inside one. */
  closeProp(id: string): void;
  /** Starts the stage's defense (SimOptions.defense). Does nothing without one, or once it has started. */
  defend(): void;
  healParty(frac: number): void;
  /** Switches the difficulty mid-stage: hits land at the new factor at once, and each living enemy keeps its share of HP. */
  setDifficulty(d: Difficulty): void;
  /** A prize outside a fight (the arcade's high score): XP shared the usual way, quarters, and floaters over the hero. */
  bonus(xp: number, quarters: number): void;
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
  /** The enemy groups and the props the stage has, for the panel's suggestions. Any id works if you type it. */
  groups: readonly string[];
  props: readonly string[];
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
  | 'd20' | 'd20Glow' | 'eggo' | 'coke' | 'quarter' | 'arrow' | 'cursor' | 'cursorDown' | 'cursorUp' | 'heart';
export type PanelStyle = 'dialog' | 'hud' | 'menu';
export interface TextOpts { align?: 'left' | 'center' | 'right'; shadow?: boolean }

// ---------------------------------------------------------------- audio vocabulary
/** upside: 1.3's halls and 2.2. clock: every boss fight. hawkins: the map screen and 2.1. starcourt: 3.1 and 3.2. */
export type TrackId = 'static' | 'mirkwood' | 'lab' | 'upside' | 'clock' | 'hawkins' | 'starcourt';
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
