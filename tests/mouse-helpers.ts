// Shared by the mouseplay tests: a tick the way play.ts will build it, a step of the real sim, and a hand-made view for the cases a
// live sim cannot hold still.
import { footOf } from '../src/world/mousepick.ts';
import { NO_TICK } from '../src/world/mouseplay.ts';
import type { MouseGoal, MousePlay, MouseTick } from '../src/world/mouseplay.ts';
import { idle } from './sim-helpers.ts';
import type {
  ActorView, EnemyKind, HeroId, HudView, PartyHud, PropView, Sim, SimInput, SimView, Vec2,
} from '../src/core/types.ts';

export const click = (go: MouseGoal | 'stop'): MouseTick => ({ ...NO_TICK, go });
export const walkTo = (x: number, y: number): MouseTick => click({ kind: 'walk', x, y });
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** One tick the way play.ts will do it: drive from the keys and the mouse, step the sim with what comes back. */
export function step(sim: Sim, mouse: MousePlay, tick: MouseTick = NO_TICK, keys: SimInput = idle()): SimInput {
  const out = mouse.drive(keys, tick, sim.view(), sim.heroPos());
  sim.step(out);
  return out;
}

/** Steps until the marker is no longer live. Returns the ticks it took, or -1 when it was still live after `max`. */
export function until(sim: Sim, mouse: MousePlay, first: MouseTick, max: number): number {
  step(sim, mouse, first);
  for (let i = 1; i <= max; i++) {
    if (!mouse.marker()?.live) return i;
    step(sim, mouse);
  }
  return mouse.marker()?.live ? -1 : max;
}

/** An interior wall at x = 12 over the tiles in [y0, y1]. */
export function wall(y0: number, y1: number, gap: number[] = []): Record<string, string> {
  const marks: Record<string, string> = {};
  for (let y = y0; y <= y1; y++) if (!gap.includes(y)) marks[`12,${y}`] = 'T';
  return marks;
}

export const foeOf = (sim: Sim, id: EnemyKind): ActorView | undefined => sim.view().actors.find((a) => a.kind === 'enemy' && a.id === id);
export const attack = (a: ActorView): MouseTick => click({ kind: 'attack', id: a.id as EnemyKind, ...footOf(a) });

export function actor(kind: ActorView['kind'], id: string, x: number, y: number, over: Partial<ActorView> = {}): ActorView {
  return {
    kind, id, x, y, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null,
    ...over,
  } as ActorView;
}

export interface StubOpts { hero?: HeroId; level?: number; ko?: boolean; solo?: boolean; ready?: boolean; foes?: ActorView[]; props?: PropView[] }

/** A hand-made view: one active hero, the foes given, and a HUD with the few fields the driver reads. */
export function stub(o: StubOpts = {}): SimView {
  const me = { id: o.hero ?? 'mike', level: o.level ?? 1, ko: o.ko ?? false, active: true } as PartyHud;
  const hud = { party: [me], burst: 0, burstReady: o.ready ?? false, solo: o.solo ? { t: 0, life: 1, streak: 0, ring: 0, beat: 0 } : null } as unknown as HudView;
  return {
    actors: o.foes ?? [], fx: [], items: [], props: o.props ?? [], hazards: [], pools: [], floaters: [], hud, focus: { x: 0, y: 0 },
    shake: { x: 0, y: 0 }, flash: 0,
  };
}
