// A memory orb (docs/level-13.md, "Vecna"): one of the four red bulbs on vine stalks round Vecna's attic, rooted, harmless (ATK 0) and open to
// anyone's hit. Each standing orb heals Vecna (enemies/vecna.ts).
//
//   broken: at 0 HP it is not killed. It stays as a stalk (pose 'severed'), can't be hit, doesn't heal, and the `orb` sfx sounds. If a curse
//     marked it (combat/curse.ts, Curse.orb) that curse is lifted, { t: 'curseEnd', how: 'orb' }; and in Float it pulls Vecna to the floor.
//   regrown: x.regrow frames (1200) after it broke it is whole again at full HP.
//   gone with him: when Vecna's HP reaches 0 every orb goes with him in the same pass, so `groupCleared` fires once for the group and a retry's
//     kill list never holds an orb by itself (the Mind Flayer's legs do the same).
// A hit never moves it, staggers it or stuns it; Word vomit and traps do nothing to it (combat/confuse.ts).
import type { ActorView } from '../core/types.ts';
import type { Enemy, OrbState, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { dust, floater, sfx, shake, sparks } from '../combat/fx.ts';
import { liftOrbCurse } from '../combat/curse.ts';
import { xOf } from './defs.ts';
import { pullDown } from './vecna_phase.ts';

/** The pose gfx draws: the stalk once it is broken. */
export const orbPose = (o: OrbState): ActorView['pose'] => (o.broken ? 'severed' : undefined);

/** A broken orb waits on the floor while its Vecna lives, at 0 HP and not dead: the reaper leaves it alone. */
export const orbHeld = (e: Enemy): boolean =>
  e.orb !== null && e.orb.broken && !(e.orb.body !== null && (e.orb.body.dead || e.orb.body.hp <= 0));

/** The hit or burn tick that took an orb to 0 HP: it breaks. Called after every hit and burn tick. */
export function orbBreak(s: S, e: Enemy): void {
  const o = e.orb;
  if (!o || o.broken || e.hp > 0) return;
  o.broken = true;
  o.t = xOf(e).regrow as number;
  e.hp = 0;
  e.stagger = 0;
  e.stat.burn = 0;
  sfx(s, 'orb');
  shake(s, 3);
  sparks(s, e.x, e.y - BODY_Y, 5);
  dust(s, e.x, e.y, 4);
  floater(s, 'BROKEN', e.x, e.y - 24, 'yellow', true, 60);
  liftOrbCurse(s, e.id);
  if (o.body) pullDown(s, o.body);
}

/** One frame of every awake orb: a broken one counts down and grows back at full HP. */
export function tickOrbs(s: S): void {
  for (const e of s.enemies) {
    const o = e.orb;
    if (!o || !o.broken || e.dead || e.dormant) continue;
    if (--o.t > 0) continue;
    o.broken = false;
    e.hp = e.hpMax;
    e.hurtSeen = false;
    e.flash = 0;
    dust(s, e.x, e.y, 5);
    floater(s, 'REGROWN', e.x, e.y - 24, 'hot', false, 40);
  }
}

/** Vecna is at 0 HP: his orbs go with him, so they are all killed in the same pass. Called at the top of reapEnemies. */
export function doomOrbs(s: S): void {
  for (const b of s.enemies) {
    if (!b.vecna || b.dead || b.dormant || b.hp > 0) continue;
    for (const o of b.vecna.orbs) if (!o.dead) o.hp = 0;
  }
}
