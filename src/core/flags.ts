// URL flags. ?dev=1 opens the dev panel, ?bot=1 plays by itself, ?sheet=1 shows the sprite sheet,
// ?audio=1 shows the audio lab, ?skip=1 jumps past the title and prologue, ?stage=1.1 picks the stage,
// ?time=day or ?time=night draws the stage in that light whatever the stage says.
import type { TimeOfDay } from './types.ts';

export interface Flags {
  dev: boolean;
  bot: boolean;
  sheet: boolean;
  audio: boolean;
  mute: boolean;
  god: boolean;
  skip: boolean;
  /** ?rush=1: skip the title, the prologue, the chapter card and every dialogue box. */
  rush: boolean;
  stage: string;
  /** From ?time=day or ?time=night. Null means the stage decides. */
  time: TimeOfDay | null;
  /** Comma list of hero ids from ?party=mike,dustin. */
  party: string[] | null;
  /** ?touch=1: start with the touch controls on, even with a mouse. */
  touch: boolean;
  /** From ?level=3. 0 means "use the default". */
  level: number;
  seed: number;
}

function parse(): Flags {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const on = (k: string): boolean => q.has(k) && q.get(k) !== '0';
  return {
    dev: on('dev'),
    bot: on('bot'),
    sheet: on('sheet'),
    audio: on('audio'),
    mute: on('mute'),
    god: on('god'),
    skip: on('skip') || on('rush'),
    rush: on('rush'),
    stage: q.get('stage') ?? '1.1',
    time: q.get('time') === 'day' || q.get('time') === 'night' ? (q.get('time') as TimeOfDay) : null,
    party: q.get('party')?.split(',').filter(Boolean) ?? null,
    touch: on('touch'),
    level: Number(q.get('level')) || 0,
    seed: Number(q.get('seed')) || 1983,
  };
}

export const flags: Flags = parse();
