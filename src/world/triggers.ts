// The beat director. Runs a stage's beats: rect triggers fire once, cleared groups and sim events fire others
// (a lit target, a cleared prop, a camera sighting, a pinned boss), and each beat is a queue of steps (dialogue, scare,
// wake, recruit, open, music, phase, boom, leave, curse, walkman, solo, fall, finish). Pure logic with no DOM and no audio, so Node can run it. The play scene supplies the env.
import type { JingleId, Sim, SimEvent, TrackId } from '../core/types.ts';
import type { Beat, BeatStep, TileRect } from './types.ts';

export interface DirectorEnv {
  sim(): Sim;
  /** Plays a dialogue script and calls done after its last line. Calls done at once when the script is missing. */
  say(script: string, done: () => void): void;
  /** Plays the scripted scare and calls done when it is over. */
  scare(done: () => void): void;
  /** Opens a prop: sim.openProp plus its sound. */
  open(prop: string): void;
  /** The klaxon: its sound and, if the stage draws one, the red pulse. Optional so a stand-in env can leave it out. */
  alarm?(): void;
  /** Switches the stage music, such as to `clock` when a boss wakes. Optional so a stand-in env can leave it out. */
  music?(track: TrackId): void;
  /** Sets the music's tempo phase (audio.phase), as the final boss steps `abyss` up. Optional like music. */
  phase?(n: number): void;
  /** Lights a lights prop the way the player does: the save point and the heal. Optional like music. */
  light?(prop: string): void;
  /** The Key's machine blowing up under the mall: the sound, the shake and the lights going dark. Optional like music. */
  boom?(): void;
  /** Max gets her Walkman back: the sim gets it and the save keeps it at once (docs/level-11.md). Optional like music. */
  walkman?(): void;
  /** Plays the rooftop's song (docs/level-12.md) and calls done when it ends. Calls done at once when the env has no highway. */
  solo?(chart: 'rooftop', done: () => void): void;
  jingle(id: JingleId): void;
  /** The level-clear beat reached its last step. */
  finish(): void;
}

export interface DirectorState { fired: string[]; cleared: string[] }

export interface Director {
  /** Call every tick with the hero's tile. */
  tick(tx: number, ty: number): void;
  /** Feed it the events of a sim step. */
  events(ev: SimEvent[]): void;
  /** True while a beat has steps left or is waiting on a dialogue or the scare. */
  busy(): boolean;
  finished(): boolean;
  /** True once the beat has fired, whether or not its steps are done. */
  hasFired(id: string): boolean;
  snapshot(): DirectorState;
  /** Resets to a snapshot and drops whatever was running. */
  restore(s: DirectorState): void;
}

type Item = BeatStep | { t: 'end'; id: string };

const inside = (r: TileRect, tx: number, ty: number): boolean =>
  tx >= r.tx && ty >= r.ty && tx < r.tx + r.w && ty < r.ty + r.h;

/**
 * The track playing once the beats in `fired` have run: the last `music` step among them, in the stage's beat order, else the
 * stage's own. A retry or a load rebuilds the director from a snapshot without replaying its beats, so this is how a boss track
 * that a fired beat switched to carries on.
 */
export function musicAfter(beats: Beat[], fired: readonly string[], dflt: TrackId): TrackId {
  let track = dflt;
  for (const b of beats) {
    if (!fired.includes(b.id)) continue;
    for (const st of b.steps) if (st.t === 'music') track = st.track;
  }
  return track;
}

