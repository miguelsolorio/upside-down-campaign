// World types: the options for the play scene and the shape of stage data. Pure types, no DOM.
import type { HeroId, HeroSnapshot, LightSource, PartySeed, RunStats, SimSpawn, TimeOfDay, TrackId, Vec2 } from '../core/types.ts';
import type { BotWaypoint } from '../combat/bot.ts';
import type { SaveData } from '../core/save.ts';

export interface PlayOptions {
  /** "1.1" for now. */
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
  | { t: 'recruit'; hero: HeroId }
  | { t: 'open'; prop: string }
  | { t: 'finish' };

/** What fires a beat. Rect beats fire once, the first time the hero's tile enters the rectangle. `needs` holds a
 * rect beat back until the named beat has finished. */
export type BeatWhen =
  | { rect: TileRect; needs?: string }
  | { cleared: string }
  | { after: string }
  | { event: 'targetHit' | 'propCleared'; prop: string };

export interface Beat { id: string; when: BeatWhen; steps: BeatStep[] }

/** A puzzle the player can get stuck on. Its arrival beat explains it; if the prop is still unsolved after
 * HINT_AFTER frames spent near it, the play scene highlights the prop and the hero who solves it. */
export interface PuzzleDef {
  id: string;
  /** The beat that introduces the puzzle. The hint clock starts once this beat has finished. */
  beat: string;
  /** The prop to point at (and to watch: open or lit means solved). */
  prop: string;
  /** The hero whose bench slot pulses with the highlight. */
  hero: HeroId;
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
  waypoints: BotWaypoint[];
}
