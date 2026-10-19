// The audio vocabulary: tracks, jingles, stingers and the mixer's API. Split out of types.ts to keep that file under 500
// lines; types.ts re-exports all of it, so import from there. The same contract rule applies: report changes, don't make them.
import type { HeroId, Speaker } from './types.ts';

/** Every sound effect the sim and the scenes can ask for. */
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
  /** legslam: a Mind Flayer leg striking. sever: a leg cut. shatter: the skylight breaking. boom: the Key's machine blowing
   *  up under the mall. reach: Eleven reaching Billy. */
  | 'legslam' | 'sever' | 'shatter' | 'boom' | 'reach'
  /** squeal: the feedback that cuts the Hellfire solo short after three misses in a row (src/solo). */
  | 'squeal'
  /** haymaker: Hopper's punch (docs/level-10.md). vswing: Eddie's Flying V. riff: one pulse of his solo. feedback: the squeal that
   *  cuts a solo short. chime: a grandfather clock's chime, the curse counting. curse: a hero lifted by the curse. walkman: Max
   *  playing her Walkman. ghoul: a Creel ghoul stepping out of a mirror (docs/level-11.md). */
  | 'haymaker' | 'vswing' | 'riff' | 'feedback' | 'chime' | 'curse' | 'walkman' | 'ghoul'
  /** whistle: the Commander calling his squad. clang: a hit bouncing off a trooper's shield. shieldBreak: a smash breaking it for good.
   *  fall: a twin Demogorgon dropping into the void (docs/level-14.md, docs/level-15.md). */
  | 'whistle' | 'clang' | 'shieldBreak' | 'fall'
  /** screech: a demobat's dive. flap: a flock passing. bolt: the storm's thunder (docs/level-12.md). whip: Vecna's vine lash. orb: a
   *  memory orb breaking. debris: a throw landing. vecna: his call as a phase turns (docs/level-13.md). */
  | 'screech' | 'flap' | 'bolt' | 'whip' | 'orb' | 'debris' | 'vecna'
  | 'roll' | 'rollLand' | 'natTwenty' | 'levelUp' | 'alert' | 'step';

/** upside: 1.3's halls and 2.2. clock: every boss fight. hawkins: the map screen, 2.1 and 4.2. starcourt: 3.1 to 3.3. sour:
 *  starcourt going sour near the Mind Flayer, in 3.3 (docs/level-9.md). kamchatka: mirkwood in the snow, slower and colder, for
 *  4.1 (docs/level-10.md). abyss: the final boss, 5.3, three tempo phases (audio.phase). ending: the epilogue, plays once
 *  (audio.musicEnded). solo: Eddie's Hellfire riff and the 4.3 rooftop song, two sections of one track that the note highway starts
 *  on its own (src/solo). */
export type TrackId = 'static' | 'mirkwood' | 'lab' | 'upside' | 'clock' | 'hawkins' | 'starcourt' | 'sour' | 'kamchatka'
  | 'abyss' | 'ending' | 'solo';
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
  /**
   * Sets the tempo phase of the music now wanted: 0 is the track's own tempo, and each step is faster. Only `abyss` has
   * phases (160, 164 and 168 bpm); any other track ignores the call, and a phase past the last is clamped to it. It takes
   * hold at the next bar line. Asking for a different track starts it back at phase 0, and asking for the track already
   * playing leaves the phase alone, so a fight sets 0 when it starts.
   */
  phase(n: number): void;
  /**
   * True once a play-once track (`ending`) has played its last bar. False for a looping track, while it plays, and while
   * the browser has not yet let sound start: a scene that waits on it also keeps its own clock (see trackSeconds).
   */
  musicEnded(): boolean;
  /** Seconds one pass of the track takes at its first tempo. For `ending` this is its whole length. */
  trackSeconds(id: TrackId): number;
  /** Offline render for QA and WAV export. `phase` renders at that tempo phase. */
  renderOffline(id: TrackId, seconds: number, opts?: { combat?: boolean; phase?: number }): Promise<AudioMetrics>;
}
