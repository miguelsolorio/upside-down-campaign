// Nancy, the Gunslinger. Basic: Pistol, a steady single shot in eight directions. Special: Shotgun, five pellets across a 50 degree
// cone with a heavy shove. Trap kit (Lv 3): each Shotgun also drops a bear trap at her feet, at most two at once. The first non-boss
// enemy that steps on one is held and hit. Her `shoot` utility (lighting targets) rides on every round, as Lucas's does.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y, dist } from '../combat/space.ts';
import { addFx, dust, floater, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { isBoss } from '../combat/confuse.ts';
import { newProj } from '../combat/proj.ts';
import { hasTalent } from '../progression/talents.ts';
import { beginAct, later, rad } from './common.ts';

interface Round { power: number; kb: number; speed: number; reach: number; r: number; kbCap?: number }

function fire(s: S, h: Hero, angle: number, o: Round): void {
  s.projs.push(newProj({
    kind: 'bullet', mine: true,
    x: h.x + Math.cos(angle) * 4, y: h.y - BODY_Y + Math.sin(angle) * 4,
    vx: Math.cos(angle) * o.speed, vy: Math.sin(angle) * o.speed,
    life: Math.round(o.reach / o.speed), r: o.r, by: h.id, power: o.power, kb: o.kb, kbCap: o.kbCap, util: 'shoot', ox: h.x, oy: h.y,
  }));
}

export function nancyBasic(s: S, h: Hero): void {
  const d = HERO_DEFS.nancy.basic;
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'pistol');
  later(s, h, d.at, () => fire(s, h, aim, { power: d.power, kb: d.kb, speed: d.x.speed, reach: d.reach, r: d.x.r }));
}

/** Puts a trap at her feet. A third one takes the oldest away. */
function dropTrap(s: S, h: Hero): void {
  const d = HERO_DEFS.nancy.special;
  while (s.traps.length >= d.x.traps) s.traps.shift();
  s.traps.push({ x: h.x, y: h.y, age: 0, life: d.x.trapLife, by: h.id });
  dust(s, h.x, h.y, 2);
}

export function nancySpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.nancy.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'shotgun');
  later(s, h, d.at, () => {
    const n = d.x.n;
    const round = { power: d.power, kb: d.kb, speed: d.x.speed, reach: d.reach, r: d.x.r, kbCap: d.x.kbCap };
    for (let i = 0; i < n; i++) fire(s, h, aim + rad(d.x.fan) * (i - (n - 1) / 2), round);
    // The muzzle flash.
    for (let i = 0; i < 3; i++) {
      const a = aim + (s.frng() - 0.5) * 0.7;
      addFx(s, 'spark', h.x + Math.cos(aim) * 8 + Math.cos(a) * 3, h.y - BODY_Y + Math.sin(aim) * 8 + Math.sin(a) * 3, h.dir, a, 8 + i * 2);
    }
    if (hasTalent('nancy', h.level)) dropTrap(s, h);
  });
}

/**
 * Ages the bear traps. One whose feet-distance to a non-boss enemy is within trapR springs: the enemy is held (it can't move or
 * attack, the same as a stun) and takes the trap's hit, and the trap is gone. A boss walks over it.
 */
export function updateTraps(s: S): void {
  if (s.traps.length === 0) return;
  const d = HERO_DEFS.nancy.special;
  const keep: typeof s.traps = [];
  for (const t of s.traps) {
    t.age++;
    if (t.age >= t.life) continue;
    const by = s.heroes.find((x) => x.id === t.by);
    const e = by ? s.enemies.find((o) => !o.dead && !o.dormant && o.hp > 0 && !isBoss(o) && dist(t.x, t.y, o.x, o.y) <= d.x.trapR) : undefined;
    if (!by || !e) { keep.push(t); continue; }
    hitEnemy(s, by, e, { power: d.x.trapPower, kb: 0, stun: d.x.hold, noCrit: true, sfx: 'bash' });
    floater(s, 'TRAPPED', e.x, e.y - 24, 'amber', false, 36);
    dust(s, t.x, t.y, 4);
  }
  s.traps = keep;
}
