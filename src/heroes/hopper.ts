// Hopper, the Barbarian (docs/level-10.md, "Hopper"). Basic: the Haymaker, a slow heavy punch with a huge arc and no chain. Special: the
// Ground slam (8 MP), a 360 degree shockwave that stuns everything it reaches. Both break a crack in a wall, the way Steve's bat does.
//   Coffee (Lv 3): Eggos, Cokes and the stash's heal him 25 percent more (pickups.ts asks `coffee`).
//   Wind-up (Lv 6): his Attack fires when the key comes up. Held 24 frames (ActorView.charge fills) it is the wind-up haymaker, power
//   x1.8 and knockback 5, which breaks a block. A tap is the plain haymaker on release. `readWind` is the tick's reading of the key.
//
// The slam is also the one thing that finishes the pinned pit Demogorgon (enemies/demo_hit.ts).
//
// What gfx sees: a 'slash' fx for the haymaker, a 'nova' at his feet for the slam, w its diameter.
import type { SimInput } from '../core/types.ts';
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { addFx, dust, sfx, shake } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { smashCracks } from '../combat/props.ts';
import { beginAct, chord, coneHits, later, rad } from './common.ts';

/** How much wider than the swing's arc a crack still counts as reached, in radians. */
const CRACK_SLACK = 0.3;
/** Frames a tap, or a wind-up released into a cooldown, waits for the haymaker to be ready. The same as an attack's buffer. */
const TAP_BUFFER = 8;

/** Frames Attack is held for the wind-up haymaker: 0.4 s. */
export const WIND_FRAMES = HERO_DEFS.hopper.basic.x.windT as number;

/** What Attack does for Hopper this tick: nothing, the plain haymaker, or the wind-up haymaker. */
export type Swing = 'none' | 'tap' | 'wind';

/** True from Lv 6, when his Attack fires on release. */
export function windsUp(h: Hero): boolean {
  return h.id === 'hopper' && hasTalent('hopper', h.level, LV6);
}

/** What food does for the hero eating it: 1.25 for Hopper from Lv 3, 1 for everyone else. */
export function coffee(h: Hero): number {
  return h.id === 'hopper' && hasTalent('hopper', h.level) ? 1 + HERO_DEFS.hopper.special.x.coffee : 1;
}

/**
 * Reads Attack for a hero who winds up. A press with the key still down starts the hold (Hero.holdT counts it, -1 never): the buffer is
 * emptied so nothing swings meanwhile. Letting go after WIND_FRAMES is the wind-up haymaker, waiting out a cooldown for a few frames if it
 * has to (S.t6.windQ). Letting go sooner, or a press that comes up on the same frame (the bot's tap), is the plain haymaker, buffered the
 * usual 8 frames. The caller fires the swing when it can and spends the queue.
 */
export function readWind(s: S, h: Hero, input: SimInput): Swing {
  if (h.holdT === 0) {
    if (s.buf.attack > 0 && input.attackHeld) {
      h.holdT = 1;
      s.buf.attack = 0;
      s.t6.windQ = 0;
      return 'none';
    }
    if (s.t6.windQ > 0) { s.t6.windQ--; return 'wind'; }
    return s.buf.attack > 0 ? 'tap' : 'none';
  }
  s.buf.attack = 0;
  if (input.attackHeld) {
    h.holdT = Math.min(WIND_FRAMES, h.holdT + 1);
    return 'none';
  }
  const full = h.holdT >= WIND_FRAMES;
  h.holdT = 0;
  if (full) { s.t6.windQ = TAP_BUFFER + 1; return 'wind'; }
  s.buf.attack = TAP_BUFFER;
  return 'tap';
}

/** The Haymaker. `wind` is the Lv 6 wind-up one: harder, and it throws far enough to break a guard's block. */
export function hopperBasic(s: S, h: Hero, wind = false): void {
  const d = HERO_DEFS.hopper.basic;
  const power = d.power * (wind ? d.x.windPower : 1);
  const kb = wind ? d.x.windKb : d.kb;
  const half = rad(d.x.half);
  const aim = h.aim;
  beginAct(h, d, 'basic');
  sfx(s, 'haymaker');
  later(s, h, d.at, () => {
    addFx(s, 'slash', h.x, h.y - BODY_Y, h.dir, aim, wind ? 14 : 11, d.reach, chord(d.reach, half));
    smashCracks(s, h, aim, d.reach, half + CRACK_SLACK);
    coneHits(s, h, aim, d.reach, half, (e, a) => {
      hitEnemy(s, h, e, { power, kb, angle: a, stagger: wind ? 22 : 14, hitstop: wind ? 5 : 3, shake: wind ? 2.2 : 1.2 });
    });
  });
}

/** The Ground slam: a shockwave all round him, `reach` px, that stuns every foe it reaches. */
export function hopperSpecial(s: S, h: Hero): void {
  const d = HERO_DEFS.hopper.special;
  beginAct(h, d, 'special');
  sfx(s, 'slam');
  later(s, h, d.at, () => {
    addFx(s, 'nova', h.x, h.y, h.dir, 0, 18, d.reach * 2, d.reach);
    dust(s, h.x, h.y, 6);
    shake(s, 3);
    smashCracks(s, h, h.aim, d.reach, Math.PI + CRACK_SLACK);
    coneHits(s, h, h.aim, d.reach, Math.PI, (e, a) => {
      hitEnemy(s, h, e, { power: d.power, kb: d.kb, angle: a, stun: d.x.stun, stagger: 24, hitstop: 3, shake: 1.8, slam: true });
    });
  });
}
