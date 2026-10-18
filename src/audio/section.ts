// Plays a stretch of a track once, from a given bar, for a scene that keeps time to it: the Hellfire solo's note highway
// starts the `solo` track's riff or rooftop section this way (src/solo/index.ts). The live player (live.ts) only plays a track
// from bar one in a loop, as the music the stage wants, so this is a second, short-lived player. It asks the live one to
// stand down while it plays (the stage's own music fades out) and hands the music back when it stops.
// Like the live player it schedules a bar at a time on a lookahead timer, so the notes keep the audio clock's time and not the
// timer's. Nothing happens until the browser has let sound play: startSection then returns null and the scene plays silent.
import type { TrackId } from '../core/types.ts';
import { liveGraph } from './engine.ts';
import { setWanted, wantedTrack } from './live.ts';
import { createRig } from './rig.ts';
import { LOOKAHEAD, TICK_MS, scheduleBar } from './sequencer.ts';
import { barSeconds } from './tracks/compile.ts';
import { TRACKS } from './tracks/index.ts';

export interface Section {
  /** Audio context time the first bar sounds. */
  readonly startAt: number;
  /** Seconds since the first bar sounded, by the audio clock. Negative before it. */
  elapsed(): number;
  /** Fades the section out over `fade` seconds and hands the music back to the stage. Safe to call twice. */
  stop(fade?: number): void;
}

/** The track's bars from `bar`, `bars` of them, once. `lead` is how long from now the first bar sounds. */
export function startSection(id: TrackId, bar: number, bars: number, lead = 0.05): Section | null {
  const g = liveGraph();
  if (!g) return null;
  const { ctx } = g;
  const track = TRACKS[id];
  const before = wantedTrack();
  // The stage's music fades out. The live player keeps nothing of ours: it only learns that no track is wanted.
  setWanted(null);
  const rig = createRig(ctx, g.music, track);
  rig.setIntensity(0, true);
  const sources: AudioScheduledSourceNode[] = [];
  const startAt = ctx.currentTime + lead;
  let next = startAt;
  let done = 0;
  let stopped = false;
  const tick = (): void => {
    while (done < bars && next < ctx.currentTime + LOOKAHEAD) {
      if (next < ctx.currentTime) next = ctx.currentTime + 0.02;
      sources.push(...scheduleBar(ctx, rig.out, track, bar + done, next, rig.routes));
      next += barSeconds(track, bar + done);
      done++;
    }
    if (done >= bars) clearInterval(timer);
  };
  const timer = setInterval(tick, TICK_MS);
  tick();
  return {
    startAt,
    elapsed: () => ctx.currentTime - startAt,
    stop(fade = 0.25) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      const now = ctx.currentTime;
      const gain = rig.out.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0, now + fade);
      setTimeout(() => {
        for (const s of sources) {
          try { s.stop(); } catch { /* already stopped */ }
        }
        rig.dispose();
      }, (fade + 0.1) * 1000);
      // Only give the stage its music back if nothing else has asked for a track since.
      if (wantedTrack() === null) setWanted(before);
    },
  };
}
