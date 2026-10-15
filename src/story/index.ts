// PUBLIC API of story. Owner: Story agent.
// SCRIPTS holds every dialogue script by id (ids are listed in docs/level-1.md). bark() returns a one-liner or null.
// The words live in scripts.ts, prologue_script.ts and barks.ts (pure data, safe in Node). The basement scene is prologue.ts.
import type { Scene } from '../core/scene.ts';
import type { BarkEvent, DialogueScript, HeroId } from '../core/types.ts';
import { pickBark } from './barks.ts';
import { createPrologueScene as buildPrologueScene } from './prologue.ts';
import { createEpilogueScene as buildEpilogueScene, hasEpilogue as epilogueFor } from './epilogue.ts';
import { SCRIPTS as scripts } from './scripts.ts';

export const SCRIPTS: Record<string, DialogueScript> = scripts;

/**
 * A short in-character line for this hero and event, picked by level tier. Null = stay quiet.
 * For levelUp, level is the level just reached (there are exact lines for 2 and 3, then a fallback).
 * Variants cycle in a fixed order. Short lines are 22 characters or fewer; level-up lines run to 64.
 */
export function bark(who: HeroId, event: BarkEvent, level: number): string | null {
  return pickBark(who, event, level);
}

/** The basement scene: Mike, Dustin, Lucas and Will mid-campaign, Will's spell roll goes wrong. */
export function createPrologueScene(opts: { onDone(): void }): Scene {
  return buildPrologueScene(opts);
}

/** True when chapter `n` ends on an epilogue (chapter three: Hopper's letter). */
export function hasEpilogue(n: number): boolean {
  return epilogueFor(n);
}

/** A chapter's epilogue, played after its last stage's clear and before its results (docs/level-9.md). */
export function createEpilogueScene(opts: { chapter: number; onDone(): void }): Scene {
  return buildEpilogueScene(opts);
}
