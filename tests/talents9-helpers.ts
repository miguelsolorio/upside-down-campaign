// Shared by the Lv 9 talent tests (talents9.test.ts and talents9-lives.test.ts). Not a test file.
import type { SimEvent } from '../src/core/types.ts';
import type { Enemy, Hero, S } from '../src/combat/state.ts';
import { idle, inp } from './sim-helpers.ts';

export const hero = (s: S, i: number): Hero => s.heroes[i] as Hero;
export const enemy = (s: S, i: number): Enemy => s.enemies[i] as Enemy;
export const floaters = (sim: { view(): { floaters: { text: string }[] } }, text: string): number => sim.view().floaters.filter((f) => f.text === text).length;
export const down = inp({ specialPressed: true, specialHeld: true, mx: 0.2 });
export const held = inp({ specialHeld: true, mx: 0.2 });

/** Holds Special for `n` frames from the press, without letting go. */
export function hold(sim: { step(i: ReturnType<typeof inp>): SimEvent[] }, n: number): SimEvent[] {
  const out = [...sim.step(down)];
  for (let i = 1; i < n; i++) out.push(...sim.step(held));
  return out;
}

/**
 * Takes a hero to 0 HP and steps until the sim has noticed (a KO, or an Extra life that left her at 1 HP). A bench hero's regen runs
 * first, so it is taken a little below, and a hit-stop from an earlier fall can hold the tick back a few frames.
 */
export function fell(sim: { step(i: ReturnType<typeof idle>): SimEvent[] }, h: Hero): SimEvent[] {
  h.hp = -1;
  const out: SimEvent[] = [];
  for (let i = 0; i < 12 && !h.ko && h.hp <= 0; i++) out.push(...sim.step(idle()));
  return out;
}
