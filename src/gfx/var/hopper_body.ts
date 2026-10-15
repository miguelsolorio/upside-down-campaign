// The big body for Hopper: the adult head on a ten pixel torso with a belly in profile, three pixel legs and arms the
// compose.ts rig draws two pixels thick. It is a BodyDef, so a chosen design adds it to BODIES in actor_pose.ts as a
// fourth body. Poses and anchors follow the adult body; only the widths change.
import type { BodyDef, LegPose, Part } from '../data/types.ts';
import { ADULT } from '../data/adult.ts';

const P = (y: number, ...rows: string[]): Part => ({ y, rows });
const torsoFront = P(8, '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...');

const front: Record<LegPose, Part> = {
  stand: P(11, '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....fff..fff....'),
  stepA: P(11, '....ppp..ppp....', '....ppp..ppp....', '....ppp..fff....', '....fff.........'),
  stepB: P(11, '....ppp..ppp....', '....ppp..ppp....', '....fff..ppp....', '.........fff....'),
  wide: P(11, '...ppp....ppp...', '...ppp....ppp...', '...ppp....ppp...', '...fff....fff...'),
};
const side: Record<LegPose, Part> = {
  stand: P(11, '.....ppppp......', '.....ppppp......', '.....ppppp......', '.....ffffff.....'),
  stepA: P(11, '.....ppppp......', '.....ppppp......', '....qqq...ppp...', '...fff.....fff..'),
  stepB: P(11, '.....ppppp......', '.....ppppp......', '....ppp...qqq...', '...fff.....fff..'),
  wide: P(11, '....ppppppp.....', '...qqq....ppp...', '..qqq......ppp..', '.fff.......ffff.'),
};

const armsFront = (upView: boolean): BodyDef['arms']['down'] => ({
  rest: [[3, 11], [12, 11]],
  swingA: [[3, 10], [12, 12]],
  swingB: [[3, 12], [12, 10]],
  windup: [[3, 11], [14, 5]],
  strike: [[3, 11], upView ? [7, 4] : [9, 12]],
  raise: [[1, 6], [14, 6]],
  thrust: upView ? [[3, 8], [12, 8]] : [[7, 10], [8, 10]],
  back: [[2, 10], [13, 10]],
  flail: [[1, 9], [14, 9]],
});

export const BIG: BodyDef = {
  ...ADULT,
  torso: {
    down: torsoFront,
    up: torsoFront,
    side: P(8, '.....aaaaaa.....', '.....aaaaaaa....', '.....aaaaaaa....', '.....aaaaaa.....'),
  },
  legs: { down: front, up: front, side },
  shoulder: { down: [[3, 8], [12, 8]], up: [[3, 8], [12, 8]], side: [[7, 8], [8, 8]] },
  arms: { down: armsFront(false), up: armsFront(true), side: ADULT.arms.side },
};
