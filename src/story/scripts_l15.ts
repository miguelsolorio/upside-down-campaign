// Every dialogue script for Level 15, stage 5.2 the Abyss (docs/level-15.md). Stand-ins until World writes them. Pure data: no DOM, so Node can
// test it. Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L15_SCRIPTS: DialogueScript[] = [
  script('l15_start', [line('narrator', 'The gate closes behind you.'), line('will', 'I can feel the way. Stay close.', 'determined')]),
  script('l15_clear', [line('will', 'I can feel where it ends. Come on.', 'determined'), line('narrator', 'The rock goes still.')]),
];
