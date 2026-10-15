// The bot's crossing at a waypoint flagged `dash` (bot.ts calls this). It reads only what a player sees in the view.
// At the waypoint, on the near side of a gap, it swaps to the party hero whose utilities include 'dash', turns that hero
// to face the next waypoint, casts the special and waits out the roll. If the roll did not carry it toward the next
// waypoint (it landed on the near side) it tries again, a few times, then gives up and carries on. A dasher who is down is
// stood back up by leaning on the gap.
import type { SimInput, SimView, Vec2 } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';

/** Just above the sim's dead zone: turns the hero to face a way without walking anywhere. */
const NUDGE = 0.2;
/** Frames the whole crossing may take before the bot gives up on it. */
const GIVE_UP = 900;
const TRIES = 3;
/** Frames between two presses of the special, so a press that has not shown yet is not doubled. */
const PRESS_GAP = 4;
/** How much closer to the next waypoint a landing has to be for the bot to count the crossing as made, in px. */
const PROGRESS = 20;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export interface DashCross {
  /** True from the first frame of a crossing to its last: the bot stays on it wherever the roll takes the hero. */
  active(): boolean;
  /**
   * One frame of the crossing at (hx, hy), the active hero's feet. It sets the input in `out` and returns false while it
   * works, and true once it is over and the bot should carry on to the next waypoint `to`.
   */
  step(v: SimView, out: SimInput, hx: number, hy: number, to: Vec2 | undefined): boolean;
}

export function createDashCross(): DashCross {
  let on = false;
  let age = 0, tries = 0, lastPress = -99;
  let rolling = false;
  let from: Vec2 = { x: 0, y: 0 };

  const finish = (): boolean => { on = false; return true; };

  return {
    active: () => on,
    step(v, out, hx, hy, to) {
      if (!on) { on = true; age = 0; tries = 0; lastPress = -99; rolling = false; from = { x: hx, y: hy }; }
      age++;
      const party = v.hud.party;
      const di = party.findIndex((p) => !p.ko && HERO_DEFS[p.id].utilities.includes('dash'));
      const dasher = party[di];
      if (age > GIVE_UP) return finish();
      // The dasher is down: lean on the gap, which stands them back up (combat/pokes.ts), and wait for them.
      if (!dasher) {
        if (to) { const a = Math.atan2(to.y - hy, to.x - hx); out.mx = Math.cos(a); out.my = Math.sin(a); }
        return false;
      }
      // Not the one in front: tag the dasher in and wait for it.
      if (!dasher.active) { out.swapTo = di; return false; }
      const anim = v.actors.find((a) => a.kind === 'hero' && a.id === dasher.id)?.anim;
      if (anim === 'dash') { rolling = true; return false; }
      if (rolling) {
        // The roll is over. Did it carry the hero toward the far side?
        rolling = false;
        if (!to || dist(hx, hy, to.x, to.y) <= dist(from.x, from.y, to.x, to.y) - PROGRESS || ++tries >= TRIES) return finish();
        from = { x: hx, y: hy };
      }
      // Face the next waypoint, and cast once the MP is there.
      if (to) {
        const a = Math.atan2(to.y - hy, to.x - hx);
        out.mx = Math.cos(a) * NUDGE; out.my = Math.sin(a) * NUDGE;
      }
      if (dasher.mp >= HERO_DEFS[dasher.id].special.mp && age - lastPress >= PRESS_GAP) {
        out.specialPressed = true;
        lastPress = age;
      }
      return false;
    },
  };
}
