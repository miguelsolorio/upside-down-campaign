// What follows a stage's clear (docs/level-9.md, "The chapter end", and docs/level-16.md, "The ending"), as a list of steps for flow.ts to play
// one after another. Pure, so Node can test the chain without a screen.
//   A chapter's last stage, the first time it is cleared, plays that chapter's epilogue before its results, unless the story is off.
//   The campaign's last stage (5.3), the first time it is cleared, plays THE END after the epilogue and before its results, story or no story:
//   with the story off the epilogue is skipped and THE END still comes, and plays the ending's music itself.
//   A replay of either goes straight to the results. The results are always the last step, and lead to the map.
import { endsCampaign } from './ui/format.ts';

export type EndStep = 'epilogue' | 'theEnd' | 'results';

export interface EndInput {
  /** The stage just cleared. */
  stage: string;
  /** It was not on the map's cleared list before this clear. */
  firstClear: boolean;
  /** The chapter the stage closes, or undefined for a stage that closes none. */
  chapter: number | undefined;
  /** That chapter has an epilogue with words in it (story/epilogue.ts). */
  hasEpilogue: boolean;
  /** The story is on: neither the skip-story setting nor ?rush=1 is. */
  story: boolean;
}

/** The steps after a clear, in order, ending with the results. */
export function endChain(o: EndInput): EndStep[] {
  const out: EndStep[] = [];
  if (o.firstClear && o.chapter !== undefined && o.hasEpilogue && o.story) out.push('epilogue');
  if (o.firstClear && endsCampaign(o.stage)) out.push('theEnd');
  out.push('results');
  return out;
}

/** The first clear of a chapter's last stage has an epilogue that the story being off skipped: flow.ts still silences the stage's music, as the
 * epilogue's own scene does when it enters. */
export const skippedEpilogue = (o: EndInput): boolean => o.firstClear && o.chapter !== undefined && o.hasEpilogue && !o.story;

/** What plays each step: it shows the scene and calls `next` when the scene is over. */
export type Makers = Record<EndStep, (next: () => void) => void>;

/** Plays the steps in order, each starting when the one before calls its `next`. */
export function runChain(steps: readonly EndStep[], makers: Makers): void {
  const [step, ...rest] = steps;
  if (step !== undefined) makers[step](() => runChain(rest, makers));
}
