// The live music player: one track at a time, switching with a short fade, the combat layer following intensity().
// A track that is asked for before the context exists waits, and starts on unlock.
import type { TrackId } from '../core/types.ts';
import { liveGraph } from './engine.ts';
import type { Graph } from './engine.ts';
import { createRig } from './rig.ts';
import type { Rig } from './rig.ts';
import { startLive } from './sequencer.ts';
import type { Driver } from './sequencer.ts';
import { TRACKS } from './tracks/index.ts';
import { phaseBpm, phaseCount } from './tracks/compile.ts';

interface Playing {
  id: TrackId;
  rig: Rig;
  driver: Driver;
  sources: Set<AudioScheduledSourceNode>;
}

const FADE_OUT = 0.25;

let playing: Playing | null = null;
let wanted: TrackId | null = null;
let level = 0;
let phase = 0;

/** The track the game last asked for, whether or not it has started yet. */
export function wantedTrack(): TrackId | null {
  return wanted;
}

export function setWanted(id: TrackId | null): void {
  // A new track starts at its first tempo. Asking for the track that is already wanted keeps the phase.
  if (id !== wanted) phase = 0;
  wanted = id;
  sync();
}

/**
 * Sets the tempo phase of the wanted track, 0 for its own tempo. A phase the track does not have is clamped to its last,
 * and a track with one phase ignores it. The change takes hold at the next bar line.
 */
export function setPhase(n: number): void {
  phase = Math.max(0, Math.min(wanted ? phaseCount(TRACKS[wanted]) - 1 : 0, Math.round(n) || 0));
  if (!playing) return;
  playing.driver.setPhase(phase);
  playing.rig.setBpm(phaseBpm(TRACKS[playing.id], phase));
}

/** The tempo phase now set. */
export function currentPhase(): number {
  return phase;
}

/**
 * True once the playing track is one that plays once and its last bar has run out. A looping track, a track that is
 * still playing and a track that has not started (the browser has not let sound play yet) are all false.
 */
export function musicEnded(): boolean {
  const g = liveGraph();
  const end = playing?.driver.endAt;
  return !!g && end != null && g.ctx.currentTime >= end;
}

export function setLevel(v: number): void {
  level = Math.max(0, Math.min(1, v));
  playing?.rig.setIntensity(level);
}

export function currentLevel(): number {
  return level;
}

/** Which track is sounding and which bar it is on, for the lab. */
export function position(): { id: TrackId; bar: number; bars: number } | null {
  const g = liveGraph();
  if (!playing || !g) return null;
  const track = TRACKS[playing.id];
  return { id: playing.id, bar: playing.driver.barAt(g.ctx.currentTime), bars: track.bars };
}

/** Starts, switches or stops the music so it matches what was asked for. Safe to call at any time. */
export function sync(): void {
  const g = liveGraph();
  if (!g) return;
  if ((playing ? playing.id : null) === wanted) return;
  const now = g.ctx.currentTime;
  let startAt = now + 0.05;
  if (playing) {
    stopPlaying(g, FADE_OUT);
    // The next track waits for the old one to finish fading, so the two never sound together.
    startAt = now + FADE_OUT + 0.06;
  }
  if (wanted) startPlaying(g, wanted, startAt);
}

function startPlaying(g: Graph, id: TrackId, startAt: number): void {
  const track = TRACKS[id];
  const rig = createRig(g.ctx, g.music, track);
  rig.setIntensity(level, true);
  const sources = new Set<AudioScheduledSourceNode>();
  rig.setBpm(phaseBpm(track, phase), true);
  const driver = startLive(g.ctx, rig.out, track, rig.routes, startAt, (list) => {
    for (const s of list) {
      sources.add(s);
      s.addEventListener('ended', () => sources.delete(s), { once: true });
    }
  }, phase);
  playing = { id, rig, driver, sources };
}

function stopPlaying(g: Graph, fade: number): void {
  const p = playing;
  if (!p) return;
  playing = null;
  p.driver.stop();
  const gain = p.rig.out.gain;
  const now = g.ctx.currentTime;
  const cur = gain.value;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(cur, now);
  gain.linearRampToValueAtTime(0, now + fade);
  setTimeout(() => {
    for (const s of p.sources) {
      try { s.stop(); } catch { /* already stopped */ }
    }
    p.rig.dispose();
  }, (fade + 0.1) * 1000);
}
