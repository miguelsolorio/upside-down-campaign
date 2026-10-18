// The audio vocabulary: tracks, jingles, stingers and the mixer's API. Split out of types.ts to keep that file under 500
// lines; types.ts re-exports all of it, so import from there. The same contract rule applies: report changes, don't make them.
import type { HeroId, SfxId, Speaker } from './types.ts';

/** upside: 1.3's halls and 2.2. clock: every boss fight. hawkins: the map screen and 2.1. starcourt: 3.1 to 3.3. sour:
 *  starcourt going sour near the Mind Flayer, in 3.3 (docs/level-9.md). abyss: the final boss, 5.3, three tempo
 *  phases (audio.phase). ending: the epilogue, plays once (audio.musicEnded). solo: Eddie's Hellfire riff and the 4.3 rooftop
 *  song, two sections of one track that the note highway starts on its own (src/solo). */
export type TrackId = 'static' | 'mirkwood' | 'lab' | 'upside' | 'clock' | 'hawkins' | 'starcourt' | 'sour'
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
