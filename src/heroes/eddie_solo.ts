// Eddie's Hellfire solo, the stand-in (docs/level-11.md, "The Hellfire solo"). The real solo, the note highway with its charts, its
// timing and the bot's play, is a module of its own (src/solo/) that plugs in later. This file is its seam, three plain functions:
//   startStand(s, h)       plants Eddie for the stand: 360 frames, 480 with Dustin in the party. Anim 'cast' the whole time, walking and
//                          Special do nothing. The caller has spent the MP.
//   pulse(s, h, crit)      one pulse of the ring round him: fx 'riff', sfx 'riff', power 0.4 and knockback 1.5 to every foe within the
//                          ring (a 40 frame stun to a flyer), and any mirror or clock it reaches shatters. `crit` makes every hit a crit.
//   endStand(s, h)         ends the stand and frees him. A swap away or a KO ends it too (stepStand notices).
// stepStand is the stand-in's own clock: it pulses every 30 frames, the first on frame 30, and ends the stand when it runs out. The
// module drives pulse() itself instead of calling it.
//
// What gfx sees: a 'riff' fx round him at each pulse, w the ring's diameter. HudView.solo (soloHud) is { t, life, streak 0, ring, beat }.
import type { HudView } from '../core/types.ts';
import { HERO_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { BODY_Y } from '../combat/space.ts';
import { addFx, sfx } from '../combat/fx.ts';
import { riffRing } from '../combat/props.ts';
import { beginAct, coneHits } from './common.ts';
import { eddieHit } from './eddie.ts';

/** Frames between the stand-in's pulses. */
export const PULSE_GAP = 30;

/** No flyer exists yet; 4.3's demobats are the first. A pulse stuns one for `flyerStun` frames. */
function isFlyer(_e: Enemy): boolean { return false; }

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
  s.t6.stand = { hero: h, t: 0, life, ring: d.reach, born: s.frame };
}

/** One pulse of the ring round `h`. */
export function pulse(s: S, h: Hero, crit = false): void {
  const d = HERO_DEFS.eddie.special;
  const r = s.t6.stand?.ring ?? d.reach;
  const cy = h.y - BODY_Y;
  addFx(s, 'riff', h.x, cy, h.dir, 0, 18, r * 2, r * 2);
  sfx(s, 'riff');
  riffRing(s, h.x, cy, r);
  coneHits(s, h, h.aim, r, Math.PI, (e, a) => {
    eddieHit(s, h, e, { power: d.power, kb: d.kb, angle: a, crit, hitstop: 0, shake: 0.5 });
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

/** One frame of the stand-in: a swap away or a KO ends it, a hit does not, and a pulse comes every PULSE_GAP frames. */
export function stepStand(s: S): void {
  const st = s.t6.stand;
  if (!st) return;
  const h = st.hero;
  if (h.ko || activeHero(s) !== h) { endStand(s, h); return; }
  // The tick he cast on is frame 0.
  if (st.born === s.frame) return;
  st.t++;
  // A hit cancels the cast: he stands back in it, planted, once the flinch is over.
  if (h.act !== 'special') { h.act = 'special'; h.actT = st.life - st.t; h.lock = 0; }
  if (st.t % PULSE_GAP === 0) pulse(s, h);
  if (st.t >= st.life) endStand(s, h);
}

/** HudView.solo: null unless Eddie is playing. beat is the frames to the next pulse. */
export function soloHud(s: S): HudView['solo'] {
  const st = s.t6.stand;
  if (!st) return null;
  return { t: st.t, life: st.life, streak: 0, ring: st.ring, beat: PULSE_GAP - (st.t % PULSE_GAP) };
}
