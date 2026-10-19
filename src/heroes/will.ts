// Will, the Wizard. Basic: the sketch bolt, a slow arcane bolt in eight directions. Special: the Fireball, a ball that
// bursts where it ends (an enemy, a solid prop or the end of its flight) and is sized by a d20 from the sim's rng:
// radius 16 plus the roll. A 1 fizzles with no damage, a 20 doubles the radius. His Cold spot talent is cold.ts.
//
// What gfx sees: the bolt is a 'bolt' fx (w and h are its size, angle its heading). The ball in flight is a small 'flame'
// pointing the way it flies. The burst is a 'blast' fx whose w and h are the diameter.
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { BODY_Y, dist } from '../combat/space.ts';
import { addFx, flashScreen, floater, sfx, shake, sparks } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { beginAct, later } from './common.ts';

export function willBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.will.basic;
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, d.sfx);
  later(s, h, d.at, () => {
    const cx = Math.cos(aim), cy = Math.sin(aim);
    s.projs.push(newProj({
      kind: 'bolt', mine: true, x: h.x + cx * 4, y: h.y - BODY_Y + cy * 4, vx: cx * d.x.speed, vy: cy * d.x.speed,
      life: Math.round(d.reach / d.x.speed), r: d.x.r, by: h.id, power: d.power, kb: d.kb, ox: h.x, oy: h.y,
    }));
  });
}

/** The ball has ended its flight at (x, y): roll the d20 and burst. */
function burst(s: S, h: Hero, x: number, y: number): void {
  const d = HERO_DEFS.will.special;
  const roll = 1 + Math.floor(s.rng() * 20);
  if (roll === 1) {
    floater(s, 'FIZZLE', x, y - 12, 'mist', false, 44);
    sparks(s, x, y, 4);
    sfx(s, 'noMp');
    return;
  }
  const nat = roll === 20;
  const r = (d.x.base + roll) * (nat ? 2 : 1);
  addFx(s, 'blast', x, y, h.dir, 0, 16, r * 2, r * 2);
  sfx(s, 'candyPop');
  shake(s, nat ? 3 : 1.5);
  const reached = s.enemies.filter((e): e is Enemy => !e.dead && !e.dormant && e.hp > 0 && dist(x, y, e.x, e.y - BODY_Y) <= r + 4);
  for (const e of reached) {
    hitEnemy(s, h, e, { power: d.power, kb: d.kb, angle: Math.atan2(e.y - BODY_Y - y, e.x - x), noCrit: true, air: true });
  }
  if (nat) {
    floater(s, 'NAT 20', x, y - 12, 'yellow', true, 52);
    s.events.push({ t: 'natTwenty', hero: h.id, source: 'crit' });
    flashScreen(s, 0.3);
    sfx(s, 'crit');
  }
}

export function willSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.will.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, d.sfx);
  later(s, h, d.at, () => {
    const cx = Math.cos(aim), cy = Math.sin(aim);
    s.projs.push(newProj({
      kind: 'fireball', mine: true, x: h.x + cx * 4, y: h.y - BODY_Y + cy * 4, vx: cx * d.x.speed, vy: cy * d.x.speed,
      life: Math.round(d.reach / d.x.speed), r: d.x.r, by: h.id, power: d.power, kb: d.kb, ox: h.x, oy: h.y,
      end: (x, y) => burst(s, h, x, y),
    }));
  });
}
