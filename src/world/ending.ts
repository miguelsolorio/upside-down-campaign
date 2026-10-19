// The final fight's finish (docs/level-16.md, "The Final Roll"), kept out of the play scene so Node can test its clock. The sim sends `finalRoll`
// once, when the channel runs out, and the play scene hands it here instead of to the director. Play stops, and:
//   roll    the Final Roll scene plays over the frozen fight for the event's heroes, with the event's own roll (ui/finalroll.ts);
//   joyce   the camera goes to the Mind Flayer's kneeling body, and Joyce runs in from the south with her axe (RUN frames), raises it and brings it
//           down (gfx/ch5/finale_joyce.ts). About 1.5 s all told;
//   strike  as the axe comes down the stage's `level_clear` beat is fired with the event: its `boom` step (the shake, and a white flash, none with
//           Reduce flashing), the closing words, the door and the clear. Joyce's swing plays out under them, and she stays where she stands.
// The sim is not stepped from the event to the end of the swing. Its own flash and shake from that tick would hang over the frozen picture, so
// `calm` takes them out of the view meanwhile.
import type { ActorView, HeroId, SimEvent, SimView, Vec2 } from '../core/types.ts';

export type FinalRollEvent = Extract<SimEvent, { t: 'finalRoll' }>;

/** Frames Joyce runs for, and the length of her chop: the axe raised for 8, brought down for 6 and followed through for 12 (joycePoseOf). */
export const RUN_FRAMES = 62;
export const ATTACK_FRAMES = 26;
/** The frame, counted from the start of her run, the axe comes down: the beat fires here. */
export const STRIKE_AT = RUN_FRAMES + 9;
/** Her whole run-in, in frames: about a second and a half. */
export const JOYCE_FRAMES = RUN_FRAMES + ATTACK_FRAMES;
/** Where she starts, this far south of the spot she stops at, which is under the screen's bottom edge when the camera is on the body. */
export const RUN_FROM = 170;
/** How far in front of the body's feet she stops, and how far below them the camera looks, so the body and her both sit in the view. */
export const STOP_DY = 16;
export const LOOK_DY = 40;
/** The boom's white flash fades over this many frames. */
export const FLASH_FRAMES = 40;

export type EndPhase = 'idle' | 'roll' | 'joyce';

/** Where Joyce stops and where she starts, for a Mind Flayer body standing with its feet at `body`. */
export function joyceRoute(body: Vec2): { from: Vec2; to: Vec2 } {
  const to = { x: body.x, y: body.y + STOP_DY };
  return { from: { x: to.x, y: to.y + RUN_FROM }, to };
}

/** Joyce `t` frames into her run-in: running up to her spot, then the chop, then standing. Feet at x, y. */
export function joyceView(t: number, route: { from: Vec2; to: Vec2 }): ActorView {
  const base = { kind: 'npc', id: 'joyce', dir: 'up', flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null } as const;
  if (t < RUN_FRAMES) {
    const u = Math.max(0, t) / RUN_FRAMES;
    // The run steps twice as fast as a walk does.
    return { ...base, x: route.from.x, y: Math.round(route.from.y + (route.to.y - route.from.y) * u), anim: 'walk', t: t * 2 };
  }
  const at = t - RUN_FRAMES;
  return { ...base, x: route.to.x, y: route.to.y, anim: at < ATTACK_FRAMES ? 'attack' : 'idle', t: at };
}

/** The boom's flash `t` frames after the step: white to start, easing out. Zero with Reduce flashing, and after FLASH_FRAMES. */
export function flashAt(t: number, reduceFlashing: boolean): number {
  if (reduceFlashing || t < 0 || t >= FLASH_FRAMES) return 0;
  return (1 - t / FLASH_FRAMES) ** 2;
}

/** The view with the sim's frozen flash and shake taken out, and every actor's hit flash with them (it decays as the sim steps, so one caught
 * at the freeze would stay white all through the run-in): the frame the finale holds still. */
export const calm = (v: SimView): SimView => ({ ...v, flash: 0, shake: { x: 0, y: 0 }, actors: v.actors.map((a) => (a.flash > 0 ? { ...a, flash: 0 } : a)) });

export interface EndingDeps {
  /** Plays the Final Roll scene for these heroes with this roll over the frozen fight, and calls done once it is over and off the stack. */
  roll(e: FinalRollEvent, done: () => void): void;
  /** Hands the event to the director: the `level_clear` beat. */
  fire(e: FinalRollEvent): void;
  /** The Mind Flayer's body, where it kneels, or null when the view has none. */
  body(): Vec2 | null;
}

export interface Ending {
  /** The sim's `finalRoll` event: play stops. Only the first counts. */
  start(e: FinalRollEvent): void;
  /** The sim must not be stepped: the roll or Joyce's run is playing. */
  holds(): boolean;
  /** Anything of the ending is on screen or owed the camera (the roll, Joyce, or her standing after the chop). */
  on(): boolean;
  /** One update tick. Call it first, before a dialogue can hold the rest, so the swing and the flash play out under the closing words. */
  tick(): void;
  /** Joyce, while she is in the picture. */
  joyce(): ActorView | null;
  /** Where the camera looks while she is, or null. */
  focus(): Vec2 | null;
  /** The `boom` step ran: the flash starts. */
  boomed(): void;
  /** The white flash now, 0 to 1. */
  flash(reduceFlashing: boolean): number;
  /** The heroes of the roll, to name in a test. */
  heroes(): readonly HeroId[];
  /** A retry or a load: nothing of the ending is left. */
  clear(): void;
}

export function createEnding(deps: EndingDeps): Ending {
  let phase: EndPhase = 'idle';
  let event: FinalRollEvent | null = null;
  let route: { from: Vec2; to: Vec2 } | null = null;
  let look: Vec2 | null = null;
  /** Frames since the run began, and since the boom. */
  let t = 0;
  let boomT = -1;
  let fired = false;

  const reset = (): void => { phase = 'idle'; event = null; route = null; look = null; t = 0; boomT = -1; fired = false; };

  return {
    start(e) {
      if (phase !== 'idle' || event) return;
      event = e;
      phase = 'roll';
      deps.roll(e, () => {
        if (phase !== 'roll') return;
        const body = deps.body() ?? { x: 0, y: 0 };
        route = joyceRoute(body);
        look = { x: body.x, y: body.y + LOOK_DY };
        phase = 'joyce';
        t = 0;
      });
    },
    holds: () => phase === 'roll' || (phase === 'joyce' && !fired),
    on: () => phase !== 'idle',
    tick() {
      if (boomT >= 0) boomT++;
      if (phase !== 'joyce') return;
      t++;
      if (!fired && t >= STRIKE_AT && event) { fired = true; deps.fire(event); }
    },
    joyce: () => (phase === 'joyce' && route ? joyceView(t, route) : null),
    focus: () => (phase === 'joyce' ? look : null),
    boomed() { boomT = 0; },
    flash: (reduce) => flashAt(boomT, reduce),
    heroes: () => event?.heroes ?? [],
    clear: reset,
  };
}
