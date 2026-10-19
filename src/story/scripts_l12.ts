// Every dialogue script for Level 12, stage 4.3 Upside Down Hawkins (docs/level-12.md). Stand-ins until World writes them. Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

export const L12_SCRIPTS: DialogueScript[] = [
  script('l12_start', [line('dustin', 'Everything is upside down. Stay close.', 'worried'), line('eddie', 'Close. Yes. Very close.', 'worried')]),
  script('l12_solo', [line('eddie', 'Go. I will give them a show.', 'determined'), line('mike', 'Eddie, no!', 'shocked')]),
  script('l12_fall', [line('dustin', 'Eddie? Eddie!', 'shocked'), line('narrator', 'The song is over.')]),
];
