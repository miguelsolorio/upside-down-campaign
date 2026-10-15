// Controller rumble: which short pulse a game event earns, and a small player that sends it to the pads.
// The pulses are weak on purpose. A pad without a vibration motor, or a browser without the API, is skipped without a
// sound: nothing here throws, logs or waits. The pure parts take their pads and clock as arguments, so Node tests them.
import type { SimEvent } from './types.ts';
import { pickPads } from './gamepad.ts';
import type { PadLike } from './gamepad.ts';
import { settings } from './settings.ts';

export type RumbleCue = 'hurt' | 'ko' | 'levelUp' | 'slam' | 'landing';

/** ms long. `strong` is the big low motor, `weak` the small buzzing one, both 0 to 1. */
export interface Pulse { ms: number; strong: number; weak: number }

export const PULSES: Record<RumbleCue, Pulse> = {
  hurt: { ms: 80, strong: 0.3, weak: 0.15 },
  ko: { ms: 220, strong: 0.45, weak: 0.25 },
  levelUp: { ms: 140, strong: 0, weak: 0.35 },
  slam: { ms: 200, strong: 0.5, weak: 0.2 },
  landing: { ms: 130, strong: 0.4, weak: 0.15 },
};

/** When two cues land in one tick, or one lands on a pulse still playing, the higher one wins. */
const RANK: Record<RumbleCue, number> = { levelUp: 0, hurt: 1, landing: 2, slam: 3, ko: 4 };

/**
 * The cue a sim event earns, or null. The hero being hit, a KO and a level-up are events of their own. A boss slam and a
 * boss landing only reach us as their sound: the Warden's ground slam, and a thud (a leap coming down, a charge hitting a wall).
 */
export function cueOf(e: SimEvent): RumbleCue | null {
  switch (e.t) {
    case 'hit': return e.onEnemy ? null : 'hurt';
    case 'heroKO': return 'ko';
    case 'levelUp': return 'levelUp';
    case 'sfx': return e.id === 'slam' ? 'slam' : e.id === 'thud' ? 'landing' : null;
    default: return null;
  }
}

/** The one cue worth playing for a tick's events: the highest-ranked, or null when none earns a pulse. */
export function pickCue(events: readonly SimEvent[]): RumbleCue | null {
  let best: RumbleCue | null = null;
  for (const e of events) {
    const c = cueOf(e);
    if (c && (best === null || RANK[c] > RANK[best])) best = c;
  }
  return best;
}

/** The slice of a Gamepad's vibration motor this file calls. A real GamepadHapticActuator fits. */
export interface Actuator {
  playEffect(type: 'dual-rumble', params: { startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }): unknown;
}
export interface RumblePad extends PadLike { vibrationActuator?: Actuator | null }

export interface RumbleEnv {
  pads(): readonly RumblePad[];
  /** Milliseconds, any origin. */
  now(): number;
  enabled(): boolean;
}

export interface Rumbler {
  /** Plays the pulse this tick's events earn, if any, unless a higher-ranked one is still running. */
  play(events: readonly SimEvent[]): void;
  /** Plays one cue straight away (the options row uses it to let a player feel the setting). */
  cue(c: RumbleCue): void;
}

export function createRumbler(env: RumbleEnv): Rumbler {
  let until = 0;
  let rank = -1;

  function cue(c: RumbleCue): void {
    if (!env.enabled()) return;
    const now = env.now();
    // A pulse that is still running is only cut short by a stronger one.
    if (now < until && RANK[c] <= rank) return;
    const p = PULSES[c];
    let played = false;
    for (const pad of env.pads()) {
      const motor = pad.vibrationActuator;
      if (!motor || typeof motor.playEffect !== 'function') continue;
      try {
        const r = motor.playEffect('dual-rumble', { startDelay: 0, duration: p.ms, weakMagnitude: p.weak, strongMagnitude: p.strong });
        // Some browsers refuse while the page is in the background. That's fine.
        (r as Promise<unknown> | undefined)?.catch?.(() => {});
        played = true;
      } catch { /* a pad that can't buzz right now: skip it */ }
    }
    if (played) { until = now + p.ms; rank = RANK[c]; }
  }

  return {
    play(events) {
      const c = pickCue(events);
      if (c) cue(c);
    },
    cue,
  };
}

const live = createRumbler({
  pads: () => (typeof navigator !== 'undefined' && navigator.getGamepads ? pickPads<RumblePad>(navigator.getGamepads() as ArrayLike<RumblePad | null>) : []),
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  enabled: () => settings.rumble,
});

/** The play scene calls this with every tick's sim events. */
export function rumble(events: readonly SimEvent[]): void {
  live.play(events);
}
/** One pulse on demand, such as the sample when RUMBLE is switched on. */
export function rumbleCue(c: RumbleCue): void {
  live.cue(c);
}
