// The recorder's sound: the audio calls a capture logged (core/capture.ts), played again on an OfflineAudioContext through the game's own
// mix graph (audio/engine.ts, by way of renderWith in audio/render.ts), so what the video carries is what a player hears. This follows
// the live player (audio/live.ts) call for call: a new track fades the old one out for a quarter second and starts after it, intensity and
// tempo phase ride the playing track, jingles and stingers duck the music, and Eddie's solo takes the track over for a section and hands it back.
// Effects get the live player's repeat gap, and the random pitch the live player draws is drawn from a seed of the call's own.
import type { CapEvent } from '../core/capture.ts';
import { FPS } from '../core/config.ts';
import type { TrackId } from '../core/types.ts';
import { playBlip, playCue } from '../audio/cues.ts';
import { duckMusic, mixLevels, resetDuck } from '../audio/engine.ts';
import { renderWith } from '../audio/render.ts';
import { createRig } from '../audio/rig.ts';
import type { Rig } from '../audio/rig.ts';
import { LOOKAHEAD, scheduleBar } from '../audio/sequencer.ts';
import { playSfx, SFX } from '../audio/sfx.ts';
import { barSeconds, phaseBpm, phaseCount } from '../audio/tracks/compile.ts';
import { TRACKS } from '../audio/tracks/index.ts';
import { JINGLES, STINGERS } from '../audio/tracks/jingles.ts';
import type { Cue } from '../audio/tracks/jingles.ts';
import type { Track } from '../audio/tracks/types.ts';
import { FRAME_SAMPLES, cutShot, heardAt, seedOf, seeded } from './mixmath.ts';

/** The live player's numbers (audio/live.ts, audio/index.ts). */
const FADE_OUT = 0.25;
const START_SOON = 0.05;
const START_AFTER = FADE_OUT + 0.06;
const MIN_GAP = 0.03;
const MIN_BLIP_GAP = 0.02;
/** Sound made earlier than this before the shot is left out, since nothing that short-lived is still ringing. */
const PRE_ROLL = 8;
const EFFECT_TAIL = 3;

interface Seg {
  id: TrackId;
  track: Track;
  rig: Rig;
  startAt: number;
  stopAt: number | null;
  /** The tempo phase from `t` on, in order. The first is the phase the track started at. */
  phases: { t: number; phase: number }[];
  /** A section of the track (Eddie's song) instead of the loop from bar one. */
  section?: { bar: number; bars: number };
}

/**
 * A track to play under the shot in place of the game's own music: `from` seconds into it when the shot starts, with the combat layer
 * in at `level` (0 to 1). Shots that follow one another can share a track.
 */
export interface Bed { id: TrackId; from: number; level?: number }

export interface MixInfo {
  peak: number;
  rmsDb: number;
  limiterDb: number;
  seconds: number;
}

/**
 * Renders the sound of a page's run and cuts one shot from it. `start` is the tick the shot began on and `frames` its length. Everything
 * is rendered from a few seconds before the shot, so the music is at the point in its loop the game had reached. Fades are in seconds.
 */
