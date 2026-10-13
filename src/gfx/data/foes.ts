// Enemies: the Lab agent (paper doll on agent.ts) and the rat (hand-drawn frames). Rows are 16 wide.
// Rat roles: d back fur, s fur, n ear, nose and tail, w belly, e eye, y teeth.
import type { CharSpec, Part, View } from './types.ts';

export const AGENT: CharSpec = {
  id: 'agent', body: 'agent', torso: 'plain', weapon: 'gun',
  pal: { s: 'grey1', a: 'yellow', b: 'amber', g: 'grey1', G: 'grey3', e: 'cyan', p: 'grey1', q: 'grey2', x: 'grey3', y: 'hot' },
  hair: { down: [], up: [], side: [] },
};

export type RatFrame = 'idle0' | 'idle1' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'attack0' | 'attack1' | 'hurt' | 'ko';

export const RAT_PAL = { d: 'soil1', s: 'soil2', n: 'pink', w: 'sand', e: 'hot', y: 'white' } as const;

const P = (y: number, rows: string[]): Part => ({ y, rows });

/** Belly-up, legs in the air. Shared by every view. */
const RAT_KO = P(9, [
  '...n..n..n..n...',
  '...s..s..s..s...',
  '..sswwwwwwwwss..',
  '.ssswwwwwwwwsss.',
  '..sdddddddddds..',
  '.nn...ey..ye....',
]);

const SIDE: Partial<Record<RatFrame, Part>> = {
  idle0: P(9, [
    '..........sn....',
    '.....dddddssss..',
    '....ddddddssesn.',
    '.nn.ddddddsssss.',
    'n..nwwwwwwwwwn..',
    '....s..s...s.s..',
  ]),
  idle1: P(9, [
    '...........sn...',
    '......ddddsssss.',
    '....dddddddsesn.',
    '.nn.dddddddssss.',
    'n..nwwwwwwwwwn..',
    '....s..s...s.s..',
  ]),
  walk0: P(9, [
    '..........sn....',
    '.....dddddssss..',
    '....ddddddssesn.',
    '.nn.ddddddsssss.',
    'n..nwwwwwwwwwn..',
    '...s.s.....s.s..',
  ]),
  walk1: P(9, [
    '..........sn....',
    '.....dddddssss..',
    '....ddddddssesn.',
    '.nn.ddddddsssss.',
    'n..nwwwwwwwwwn..',
    '....ss.....ss...',
  ]),
  walk2: P(9, [
    '..........sn....',
    '.....dddddssss..',
    '....ddddddssesn.',
    '.nn.ddddddsssss.',
    'n..nwwwwwwwwwn..',
    '.....s.s.s...s..',
  ]),
  walk3: P(9, [
    '..........sn....',
    '.....dddddssss..',
    '....ddddddssesn.',
    '.nn.ddddddsssss.',
    'n..nwwwwwwwwwn..',
    '....ss.....ss...',
  ]),
  attack0: P(8, [
    '...........sn...',
    '......dddddssss.',
    '.....ddddddssesy',
    '.nn.dddddddsssyy',
    'n..nwwwwwwwwwwn.',
    '...s.s......s.s.',
  ]),
  attack1: P(9, [
    '.........sn.....',
    '....dddddsssss..',
    '...dddddddsssey.',
    '.nn.dddddddsssyy',
    'n..nwwwwwwwwww..',
    '..ss.........ss.',
  ]),
  hurt: P(9, [
    '..........sn....',
    '....dddddsssss..',
    '...ddddddsseesn.',
    'nn.ddddddsssyyn.',
    '..nwwwwwwwwww...',
    '...s.s.....s.s..',
  ]),
  ko: RAT_KO,
};

/** Seen from the front and above: head toward the viewer, tail curling up behind. */
const FRONT: Partial<Record<RatFrame, Part>> = {
  idle0: P(3, [
    '..n.............',
    '...n............',
    '....n...........',
    '....dddddd......',
    '...dddddddd.....',
    '..nddddddddn....',
    '..nssddddssn....',
    '...sssssssss....',
    '...sessssses....',
    '....ssswwsss....',
    '.....sswwss.....',
    '......nwwn......',
  ]),
  idle1: P(3, [
    '..n.............',
    '..n.............',
    '...n............',
    '....dddddd......',
    '...dddddddd.....',
    '..nddddddddn....',
    '..nssddddssn....',
    '...sssssssss....',
    '...sessssses....',
    '....ssswwsss....',
    '.....sswwss.....',
    '......nwwn......',
  ]),
  walk0: P(3, [
    '..n.............',
    '...n............',
    '....n...........',
    '....dddddd......',
    '...dddddddd.....',
    '..nddddddddn....',
    '.snssddddssns...',
    '...sssssssss....',
    '...sessssses....',
    '....ssswwsss....',
    '.....sswwss.s...',
    '......nwwn......',
  ]),
  walk1: P(3, [
    '..n.............',
    '...n............',
    '....n...........',
    '....dddddd......',
    '...dddddddd.....',
    '..nddddddddn....',
    '..nssddddssns...',
    '.s.sssssssss....',
    '...sessssses....',
    '....ssswwsss....',
    '.s...sswwss.....',
    '......nwwn......',
  ]),
  attack0: P(3, [
    '.n..............',
    '..n.............',
    '...n............',
    '....dddddd......',
    '...dddddddd.....',
    '..nddddddddn....',
    '..nssddddssn....',
    '...sssssssss....',
    '...sessssses....',
    '....swyywyss....',
    '.....sywyss.....',
    '......nwwn......',
  ]),
  hurt: P(3, [
    '..n.............',
    '...n............',
    '....n...........',
    '....dddddd......',
    '...dddddddd.....',
    '.snddddddddns...',
    '..nssddddssn....',
    '...sssssssss....',
    '...syyssssyys...',
    '....ssswwsss....',
    '.....sswwss.....',
    '......nwwn......',
  ]),
  ko: RAT_KO,
};

/** Back view: the front frames flipped top to bottom, faces filled in with fur. */
function behind(set: Partial<Record<RatFrame, Part>>): Partial<Record<RatFrame, Part>> {
  const out: Partial<Record<RatFrame, Part>> = {};
  for (const k of Object.keys(set) as RatFrame[]) {
    const part = set[k] as Part;
    out[k] = k === 'ko' ? part : { y: part.y, rows: part.rows.slice().reverse().map((r) => r.replace(/[ewy]/g, 's')) };
  }
  return out;
}

export const RAT: Record<View, Partial<Record<RatFrame, Part>>> = { side: SIDE, down: FRONT, up: behind(FRONT) };
