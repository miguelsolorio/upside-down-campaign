// Nancy's Molotov (Lv 6), her held Special (hold.ts): for 8 MP she lobs a bottle up to 64 px, aim-assisted like Robin's scoop, and it
// leaves a pool of fire 24 px round for 4 s. Every foe in it is hit every poolTick frames and set burning, the way Dustin's spray
// burns, and vines it reaches burn away, so from Lv 6 she opens the `burn` gate too (utilitiesAt in defs.ts).
//
// What gfx sees: the bottle in flight is a 'bottle' fx (view.ts, from the lobbed projectile). The pool is a 'fire' fx, w its diameter.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { dust, sfx, shake } from '../combat/fx.ts';
import { newProj } from '../combat/proj.ts';
import { BURN_PERIOD } from '../combat/status.ts';
import { beginAct, later } from './common.ts';
import { lobLanding } from './robin.ts';

/** The auto-aim of the throw: an enemy this far out and inside this cone (degrees) draws the bottle. */
const ASSIST = 80;
const CONE = 40;

/** Throws the bottle. The caller has taken the MP. */
export function throwMolotov(s: S, h: Hero): void {
  const d = HERO_DEFS.nancy.special;
  const aim = h.aim;
  beginAct(h, d, 'special');
  sfx(s, 'swing');
  later(s, h, d.at, () => {
    const ox = h.x, oy = h.y;
    const end = lobLanding(s, h, aim, d.x.molReach, ASSIST, CONE);
    const onLand = (): void => {
      sfx(s, 'flame');
      dust(s, end.x, end.y, 4);
      shake(s, 1);
      // The pool is a full circle at chest height over the spot, so updateZone (combat/proj.ts) measures it like a spray.
      s.zones.push({
        x: end.x, y: end.y - BODY_Y, angle: 0, r: d.x.poolR, half: Math.PI, age: 0, life: d.x.poolLife, tick: d.x.poolTick,
        power: d.x.poolPower, burn: d.x.poolBurn, burnTick: BURN_PERIOD, kb: 0, burnAtk: d.x.poolBurnAtk, by: h.id, cds: new Map(),
      });
    };
    s.projs.push(newProj({
      kind: 'bottle', mine: true, x: ox, y: oy, vx: 0, vy: 0, life: d.x.molLand, r: 3, by: h.id,
      lob: { sx: ox, sy: oy, ex: end.x, ey: end.y, onLand },
    }));
  });
}
