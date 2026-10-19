// ?finale=1: the ending on its own, to see and hear it without playing 5.3 (docs/development.md). The Final Roll for a sample party of
// four, then the basement epilogue (the story is on for this hook, and ?rush=1 skips it), then THE END, and round again. ?seed=N
// changes the dice, and ?finale=plain, big or gold takes the first seed from there whose roll ends that way. Loaded on demand from
// main.ts, so none of it is in the game's own bundle path. 5.3's clear is meant to chain the same three scenes.
import type { Game } from '../core/scene.ts';
import type { HeroId } from '../core/types.ts';
import { createRng } from '../core/rng.ts';
import { settings } from '../core/settings.ts';
import { createEpilogueScene } from '../story/index.ts';
import { createFinalRollScene } from './finalroll.ts';
import { seedFor } from './finalroll_logic.ts';
import { createTheEndScene } from './theend.ts';

/** Chapter five's pick: Eleven and Will are locked in, and two more. */
export const SAMPLE_PARTY: readonly HeroId[] = ['eleven', 'will', 'mike', 'dustin'];

/** The seed to play: the one given, or for a named finish the first seed from there that ends that way. */
export function finaleSeed(mode: 'any' | 'plain' | 'big' | 'gold', seed: number): number {
  if (mode === 'any') return seed;
  return seedFor(SAMPLE_PARTY, mode, seed, createRng) ?? seed;
}

export function startFinaleDev(g: Game): void {
  // The hook shows the whole ending, so the story is on for this page load (in memory only, never saved). ?rush=1 still skips it.
  settings.skipDialogue = false;
  const mode = g.flags.finale ?? 'any';
  const seed = finaleSeed(mode, g.flags.seed);
  const again = (): void => startFinaleDev(g);
  g.scenes.go(createFinalRollScene({
    heroes: SAMPLE_PARTY,
    rng: createRng(seed),
    opaque: true,
    onDone: (roll) => {
      console.info(`finale: seed ${seed}, total ${roll.total}, ${roll.finish}`, roll.rolls.map((r) => `${r.hero} ${r.dice.join('/')}`));
      g.scenes.go(createEpilogueScene({ chapter: 5, onDone: () => g.scenes.go(createTheEndScene({ onDone: again })) }));
    },
  }));
}
