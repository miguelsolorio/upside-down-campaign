// Every dialogue script for Level 14, stage 5.1 Hawkins under lockdown (docs/level-14.md). Stand-ins until World writes them. Pure data: no DOM,
// so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L14_SCRIPTS: DialogueScript[] = [
  script('l14_start', [line('hopper', 'Soldiers on Main Street. Of course.', 'determined'), line('hopper', 'Keep your heads down. The Lab is that way.')]),
  script('l14_clear', [line('hopper', "Gate's open. Let's finish this.", 'determined'), line('narrator', 'The loading bay goes quiet.')]),
];