export async function mixShot(
  events: readonly CapEvent[], start: number, frames: number, fade: { in: number; out: number }, bed?: Bed,
): Promise<{ samples: Float32Array; info: MixInfo }> {
  const originTick = Math.max(0, start - PRE_ROLL * FPS);
  const origin = originTick / FPS;
  const total = (start + frames - originTick) / FPS;
  const levels = mixLevels();
  resetDuck();

  const r = await renderWith(total, (ctx, g, t0) => {
    g.music.gain.value = levels.music;
    g.sfx.gain.value = levels.sfx;
    // Context time of a moment in the page's run, never before the start of the render.
    const ct = (t: number): number => Math.max(0, t0 + t - origin);
    const segs: Seg[] = [];
    let current: Seg | null = null;
    let section: Seg | null = null;
    /** What the stage wanted when the song took over, which comes back when it stops. */
    let before: TrackId | null = null;
    let wanted: TrackId | null = null;
    let level = 0;
    let phase = 0;
    const lastSfx = new Map<string, number>();
    let lastBlip = -1;

    const stop = (seg: Seg, t: number, fade: number): void => {
      seg.stopAt = t;
      const gain = seg.rig.out.gain;
      gain.setValueAtTime(1, ct(t));
      gain.linearRampToValueAtTime(0, ct(t + fade));
    };
    const begin = (id: TrackId, t: number, sect?: Seg['section']): Seg => {
      const track = TRACKS[id];
      const rig = createRig(ctx, g.music, track);
      rig.setIntensity(sect ? 0 : level, true, ct(t));
      if (!sect) rig.setBpm(phaseBpm(track, phase), true);
      const seg: Seg = { id, track, rig, startAt: t, stopAt: null, phases: [{ t, phase: sect ? 0 : phase }], section: sect };
      segs.push(seg);
      return seg;
    };
    // The live player's sync(): start what is wanted, after the old track has faded out.
    const sync = (t: number): void => {
      if ((current ? current.id : null) === wanted) return;
      let at = t + START_SOON;
      if (current) { stop(current, t, FADE_OUT); at = t + START_AFTER; }
      current = wanted ? begin(wanted, at) : null;
    };
    const want = (id: TrackId | null, t: number): void => {
      if (id !== wanted) phase = 0;
      wanted = id;
      sync(t);
    };

    events.forEach((e, n) => {
      const t = heardAt(e);
      const near = t >= origin - EFFECT_TAIL;
      // A bed takes the music's place: the game's own track, tempo and song calls are left out.
      if (bed && (e.kind === 'music' || e.kind === 'intensity' || e.kind === 'phase' || e.kind === 'section' || e.kind === 'sectionStop')) return;
      switch (e.kind) {
        case 'music':
          want(e.id as TrackId | null, t);
          break;
        case 'intensity':
          level = Math.max(0, Math.min(1, e.id as number));
          current?.rig.setIntensity(level, false, ct(t));
          break;
        case 'phase': {
          phase = Math.max(0, Math.min(wanted ? phaseCount(TRACKS[wanted]) - 1 : 0, Math.round(e.id as number) || 0));
          if (current) {
            current.phases.push({ t, phase });
            current.rig.setBpm(phaseBpm(current.track, phase), false, ct(t));
          }
          break;
        }
        case 'section': {
          // The stage's music stands down while the song plays.
          before = wanted;
          want(null, t);
          section = begin(e.id as TrackId, t + (e.lead ?? 0.05), { bar: e.bar ?? 0, bars: e.bars ?? 1 });
          break;
        }
        case 'sectionStop':
          if (section) { stop(section, t, e.fade ?? 0.25); section = null; }
          // Only if nothing else has asked for a track since, the stage's music comes back.
          if (wanted === null) want(before, t);
          break;
        case 'sfx': {
          if (!near) break;
          const id = e.id as string;
          if (t - (lastSfx.get(id) ?? -1) < MIN_GAP) break;
          lastSfx.set(id, t);
          const recipe = SFX[id as keyof typeof SFX];
          if (!recipe) break;
          const rand = seeded(seedOf(e, n));
          playSfx(ctx, g.sfx, id as keyof typeof SFX, ct(t) + 0.005, (e.rate ?? 1) * (1 + (rand() * 2 - 1) * recipe.j));
          break;
        }
        case 'blip':
          if (!near || t - lastBlip < MIN_BLIP_GAP) break;
          lastBlip = t;
          playBlip(ctx, g.sfx, e.id as Parameters<typeof playBlip>[2], ct(t) + 0.003, seeded(seedOf(e, n)));
          break;
        case 'jingle':
        case 'stinger': {
          if (!near) break;
          const table: Record<string, Cue> = e.kind === 'jingle' ? JINGLES : STINGERS;
          const cue = table[e.id as string];
          if (!cue) break;
          playCue(ctx, g.sfx, cue, ct(t) + 0.01);
          duckMusic(g, cue.duck, cue.duckDb, ct(t));
          break;
        }
      }
    });

    if (bed) {
      level = bed.level ?? 0;
      current = begin(bed.id, start / FPS - bed.from);
    }

    // Every track's bars, now that each one's end is known.
    const end = origin + total;
    for (const seg of segs) {
      const limit = Math.min(seg.stopAt ?? end, end);
      let next = seg.startAt;
      for (let done = 0; next < limit; done++) {
        const bar = (seg.section ? seg.section.bar : 0) + done;
        if (seg.section ? done >= seg.section.bars : seg.track.once && done >= seg.track.bars) break;
        const ph = seg.section ? 0 : phaseAtSeg(seg, next - LOOKAHEAD);
        if (next >= origin) scheduleBar(ctx, seg.rig.out, seg.track, bar, ct(next), seg.rig.routes, ph);
        next += barSeconds(seg.track, bar, ph);
      }
    }
  });

  const from = Math.round((start - originTick) * FRAME_SAMPLES) / FRAME_SAMPLES;
  const samples = cutShot(r.samples, from, frames, fade.in, fade.out);
  return { samples, info: { peak: r.metrics.peak, rmsDb: r.metrics.rmsDb, limiterDb: r.metrics.limiterDb, seconds: total } };
}

/** The tempo phase a track is at when a bar is scheduled. */
function phaseAtSeg(seg: Seg, t: number): number {
  let p = (seg.phases[0] as { phase: number }).phase;
  for (const x of seg.phases) if (x.t <= t) p = x.phase;
  return p;
}
