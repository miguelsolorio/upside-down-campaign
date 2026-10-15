// Max, the Monk. Basic: the Board, a quick two-hit arc, the second hit harder. Special: the Skate dash (skate.ts), a roll
// along her aim that passes over gaps. The High score talent (Lv 3: +10 percent quarter drops, +5 percent crit) lives in
// kills.ts and defs.ts (critChance).
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';
import { castSkate } from './skate.ts';

export function maxBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.max.basic;
  const second = h.combo === 1;
  const power = d.power * (second ? d.x.secondPower : 1);
  const half = rad(d.x.half);
  const aim = h.aim;
  beginAct(h, d, 'basic', second ? { dur: d.x.secondDur, cd: d.x.secondCd } : {});
  if (second) { h.combo = 0; h.comboT = 0; } else { h.combo = 1; h.comboT = d.cd + d.x.chainGap; }
  sfx(s, 'swing');
  later(s, h, second ? d.x.secondAt : d.at, () => {
    addFx(s, 'slash', h.x, h.y - BODY_Y, h.dir, aim, second ? 10 : 8, d.reach, chord(d.reach, half));
    coneHits(s, h, aim, d.reach, half, (e, a) => {
      hitEnemy(s, h, e, { power, kb: d.kb, angle: a, stagger: second ? 14 : undefined });
    });
  });
}

export function maxSpecial(s: S, h: Hero): void {
  castSkate(s, h);
}
