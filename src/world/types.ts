// World types: the options for the play scene and the shape of stage data. Pure types, no DOM.
import type { Burrow, DefenseDef, HazardDef, HeroId, HeroSnapshot, LightSource, PartySeed, RunStats, SimSpawn, TimeOfDay, TrackId, Vec2 } from '../core/types.ts';
import type { BotWaypoint } from '../combat/bot.ts';
import type { SaveData } from '../core/save.ts';

export interface PlayOptions {
  /** A stage id from `STAGE_ORDER` in core/campaign.ts, such as "1.1" or "1.2". */
  stageId: string;
  /** Draw the stage in this light instead of the one its data says (the ?time= flag). */
  time?: TimeOfDay;
  party: PartySeed[];
  /** Pick up from this save instead of the stage start. Its party replaces `party`. */
  resume?: SaveData;
  /** Fired when the level-clear beat finishes. */
  onClear(result: { stats: RunStats; party: HeroSnapshot[] }): void;
  onQuit(): void;
  /** Pause menu, START OVER: the save is wiped and the level begins again. */
  onStartOver(): void;
}

/** A rectangle in tile coordinates. */
export interface TileRect { tx: number; ty: number; w: number; h: number }

/** One thing a beat does, in order. Dialogue and the scare make the beat wait for them to finish. */
export type BeatStep =
  | { t: 'say'; script: string }
  | { t: 'wake'; group: string }
  /** Wakes the first ambush wave that still has enemies. Later waves follow each groupCleared. */
  | { t: 'waves' }
  | { t: 'scare' }
  /** The klaxon sounds. It does not wait for anything. */
  | { t: 'alarm' }
  | { t: 'recruit'; hero: HeroId }
  | { t: 'open'; prop: string }
  /** Shuts an open prop again (Sim.closeProp), such as the vine seals across the Alpha's den. It does not wait. */
  | { t: 'close'; prop: string }
  /** Starts the stage's defense (Sim.defend). It does not wait: a `defended` beat follows when the clock runs out. */
  | { t: 'defend' }
  /** Lights a lights prop as if the party had: a save point and the heal (Hopper strung the lights at the Gate). It does
   *  not wait, and does nothing if it is already lit. */
  | { t: 'light'; prop: string }
  /** Switches the stage music, such as to `clock` when a boss wakes. It does not wait. */
  | { t: 'music'; track: TrackId }
  | { t: 'finish' };

/** What fires a beat. Rect beats fire once, the first time the hero's tile enters the rectangle. `needs` holds a
 * rect beat back until the named beat has finished. */
export type BeatWhen =
  | { rect: TileRect; needs?: string }
  | { cleared: string }
  | { after: string }
  | { event: 'targetHit' | 'propCleared' | 'spotted'; prop: string }
  /** The boss with this spawn id is pinned (the sim's `pinned` event). */
  | { event: 'pinned'; spawn: string }
  /** The defense clock ran out with the ward standing (the sim's `defended` event). */
  | { event: 'defended' };

export interface Beat { id: string; when: BeatWhen; steps: BeatStep[] }

/** A puzzle the player can get stuck on. Its arrival beat explains it; if the prop is still unsolved after
 * HINT_AFTER frames spent near it, the play scene points the yellow caret at the prop, pulses the hero who solves
 * it and shows the hint as a subtitle. */
export interface PuzzleDef {
  id: string;
  /** The beat that introduces the puzzle. The hint clock starts once this beat has finished. */
  beat: string;
  /** The prop to point at (and to watch: open or lit means solved). For a boss finisher, the boss's spawn id. */
  prop: string;
  /** True when `prop` is an enemy spawn id (the pinned Demogorgon): the caret follows it and its death solves it. */
  enemy?: boolean;
  /** The hero who solves it, and the one whose bench slot pulses with the hint. */
  hero: HeroId;
  /** Other props that count as trying this puzzle: the gate or door it opens. Trying `prop` itself counts too. */
  blocks?: string[];
  /** The subtitle line. Names the hero and what to try, never a key, so it stays true after a rebind. One row. */
  hint: string;
}

/** Where the party stands again after a retry, once this lights prop has been lit. Feet position in px. */
export interface Checkpoint { prop: string; x: number; y: number }

/** A dark shape that crosses the trail during the scare. Positions are in world px. */
export interface ScareDef { from: Vec2; to: Vec2; frames: number }

export interface StageData {
  id: string;
  name: string;
  /** ASCII map, one character per tile, legend in core/tiles.ts. */
  rows: string[];
  /** Active hero feet position in px. */
  start: Vec2;
  spawns: SimSpawn[];
  beats: Beat[];
  puzzles: PuzzleDef[];
  /** Ambush groups in the order they wake. */
  waves: string[];
  /** Always-on lights in world px. Lit lights props and floodlights add their own at draw time. */
  lights: LightSource[];
  /** Day draws the normal art. Night draws the night art, with a pool of light around each light. */
  time: TimeOfDay;
  music: TrackId;
  checkpoints: Checkpoint[];
  scare: ScareDef;
  /** Floor hazards that cycle on and off. Stages without any leave this out. */
  hazards?: HazardDef[];
  /** How much tougher this stage's enemies are than the difficulty setting makes them: HP and damage dealt. 1 if left out. */
  enemyMult?: number;
  /** Tiles the sim brings run-time enemies up from: the Alpha's howl and the defense waves (docs/level-6.md). */
  burrows?: Burrow[];
  /** The stage's defense, started by a `defend` beat step (docs/level-6.md, "The defense"). */
  defense?: DefenseDef;
  waypoints: BotWaypoint[];
}
