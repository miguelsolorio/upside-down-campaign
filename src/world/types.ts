// World types: the options for the play scene and the shape of stage data. Pure types, no DOM.
import type { Burrow, CharId, DefenseDef, HazardDef, HeroId, HeroSnapshot, LightSource, PartySeed, RunStats, SimSpawn, Stash, StashItem, TimeOfDay, TrackId, Vec2 } from '../core/types.ts';
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
  /**
   * Fired when the level-clear beat finishes. `quarters` is every quarter the whole run picked up, retries and CONTINUEs included
   * (the play scene banks them at each lit light, SaveData.quarters), where stats.quarters only counts since the last retry.
   */
  onClear(result: { stats: RunStats; party: HeroSnapshot[]; quarters?: number }): void;
  onQuit(): void;
  /** Pause menu, START OVER: the save is wiped and the level begins again. */
  onStartOver(): void;
  /** Quarters the party walks in with (Progress.purse). The HUD's coins start here. 0 if left out. */
  purse?: number;
  /** Erica's stash as the stage starts, and again for every retry (docs/level-7.md, "Erica and the stash"). */
  stash?(): Stash;
  /** The sim used an item from the stash. Flow writes it to progress at once, so a retry never gives it back. */
  onStashUsed?(item: StashItem): void;
  /** The save has Max's Walkman (Progress.walkman), the 4.2 story item: the sim starts with it (docs/level-11.md). */
  walkman?: boolean;
  /** A `walkman` step gave it mid-stage. Flow writes it to progress at once, so a retry or a quit keeps it. */
  onWalkman?(): void;
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
  /** The Key's machine blows up under the mall (docs/level-9.md): the `boom` sfx, a long screen shake, and every lit lights
   *  prop goes dark. Only the look changes: save points and checkpoints stay as they were. It does not wait. */
  | { t: 'boom' }
  /** An npc leaves: Hopper going down to the Key at the start of 3.3. It does not wait. */
  | { t: 'leave'; npc: CharId }
  /** The clock prop chimes and curses a hero (Sim.curse, docs/level-11.md, "The curse"). It does not wait: a `curseEnd` beat
   *  follows when the curse ends. */
  | { t: 'curse'; prop: string }
  /** Max gets her Walkman back, a story item (Sim.giveWalkman): the save keeps it at once. It does not wait. */
  | { t: 'walkman' }
  /** The rooftop's song on the note highway (docs/level-12.md): the play scene runs src/solo's createSolo with the chart and feeds each
   *  note to the sim. It waits for the song to end. */
  | { t: 'solo'; chart: 'rooftop' }
  /** A hero falls for good: Eddie on the 4.3 roof (Sim.dismissHero). It does not wait. */
  | { t: 'fall'; hero: HeroId }
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
  | { event: 'defended' }
  /** A curse ended, however it ended (the sim's `curseEnd` event). */
  | { event: 'curseEnd' }
  /** A boss with this spawn id moved into this phase (the sim's `phase` event). */
  | { event: 'phase'; spawn: string; phase: number };

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
  /**
   * Other heroes who solve it too, in order, each with their own hint. When `hero` isn't in the party, the first of these who is
   * takes over the hint and the bench pulse (docs/level-7.md, the mall's panel; docs/level-8.md, the breaker). The puzzle is live
   * while any of them, or `hero`, is in the party.
   */
  alt?: { hero: HeroId; hint: string }[];
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
  /** Scales the XP its enemies are worth, so the stage fits the campaign's pace (docs/pace.md). 1 if left out. */
  xpMult?: number;
  /** Tiles the sim brings run-time enemies up from: the Alpha's howl and the defense waves (docs/level-6.md). */
  burrows?: Burrow[];
  /** The stage's defense, started by a `defend` beat step (docs/level-6.md, "The defense"). */
  defense?: DefenseDef;
  /** The room drawn in the memory skin (the Creel House in Blood red) while a curse counts: 4.2's parlor (docs/level-11.md). */
  memory?: TileRect;
  /** The skin the stage's own letters bake in: 'upside' paints the Creel House in its Upside Down rot (4.4, docs/level-13.md). */
  skin?: 'upside';
  /** A storm flashes over the stage: a bolt every 6 to 10 s floods the lit edges red (4.3's Blue storm, docs/level-12.md). */
  storm?: boolean;
  waypoints: BotWaypoint[];
}
