// PUBLIC API of audio. Owner: Audio agent. The shape is AudioApi, defined in core/types.ts.
//
// Nothing makes a sound until unlock() runs inside a key or pointer event. Until then music() just remembers
// the track, and the first unlock starts it. Effects asked for before that are dropped.
// Everything is synthesized: pulse, triangle and noise voices through a master gain and a limiter.
import type { AudioApi } from '../core/types.ts';
import { capLog, capturing } from '../core/capture.ts';
import { duckMusic, isAway, isMuted, isRunning, liveGraph, setAway, setMuted, setVolumes, unlock } from './engine.ts';
import type { Graph } from './engine.ts';
import { playBlip, playCue } from './cues.ts';
import { musicEnded, setLevel, setPhase, setWanted, sync } from './live.ts';
import { renderOffline } from './render.ts';
import { playSfx, SFX } from './sfx.ts';
import { JINGLES, STINGERS } from './tracks/jingles.ts';
import { TRACKS, TRACK_IDS } from './tracks/index.ts';
import { loopSeconds } from './tracks/compile.ts';

/** The same effect or blip within this many seconds is dropped, so a stuck button cannot flood the mixer. */
const MIN_GAP = 0.03;
const MIN_BLIP_GAP = 0.02;
const lastSfx = new Map<string, number>();
let lastBlip = -1;

/**
 * The graph, if the context exists and sound is on. Muted or unfocused games make no voices at all. A capture makes none either:
 * it logs each call (core/capture.ts) before this is asked, and the recorder renders the sound offline from the log.
 */
function audible(): Graph | null {
  return isMuted() || isAway() || capturing() ? null : liveGraph();
}

export const audio: AudioApi = {
  unlock() {
    if (unlock()) sync();
  },

  ready: isRunning,

  music(id) {
    capLog('music', id);
    setWanted(id);
  },

  intensity(v) {
    capLog('intensity', v);
    setLevel(v);
  },

  jingle(id) {
    capLog('jingle', id);
    const g = audible();
    if (!g) return;
    const cue = JINGLES[id];
    playCue(g.ctx, g.sfx, cue, g.ctx.currentTime + 0.01);
    duckMusic(g, cue.duck, cue.duckDb);
  },

  sfx(id, opts) {
    capLog('sfx', id, { rate: opts?.rate });
    const g = audible();
    if (!g) return;
    const now = g.ctx.currentTime;
    if (now - (lastSfx.get(id) ?? -1) < MIN_GAP) return;
    lastSfx.set(id, now);
    const recipe = SFX[id];
    const mul = (opts?.rate ?? 1) * (1 + (Math.random() * 2 - 1) * recipe.j);
    const pan = Math.max(-1, Math.min(1, opts?.pan ?? 0));
    if (pan === 0) {
      playSfx(g.ctx, g.sfx, id, now + 0.005, mul);
      return;
    }
    const panner = g.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(g.sfx);
    playSfx(g.ctx, panner, id, now + 0.005, mul);
    setTimeout(() => panner.disconnect(), 1500);
  },

  blip(who) {
    capLog('blip', who);
    const g = audible();
    if (!g) return;
    const now = g.ctx.currentTime;
    if (now - lastBlip < MIN_BLIP_GAP) return;
    lastBlip = now;
    playBlip(g.ctx, g.sfx, who, now + 0.003);
  },

  stinger(id) {
    capLog('stinger', id);
    const g = audible();
    if (!g) return;
    const cue = STINGERS[id];
    playCue(g.ctx, g.sfx, cue, g.ctx.currentTime + 0.01);
    duckMusic(g, cue.duck, cue.duckDb);
  },

  setVolumes,
  mute: setMuted,
  isMuted,
  focus: (on) => setAway(!on),
  tracks: () => TRACK_IDS.slice(),
  phase(n) {
    capLog('phase', n);
    setPhase(n);
  },
  musicEnded,
  trackSeconds: (id) => loopSeconds(TRACKS[id]),
  renderOffline,
};
