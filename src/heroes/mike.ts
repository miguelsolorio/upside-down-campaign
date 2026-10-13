// Mike, the Paladin. Bat: a three-hit wide arc, the third swing stuns. Special: the DM screen.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';

export function mikeBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.mike.basic;
  const third = h.combo === 2;
  const power = d.power * (third ? d.x.thirdPower : 1);
  const reach = d.reach + (third ? d.x.thirdReach : 0);
  const half = rad(d.x.half + (third ? d.x.thirdHalf : 0));
  const kb = d.kb * (third ? d.x.thirdKb : 1);
  const aim = h.aim;
  beginAct(h, d, 'basic', third ? { dur: d.x.thirdDur, cd: d.x.thirdCd } : {});
  if (third) { h.combo = 0; h.comboT = 0; } else { h.combo++; h.comboT = d.cd + d.x.chainGap; }
  sfx(s, 'swing');
  later(s, h, third ? d.x.thirdAt : d.at, () => {
    addFx(s, 'slash', h.x, h.y - BODY_Y, h.dir, aim, third ? 12 : 9, reach, chord(reach, half));
    coneHits(s, h, aim, reach, half, (e, a) => {
      hitEnemy(s, h, e, {
        power, kb, angle: a, stun: third ? d.x.stun : 0, stagger: third ? 18 : undefined,
        hitstop: third ? 4 : undefined, shake: third ? 1.6 : undefined,
      });
    });
  });
}

export function mikeSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.mike.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'shield');
  later(s, h, d.at, () => {
    s.shield = {
      x: h.x + Math.cos(aim) * d.reach,
      y: h.y - BODY_Y + Math.sin(aim) * d.reach,
      angle: aim, half: d.x.half, age: 0, life: d.x.life,
    };
  });
}
