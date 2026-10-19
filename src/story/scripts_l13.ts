// Every dialogue script for Level 13, stage 4.4 Vecna's lair (docs/level-13.md). Stand-ins until World writes them. Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L13_SCRIPTS: DialogueScript[] = [
  script('l13_start', [line('nancy', 'The Creel House. His house.', 'determined'), line('max', 'Then we end it here.', 'determined')]),
  script('l13_clear', [line('vecna', 'This is not the end.', 'hurt'), line('mike', 'It is for tonight.', 'determined')]),
];
