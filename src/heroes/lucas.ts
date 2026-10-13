// Lucas, the Ranger. Basic: the wrist rocket, eight-way. Special: triple shot. His `shoot` utility lights targets.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { newProj } from '../combat/proj.ts';
import { beginAct, later, rad } from './common.ts';

function fire(s: S, h: Hero, angle: number, power: number, kb: number, speed: number, range: number, r: number): void {
  s.projs.push(newProj({
    kind: 'rock', mine: true,
    x: h.x + Math.cos(angle) * 4, y: h.y - BODY_Y + Math.sin(angle) * 4,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    life: Math.round(range / speed), r, by: h.id, power, kb, util: 'shoot', ox: h.x, oy: h.y,
  }));
}

export function lucasBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.lucas.basic;
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'rock');
  later(s, h, d.at, () => fire(s, h, aim, d.power, d.kb, d.x.speed, d.reach, d.x.r));
}

export function lucasSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.lucas.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'rock');
  later(s, h, d.at, () => {
    const n = d.x.n;
    for (let i = 0; i < n; i++) {
      fire(s, h, aim + rad(d.x.fan) * (i - (n - 1) / 2), d.power, d.kb, d.x.speed, d.reach, d.x.r);
    }
  });
}
