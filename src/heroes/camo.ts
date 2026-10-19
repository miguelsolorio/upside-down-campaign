// Lucas's Camo (Lv 6). The design's version drops aggro on a dash, and the game has no dash, so it rides on his Triple shot instead,
// the way Nancy's Trap kit rides on her Shotgun. Each Triple shot hides him for 3 s, at most once every 8 s, so a run of shots can't
// keep him hidden. While he is hidden and the active hero, the foes lose him: they stand and look round, start no attack, and one
// winding up stands down. Shots already in the air still land. A boss isn't fooled, and nor is a wave going for the ward in a defense or the channelers in the final fight.
//
// What gfx sees: Lucas's ActorView has `hidden` while it lasts, so he is drawn faint.
import { HERO_DEFS } from './defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dust, floater } from '../combat/fx.ts';
import { isBoss } from '../combat/confuse.ts';
import { channelOn } from '../combat/finale_state.ts';

/** Triple shot fired: hide him if the talent is his and it is ready. */
export function camo(s: S, h: Hero): void {
  if (h.id !== 'lucas' || !hasTalent('lucas', h.level, LV6) || s.t6.camoCd > 0) return;
  const x = HERO_DEFS.lucas.special.x;
  s.t6.camo = x.camo;
  s.t6.camoCd = x.camoCd;
  dust(s, h.x, h.y, 4);
  floater(s, 'CAMO', h.x, h.y - 24, 'leaf', false, 36);
}

/** True while this hero is Lucas under his Camo. */
export function camoHides(s: S, h: Hero): boolean {
  return h.id === 'lucas' && !h.ko && s.t6.camo > 0;
}

/**
 * True when this enemy has lost the active hero to Camo this frame. One that was winding up or lunging stands down to a chase, so
 * it picks him up again where it left off once the Camo ends.
 */
export function lostHim(s: S, e: Enemy, hero: Hero): boolean {
  if (!camoHides(s, hero) || isBoss(e)) return false;
  if (e.rt === 'wave' && ((s.defense !== null && s.defense.started) || channelOn(s))) return false;
  if (e.mode === 'windup' || e.mode === 'lunge') { e.mode = 'chase'; e.modeT = 0; }
  return true;
}
