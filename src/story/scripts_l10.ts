// Every dialogue script for Level 10, stage 4.1 Kamchatka (docs/level-10.md). Stand-ins until World writes them. Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L10_SCRIPTS: DialogueScript[] = [
  script('l10_start', [line('hopper', 'Cold. Always cold here.', 'worried'), line('hopper', 'Lights from home. Okay, Joyce.')]),
  script('l10_clear', [line('hopper', "Stay down. I've got somewhere to be.", 'determined'), line('narrator', 'The pit goes quiet.')]),
];
