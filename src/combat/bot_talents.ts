// The bot's Specials (bot.ts calls these): when each hero's cast is worth it, and the Lv 6 variants it holds Special for.
//   - Lucas fires Triple shot past 28 px, Dustin sprays up close or at two, Will throws a Fireball at a pair or with MP to spare,
//     Eleven blasts a line, Steve calls Babysit with two on him, Robin babbles at three, Nancy shotguns one inside 40 px.
//   - Mike, from Lv 6, puts up the DM screen with two foes close or a dart coming, since the screen is then also his Rally. Not in a
//     defense: the cast slows him, and the ward falls more often when he stops for it.
//   - Will, from Lv 6, holds Special for the Cleric heal when the party is under half its HP, and not again for the heal's 10 s.
//   - Nancy, from Lv 6, holds Special for the Molotov when two foes stand together 30 to 64 px out.
//   - Eleven, from Lv 6, holds Special for Sensory tank between fights, at most every 20 s, keeping MP for a Mind Blast.
//   - Hopper slams with two foes within 40 px or a guard's shield up in front of him. From Lv 6 his Attack fires on release (`swing`): it
//     taps for the plain haymaker, and holds the wind-up against a guard with its shield up, which the wind-up breaks.
//   - Eddie plays the Hellfire solo with two foes within 56 px, and then presses nothing until it is over (bot.ts).
//   - Dustin, from Lv 9, holds Special for Cerebro once a stage, when the living party is under 55 percent of its MP (the HUD's
//     `once` says whether Suzie is still to call). The other Lv 9 talents need no input: Overload, Volley, King Steve, Final girl and
//     Dry wit are in the moves and the damage, Oath and Extra life catch a fall, and Hive link comes with a swap to Will.
// A hold keeps Special down for HOLD_FRAMES and two more, whatever else the bot does meanwhile, then lets go.
import type { HeroId, PartyHud, SimInput, SimView } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { HOLD_FRAMES } from '../heroes/hold.ts';
import { WIND_FRAMES } from '../heroes/hopper.ts';
import { LV6, LV9 } from '../progression/talents.ts';
import { isShieldedKind } from '../enemies/shield.ts';

/** What bot.ts knows about a foe that the casting rules read. */
export interface CastFoe { x: number; y: number; kind: string; d: number; burning: boolean; up?: boolean }

/** What bot.ts has worked out about the fight this frame. */
export interface CastScene {
  near: CastFoe;
  foes: CastFoe[];
  /** Eleven's beam would miss its target by this many px off the nearest of the eight lines. */
  miss: number;
  /** The nearest foe is a guard with its shield toward the hero. */
  shielded: boolean;
  /** A dart or a bullet is on its way to the hero. */
  dart: boolean;
  /** A defense is on: the bot is guarding the ward. */
  ward: boolean;
}

/** Steve casts Babysit when two foes are this close. */
export const BABYSIT_CROWD = 48;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
const isGuard = isShieldedKind;
/** Frames between the bot's Sensory tanks. */
const SENSE_GAP = 1200;
/** Cerebro is worth a call when the living party holds under this share of its MP. */
const SUZIE_BELOW = 0.55;

/** The share of its MP the living party holds. 1 for an empty party. */
function partyMp(v: SimView): number {
  const up = v.hud.party.filter((p) => !p.ko);
  const max = up.reduce((n, p) => n + p.mpMax, 0);
  return max > 0 ? up.reduce((n, p) => n + p.mp, 0) / max : 1;
}

/** Hopper's slam crowd, and Eddie's: foes this close make the cast worth its MP. */
const SLAM_CROWD = 40;
const SOLO_CROWD = 56;

/** A foe with its shield up in front of the hero: the hero's hit would be blocked. */
const guarded = (s: CastScene): boolean => s.shielded || (s.near.up === true && s.near.d < 50);

/**
 * True for a hero who has what it takes to break a guard's shield, so the bot walks straight at it and does not circle to its blind side:
 * Eleven's Push, Hopper's slam while he has the MP, and his wind-up from Lv 6.
 */
export function breaksGuard(me: PartyHud): boolean {
  return me.id === 'eleven' || (me.id === 'hopper' && (me.level >= LV6 || me.mp >= HERO_DEFS.hopper.special.mp));
}

