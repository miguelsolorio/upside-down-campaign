// The audio vocabulary: tracks, jingles, stingers and the mixer's API. Split out of types.ts to keep that file under 500
// lines; types.ts re-exports all of it, so import from there. The same contract rule applies: report changes, don't make them.
import type { HeroId, SfxId, Speaker } from './types.ts';

/** upside: 1.3's halls and 2.2. clock: every boss fight. hawkins: the map screen and 2.1. starcourt: 3.1 to 3.3. sour:
 *  starcourt going sour near the Mind Flayer, in 3.3 (docs/level-9.md). */
export type TrackId = 'static' | 'mirkwood' | 'lab' | 'upside' | 'clock' | 'hawkins' | 'starcourt' | 'sour';
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
