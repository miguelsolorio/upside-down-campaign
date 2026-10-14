// The order of the stages and what carries from one to the next. Pure and DOM-free so Node tests can run it.
// flow.ts uses it to decide where a cleared stage leads and who walks in.
import type { HeroId, HeroSnapshot, PartySeed } from './types.ts';

/** Stage ids in play order. The last one ends this build with the feedback note. */
export const STAGE_ORDER: readonly string[] = ['1.1', '1.2'];

/** The stage after `id`, or null when `id` is the last one (or unknown). */
export function nextStage(id: string): string | null {
  const i = STAGE_ORDER.indexOf(id);
  return i >= 0 && i + 1 < STAGE_ORDER.length ? (STAGE_ORDER[i + 1] as string) : null;
}

export const isFinalStage = (id: string): boolean => nextStage(id) === null;

/** Stage numbers as shown to the player: "1.2" is level 2 of this build. */
export function levelNumber(id: string): number {
  const i = STAGE_ORDER.indexOf(id);
  return i >= 0 ? i + 1 : 1;
}

const FRESH: HeroId[] = ['mike', 'dustin', 'lucas'];
/** What a jump straight to a stage (?stage=1.2) starts with: who has joined by then, at the level a normal run arrives. */
const ARRIVAL: Record<string, PartySeed[]> = {
  '1.1': FRESH.map((id) => ({ id })),
  '1.2': [...FRESH, 'eleven' as const].map((id) => ({ id, level: 3 })),
};

/** The party a stage begins with when nothing is carried over (new game, ?stage=, START OVER on the first stage). */
export function defaultParty(id: string): PartySeed[] {
  return (ARRIVAL[id] ?? (ARRIVAL['1.1'] as PartySeed[])).map((s) => ({ ...s }));
}

/** A cleared stage's party as the next stage's seeds: levels, XP and d20 bonus carry, health does not. */
export function seedsFrom(party: HeroSnapshot[]): PartySeed[] {
  return party.map((p) => ({ id: p.id, level: p.level, xp: p.xp, bonus: p.bonus ? { ...p.bonus } : undefined }));
}