/** The plain Special: is it worth casting now? */
function wantsSpecial(me: PartyHud, s: CastScene): boolean {
  const { near, foes } = s;
  const id: HeroId = me.id;
  const cost = HERO_DEFS[id].special.mp;
  if (me.mp < cost) return false;
  const group = foes.filter((f) => f.d < 60).length;
  switch (id) {
    case 'lucas': return near.d > 28;
    case 'dustin': return (near.d < 50 || group >= 2) && !(isGuard(near.kind) && near.burning);
    case 'will': return near.d > 26 && (foes.filter((f) => dist(f.x, f.y, near.x, near.y) < 36).length >= 2 || me.mp >= me.mpMax * 0.6);
    case 'eleven': return near.d < 120 && s.miss < 12 && (group >= 2 || near.kind === 'agent' || s.shielded);
    case 'steve': return foes.filter((f) => f.d < BABYSIT_CROWD).length >= 2;
    case 'robin': return foes.filter((f) => f.d < 56).length >= 3;
    case 'nancy': return near.d < 40;
    case 'mike': return me.level >= LV6 && !s.ward && (group >= 2 || s.dart);
    case 'hopper': return foes.filter((f) => f.d < SLAM_CROWD).length >= 2 || guarded(s);
    case 'eddie': return foes.filter((f) => f.d < SOLO_CROWD).length >= 2;
    default: return false;
  }
}

/** Nancy's Molotov: two foes within 24 px of each other, 30 to 64 px out. */
function wantsMolotov(me: PartyHud, s: CastScene): boolean {
  if (me.id !== 'nancy' || me.level < LV6 || me.mp < HERO_DEFS.nancy.special.x.molMp) return false;
  const out = s.foes.filter((f) => f.d >= 30 && f.d <= HERO_DEFS.nancy.special.x.molReach);
  return out.some((a) => out.some((b) => b !== a && dist(a.x, a.y, b.x, b.y) <= 24));
}

export interface Caster {
  /** In a fight, in position: casts or starts a hold. Returns true when it did either. */
  cast(me: PartyHud, s: CastScene, out: SimInput): boolean;
  /** In a fight, in position, Attack held: Hopper from Lv 6 turns it into a tap, or the wind-up's hold. Other heroes keep it as it is. */
  swing(me: PartyHud, s: CastScene, out: SimInput): void;
  /** Every frame, fight or not: Will's heal, Eleven's Sensory tank between fights (`calm`), and a hold already going. */
  keep(v: SimView, me: PartyHud, out: SimInput, calm: boolean): void;
}

export function createCaster(): Caster {
  let holdLeft = 0;
  let windT = 0;
  let frame = 0;
  let healAt = -99999;
  let senseAt = -99999;
  const startHold = (out: SimInput): void => {
    holdLeft = HOLD_FRAMES + 2;
    out.specialPressed = true;
    out.specialHeld = true;
  };
  return {
    cast(me, s, out) {
      if (holdLeft > 0) return false;
      if (wantsMolotov(me, s)) { startHold(out); return true; }
      if (!wantsSpecial(me, s)) return false;
      out.specialPressed = true;
      return true;
    },
    swing(me, s, out) {
      if (me.id !== 'hopper' || me.level < LV6) return;
      // Mid-hold it carries on to the release. Otherwise a guard's shield up means a wind-up, and anything else a tap: a press that comes up
      // the same frame, which the sim buffers until the haymaker is ready.
      if (windT === 0 && !guarded(s)) { out.attackPressed = true; out.attackHeld = false; return; }
      windT++;
      out.attackPressed = windT === 1;
      out.attackHeld = windT <= WIND_FRAMES;
      if (windT > WIND_FRAMES) windT = 0;
    },
    keep(v, me, out, calm) {
      frame++;
      // Attack let go before the wind-up was done (the hero left his position): the next hold starts over.
      if (!out.attackHeld) windT = 0;
      if (holdLeft > 0) {
        holdLeft--;
        out.specialHeld = holdLeft > 0;
        return;
      }
      if (me.id === 'dustin' && me.level >= LV9 && me.once === 'ready' && partyMp(v) < SUZIE_BELOW) { startHold(out); return; }
      const x = HERO_DEFS.eleven.special;
      if (me.id === 'eleven' && me.level >= LV6 && calm && me.mp >= x.x.senseMp + x.mp && frame - senseAt >= SENSE_GAP) {
        senseAt = frame;
        startHold(out);
        return;
      }
      if (me.id !== 'will' || me.level < LV6 || me.mp < HERO_DEFS.will.special.x.healMp) return;
      if (frame - healAt < HERO_DEFS.will.special.x.healCd + 10) return;
      const up = v.hud.party.filter((p) => !p.ko);
      const hp = up.reduce((n, p) => n + p.hp, 0), max = up.reduce((n, p) => n + p.hpMax, 0);
      if (max > 0 && hp / max < 0.5) { healAt = frame; startHold(out); }
    },
  };
}
