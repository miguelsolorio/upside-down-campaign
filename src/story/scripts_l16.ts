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

// The stage's own scripts (stage 5.3, docs/level-16.md). Stand-ins until World writes them: a line or two each, in the order the beats play them.
const L16_STAGE: DialogueScript[] = [
  script('l16_start', [line('narrator', 'The Abyss narrows into flesh. It is breathing.'), line('eleven', 'It is close. I can feel it.', 'determined')]),
  script('l16_burn_hint', [line('will', 'Vines across the way. Fire would clear them.'), line('narrator', 'They shift when you come near.')]),
  script('l16_burn_done', [line('will', 'That is the last of the vines.'), line('eleven', 'Keep going. It is waiting.')]),
  script('l16_antechamber', [line('narrator', 'A string of lights, hung on the wall of the heart.'), line('eleven', 'Whatever happens, we do it together.')]),
  script('l16_vecna', [line('narrator', 'Vecna stands in the middle of the arena.'), line('will', 'He is waiting for us.', 'determined')]),
  script('l16_spider', [line('narrator', 'Vecna sinks. The Mind Flayer rises with him inside it.'), line('eleven', 'Hit its legs. Then the chest.')]),
  script('l16_channel', [line('eleven', 'Will. Now.', 'determined'), line('will', 'Hold the line, everyone.', 'determined')]),
  script('l16_clear', [line('narrator', 'Joyce comes out of the dark with her axe.'), line('narrator', 'The heart goes still.')]),
];

export const L16_SCRIPTS: DialogueScript[] = [L16_BASEMENT, ...L16_STAGE];
