// Every dialogue script for Level 11, stage 4.2 the Hellfire Club and the Creel House (docs/level-11.md). Stand-ins until World writes them. Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L11_SCRIPTS: DialogueScript[] = [
  script('l11_start', [line('eddie', 'Pull up a chair. Tonight we play for keeps.', 'happy'), line('dustin', 'We came to talk about the curse.')]),
  script('l11_clear', [line('eddie', 'Out! We are out. Never again.', 'shocked'), line('max', 'Agreed.')]),
];
