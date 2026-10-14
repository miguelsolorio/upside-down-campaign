// URL flags. ?dev=1 opens the dev panel, ?bot=1 plays by itself, ?sheet=1 shows the sprite sheet,
// ?audio=1 shows the audio lab, ?skip=1 jumps past the title and prologue, ?stage=1.1 picks the stage,
// ?time=day or ?time=night draws the stage in that light whatever the stage says. ?title=1 to 5 shows a title variant.
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
  /** From ?title=N: which title screen variant to show. 0 is the original. */
  title: number;
  stage: string;
  /** From ?time=day or ?time=night. Null means the stage decides. */
  time: TimeOfDay | null;
  /** Comma list of hero ids from ?party=mike,dustin. */
  party: string[] | null;
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
    title: Number(q.get('title')) || 0,
    stage: q.get('stage') ?? '1.1',
    time: q.get('time') === 'day' || q.get('time') === 'night' ? (q.get('time') as TimeOfDay) : null,
    party: q.get('party')?.split(',').filter(Boolean) ?? null,
    level: Number(q.get('level')) || 0,
    seed: Number(q.get('seed')) || 1983,
  };
}

export const flags: Flags = parse();
