// Level 16, stage 5.3 Vecna inside the Mind Flayer: the epilogue, `l16_basement` (docs/level-16.md, "The ending"). The basement in
// 1987, four years after the prologue's table and the same lamp over it. The party sits round the campaign: Mike behind the book,
// Dustin and Lucas beside him, Will and Max at the ends, Eleven in the near chair. Hawkins is still standing, and the last page is
// turned. Mike closes the book. Dustin rambles about the boss, Max cuts him off, Lucas admits the end feels smaller than four years,
// and Eleven answers in her short plain sentences. Will notices what is still in the corner: Eddie's guitar, and Dustin lets it stay.
// Mike's last line hands Will the die, the callback to the prologue, where his roll went wrong. The scene (story/epilogue_end.ts)
// rolls that die on the table as the music ends. Original, and nobody says goodbye in so many words. Pure data: no DOM, so Node can
// test it. Each line fits the dialogue box: three rows of 32 characters. Dialogue is off by default, and the epilogue skips itself
// with the story off.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The epilogue: the last page, a few friends at a table, the guitar in the corner, and one more roll. Mike has the first and last words. */
const L16_BASEMENT = script('l16_basement', [
  line('mike', "And that's the last page. I'm closing the book.", 'happy'),
  line('dustin', 'I want it noted that the final boss had far too many hit points.'),
  line('max', 'Noted, Dustin. Filed next to everything else you have explained.'),
  line('lucas', 'Four years at this table. I thought the end would feel bigger.'),
  line('eleven', 'It is not small. We are still here. That is big.', 'determined'),
  line('will', "Nobody has touched Eddie's guitar. I keep looking at the corner."),
  line('dustin', "Leave it. It's the best seat in the house, and it's his.", 'happy'),
  line('mike', 'Your roll, Will. Not for the game. For whatever comes next.', 'determined'),
]);

export const L16_SCRIPTS: DialogueScript[] = [L16_BASEMENT];
