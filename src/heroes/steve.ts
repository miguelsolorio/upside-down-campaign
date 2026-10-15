// Steve, the Fighter. Basic: the nail bat, a three-hit chain like Mike's, slower and heavier, with a heavy third that throws
// the enemy. Any swing that reaches a crack breaks it. Special: Babysit, a taunt pulse. Enemies inside it are taunted onto
// him for 3 s (Enemy.taunt, which the defense's targeting reads), he takes 40 percent less damage for 5 s and the whole
// party's DEF is up 15 percent (steve_guard.ts). Hair of steel (Lv 3) is in steve_guard.ts too.
//
// What gfx sees: a 'taunt' fx at his feet, a ring that grows to w, the pulse's diameter.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y, dist } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { alertEnemy, hitEnemy } from '../combat/damage.ts';
import { smashCracks } from '../combat/props.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';

/** How much wider than the swing's arc a crack still counts as reached, in radians. */
const CRACK_SLACK = 0.3;

export function steveBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.steve.basic;
  const third = h.combo === 2;
  const power = d.power * (third ? d.x.thirdPower : 1);
  const reach = d.reach + (third ? d.x.thirdReach : 0);
  const half = rad(d.x.half);
  const kb = d.kb * (third ? d.x.thirdKb : 1);
  const aim = h.aim;
  beginAct(h, d, 'basic', third ? { dur: d.x.thirdDur, cd: d.x.thirdCd } : {});
  if (third) { h.combo = 0; h.comboT = 0; } else { h.combo++; h.comboT = d.cd + d.x.chainGap; }
  sfx(s, 'swing');
  later(s, h, third ? d.x.thirdAt : d.at, () => {
    addFx(s, 'slash', h.x, h.y - BODY_Y, h.dir, aim, third ? 12 : 9, reach, chord(reach, half));
    smashCracks(s, h, aim, reach, half + CRACK_SLACK);
    coneHits(s, h, aim, reach, half, (e, a) => {
      hitEnemy(s, h, e, {
        power, kb, angle: a, stagger: third ? 20 : undefined, hitstop: third ? 4 : undefined, shake: third ? 1.8 : undefined,
      });
    });
  });
}

export function steveSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.steve.special;
  beginAct(h, d, 'special');
  sfx(s, 'taunt');
  later(s, h, d.at, () => {
    addFx(s, 'taunt', h.x, h.y, h.dir, 0, 24, d.reach * 2, d.reach);
    for (const e of s.enemies) {
      if (e.dead || e.dormant || e.hp <= 0 || dist(h.x, h.y, e.x, e.y) > d.reach) continue;
      e.taunt = d.x.taunt;
      alertEnemy(s, e);
    }
    s.babysit = d.x.life;
  });
}