export function createDirector(beats: Beat[], waves: string[], env: DirectorEnv): Director {
  let fired = new Set<string>();
  let cleared = new Set<string>();
  let completed = new Set<string>();
  let queue: Item[] = [];
  let waiting = false;
  let over = false;
  /** Bumped by restore, so a callback from a run that was thrown away does nothing. */
  let epoch = 0;

  function fire(b: Beat): void {
    if (fired.has(b.id)) return;
    fired.add(b.id);
    queue.push(...b.steps, { t: 'end', id: b.id });
    pump();
  }

  /** A group is done: fire the beats waiting on it and wake the next wave. */
  function groupDone(group: string): void {
    if (cleared.has(group)) return;
    cleared.add(group);
    for (const b of beats) if ('cleared' in b.when && b.when.cleared === group) fire(b);
    const i = waves.indexOf(group);
    const next = waves[i + 1];
    if (i >= 0 && next !== undefined) wake(next);
  }

  /** Wakes a group. One with nobody left (a retry skips the dead) counts as cleared right away. */
  function wake(group: string): void {
    const sim = env.sim();
    if (sim.enemiesAlive(group) > 0) sim.spawnGroup(group);
    else groupDone(group);
  }

  function wait(start: (done: () => void) => void): void {
    waiting = true;
    const mine = epoch;
    let called = false;
    start(() => {
      if (called || mine !== epoch) return;
      called = true;
      waiting = false;
      pump();
    });
  }

  function run(s: Item): void {
    switch (s.t) {
      case 'say': wait((done) => env.say(s.script, done)); break;
      case 'scare': wait((done) => env.scare(done)); break;
      case 'alarm': env.alarm?.(); break;
      case 'music': env.music?.(s.track); break;
      case 'phase': env.phase?.(s.n); break;
      case 'wake': wake(s.group); break;
      case 'waves': { const first = waves[0]; if (first !== undefined) wake(first); break; }
      case 'recruit': {
        const sim = env.sim();
        // A retry can come back after Eleven has already joined. She is not recruited twice.
        if (!sim.party().some((p) => p.id === s.hero)) { sim.recruit(s.hero); env.jingle('recruit'); }
        break;
      }
      case 'open': env.open(s.prop); break;
      case 'close': env.sim().closeProp(s.prop); break;
      case 'defend': env.sim().defend(); break;
      case 'light': env.light?.(s.prop); break;
      case 'boom': env.boom?.(); break;
      case 'leave': env.sim().dismiss?.(s.npc); break;
      case 'curse': env.sim().curse?.(s.prop); break;
      case 'walkman': env.walkman?.(); break;
      case 'solo': if (env.solo) wait((done) => env.solo?.(s.chart, done)); break;
      case 'fall': env.sim().dismissHero?.(s.hero); break;
      case 'finish': over = true; env.finish(); break;
      case 'end': completed.add(s.id); for (const b of beats) if ('after' in b.when && b.when.after === s.id) fire(b); break;
    }
  }

  function pump(): void {
    while (!waiting && !over && queue.length > 0) run(queue.shift() as Item);
  }

  return {
    tick(tx, ty) {
      if (over) return;
      for (const b of beats) {
        if (!('rect' in b.when) || fired.has(b.id) || !inside(b.when.rect, tx, ty)) continue;
        if (b.when.needs === undefined || completed.has(b.when.needs)) fire(b);
      }
    },
    events(ev) {
      for (const e of ev) {
        if (e.t === 'groupCleared') {
          groupDone(e.group);
        } else if (e.t === 'targetHit' || e.t === 'propCleared' || e.t === 'spotted') {
          for (const b of beats) if ('event' in b.when && b.when.event === e.t && b.when.prop === e.propId) fire(b);
        } else if (e.t === 'pinned') {
          for (const b of beats) if ('event' in b.when && b.when.event === 'pinned' && b.when.spawn === e.spawnId) fire(b);
        } else if (e.t === 'defended' || e.t === 'curseEnd' || e.t === 'finalRoll') {
          for (const b of beats) if ('event' in b.when && b.when.event === e.t) fire(b);
        } else if (e.t === 'bossPhase') {
          for (const b of beats) if ('event' in b.when && b.when.event === 'bossPhase' && b.when.phase === e.phase) fire(b);
        } else if (e.t === 'phase') {
          for (const b of beats) if ('event' in b.when && b.when.event === 'phase' && b.when.spawn === e.spawnId && b.when.phase === e.phase) fire(b);
        }
      }
    },
    busy: () => waiting || queue.length > 0,
    finished: () => over,
    hasFired: (id) => fired.has(id),
    snapshot: () => ({ fired: [...fired], cleared: [...cleared] }),
    restore(s) {
      fired = new Set(s.fired);
      cleared = new Set(s.cleared);
      // Snapshots are taken while the director is idle, so everything that had fired had also finished.
      completed = new Set(s.fired);
      queue = [];
      waiting = false;
      over = false;
      epoch++;
    },
  };
}
