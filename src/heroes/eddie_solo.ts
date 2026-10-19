// Eddie's Hellfire solo (docs/level-11.md, "The Hellfire solo"). The play scene plays it on the note highway (src/solo/, the `riff` chart): when
// the stand begins the view says so (HudView.solo goes from null to set), the scene starts the highway, and it tells the sim what the player does.
// The seam is a few plain functions:
//   startStand(s, h)       plants Eddie for the stand: 360 frames, 480 with Dustin in the party. Anim 'cast' the whole time, walking and
//                          Special do nothing. The caller has spent the MP.
//   pulse(s, h, crit)      one pulse of the ring round him: fx 'riff', sfx 'riff', power 0.4 and knockback 1.5 to every foe within the
//                          ring (a 40 frame stun to a flyer), and any mirror or clock it reaches shatters. `crit` makes every hit a crit.
//   standNote(s, ...)      Sim.soloNote off the roof: a struck note pulses the ring at the highway's radius (a crit on a perfect), a miss
//                          narrows the radius and breaks the streak. The first note, struck or missed, drives the stand from then on.
//   endSolo(s, cut)        Sim.soloEnd: the solo is over, and so is the stand, unless Encore plays it once more after a solo that finished.
//                          Three misses in a row (`cut`) end it for good.
//   endStand(s, h)         ends the stand and frees him. A swap away or a KO ends it too (stepStand notices).
// stepStand is the stand's own clock. Undriven (a Node run with no player, a test, or the second the highway's notes take to come down the neck)
// it pulses every 30 frames, the first on frame 30, and ends the stand when its life runs out. A driven stand pulses on the notes only, and the
// solo's end ends it, however long the chart runs.
//
// What gfx sees: a 'riff' fx round him at each pulse, w the ring's diameter. HudView.solo (soloHud) is { t, life, streak, ring, beat }: once
// driven the streak and the ring are the highway's, and beat is 0.
import type { HudView } from '../core/types.ts';
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';
import { LV9, hasTalent } from '../progression/talents.ts';
import type { Stand } from '../combat/talent_state.ts';
import { riffRing } from '../combat/props.ts';
import { beginAct, coneHits } from './common.ts';
import { eddieHit } from './eddie.ts';

/** Frames between the stand-in's pulses. */
export const PULSE_GAP = 30;

/** A pulse stuns a flyer for `flyerStun` frames: it falls to the floor and anyone can hit it. The demobat is the first. */
function isFlyer(e: Enemy): boolean { return e.bat !== null; }

/** True while `h` is playing the solo. */
export function standOn(s: S, h: Hero): boolean {
  return s.t6.stand !== null && s.t6.stand.hero === h;
}

/** The stand's length: 360 frames, 480 with Dustin in the party (the Hellfire bond). */
export function standLife(s: S): number {
  const d = HERO_DEFS.eddie.special;
  return s.heroes.some((p) => p.id === 'dustin') ? d.x.bond : d.dur;
}

/** The Special: he plants his feet. Called after the MP is spent. */
export function startStand(s: S, h: Hero): void {
  const d = HERO_DEFS.eddie.special;
  const life = standLife(s);
  // The cooldown starts counting when the stand ends, so Special does nothing meanwhile.
  beginAct(h, d, 'special', { dur: life, cd: life + d.cd });
  s.t6.stand = { hero: h, t: 0, life, ring: d.reach, born: s.frame, streak: 0, driven: false };
}

/** One pulse of the ring round `h`. On the 4.3 roof the ring is the one the song has widened or narrowed (combat/roof.ts). It reaches a flyer at any height. */
export function pulse(s: S, h: Hero, crit = false): void {
  const d = HERO_DEFS.eddie.special;
  const r = s.roof.on ? s.roof.ring : s.t6.stand?.ring ?? d.reach;
  const cy = h.y - BODY_Y;
  addFx(s, 'riff', h.x, cy, h.dir, 0, 18, r * 2, r * 2);
  sfx(s, 'riff');
  riffRing(s, h.x, cy, r);
  coneHits(s, h, h.aim, r, Math.PI, (e, a) => {
    eddieHit(s, h, e, { power: d.power, kb: d.kb, angle: a, crit, hitstop: 0, shake: 0.5, air: true });
    if (isFlyer(e)) e.stat.stun = Math.max(e.stat.stun, d.x.flyerStun);
  });
}

/** The stand is over: he can walk and cast again once the Special has cooled. */
export function endStand(s: S, h: Hero): void {
  if (!standOn(s, h)) return;
  s.t6.stand = null;
  if (h.act === 'special') { h.act = null; h.actT = 0; }
  h.cdSpecial = Math.min(h.cdSpecial, HERO_DEFS.eddie.special.cd);
}

/** Encore (Lv 9): the solo plays once more, for no MP. True when it does. */
function encore(s: S, h: Hero, st: Stand): boolean {
  if (st.encore || !hasTalent('eddie', h.level, LV9)) return false;
  st.encore = true;
  st.t = 0;
  st.streak = 0;
  h.actT = st.life;
  floater(s, 'ENCORE', h.x, h.y - 24, 'yellow', true, 50);
  return true;
}

/** Sim.soloEnd. The solo is over: the stand ends, unless Encore plays it once more. The clock pulses again until the next solo's first note. */
export function endSolo(s: S, cut = false): void {
  const st = s.t6.stand;
  if (!st) return;
  // Three misses in a row cut the solo short with a squeal: no encore after that.
  if (cut || !encore(s, st.hero, st)) endStand(s, st.hero);
  else st.driven = false;
}

/** One note of the riff on the highway: a hit pulses the ring at the highway's radius, a perfect with a crit, and a miss narrows it. The first note takes the stand over from its clock. */
export function standNote(s: S, hit: boolean, perfect: boolean, radius?: number): void {
  const st = s.t6.stand;
  if (!st || st.hero.ko) return;
  st.driven = true;
  if (radius !== undefined) st.ring = radius;
  st.streak = hit ? st.streak + 1 : 0;
  if (hit) pulse(s, st.hero, perfect);
}

/** One frame of the stand's clock: a swap away or a KO ends it, a hit does not. Undriven, a pulse comes every PULSE_GAP frames and it ends with its life. */
export function stepStand(s: S): void {
  const st = s.t6.stand;
  if (!st) return;
  const h = st.hero;
  if (h.ko || activeHero(s) !== h) { endStand(s, h); return; }
  // The tick he cast on is frame 0.
  if (st.born === s.frame) return;
  st.t++;
  // A hit cancels the cast: he stands back in it, planted, once the flinch is over. A driven stand has no end of its own, so the cast is kept up.
  if (h.act !== 'special' || st.driven) { h.act = 'special'; h.actT = st.driven ? 2 : st.life - st.t; h.lock = 0; }
  if (st.driven) return;
  if (st.t % PULSE_GAP === 0) pulse(s, h);
  if (st.t < st.life) return;
  if (!encore(s, h, st)) endStand(s, h);
}

/** HudView.solo: null unless Eddie is playing. beat is the frames to the next pulse, 0 under a highway. On the roof it is the song's: life 0 (the highway knows the length), beat 0. */
export function soloHud(s: S): HudView['solo'] {
  const st = s.t6.stand;
  if (s.roof.on) return { t: s.roof.t, life: 0, streak: s.roof.streak, ring: s.roof.ring, beat: 0 };
  if (!st) return null;
  return { t: st.t, life: st.life, streak: st.streak, ring: st.ring, beat: st.driven ? 0 : PULSE_GAP - (st.t % PULSE_GAP) };
}
