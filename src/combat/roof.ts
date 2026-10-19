// The 4.3 rooftop, the sim's side of the song (docs/level-12.md, "The roof"). The play scene runs the note highway (src/solo) over the stage
// and tells the sim what happens:
//   Sim.rooftop(true)    Eddie comes to the front and plants himself (anim cast; nothing he does or anyone does moves him, and swaps do
//                        nothing), and a flock of x.roofN demobats comes up from the stage's burrows and circles him. A bat that dies is replaced
//                        x.roofGap frames later. They are run-time bats: no XP, no drop. His HP at 0 while the song plays is a wipe (allDown).
//   Sim.soloNote(hit)    A hit pulses his ring (eddie_solo.ts, pulse): a crit on a perfect. The ring starts at the solo's reach and widens a step
//                        on a hit, two on a perfect, and narrows a step on a miss, between ringMin and ringMax. A miss sends the nearest circling bat
//                        down at him for roofPower (enemies/demobat.ts, sendDive). A bat that is stunned, winding up or diving can't be sent.
//   Sim.rooftop(false)   The stand is over. The bats stay as they are.
// A bat of the roof never dives on its own clock: the pressure is the misses.
import type { Enemy, Hero, S } from './state.ts';
import { activeHero } from './state.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { sendDive } from '../enemies/demobat.ts';
import { endStand, pulse, standNote } from '../heroes/eddie_solo.ts';
import { dist } from './space.ts';
import { sfx } from './fx.ts';
import { trySwap } from './party.ts';
import { bringUp, waveSpots } from './spawns.ts';

/** The roof while its song plays. `t` is the frames since it began, `ring` the pulse's radius in px, `streak` the hits in a row, `gap` the frames before the next bat. */
export interface RoofState { on: boolean; t: number; ring: number; streak: number; gap: number }

export const newRoof = (): RoofState => ({ on: false, t: 0, ring: 0, streak: 0, gap: 0 });

const X = ENEMY_DEFS.demobat.x;

const eddieOf = (s: S): Hero | undefined => s.heroes.find((h) => h.id === 'eddie');

/** Eddie stands where he is and plays: a short action every tick, so a flinch or a swap cannot leave him walking. */
function plant(h: Hero): void {
  h.act = 'special'; h.actT = 2; h.lock = 0;
  h.vx = 0; h.vy = 0; h.holdT = 0;
}

/** Brings `n` bats up from the burrows nearest Eddie. They are the roof's: awake, circling him, worth nothing. */
function bringBats(s: S, h: Hero, n: number): void {
  if (n <= 0) return;
  const bats = bringUp(s, 'roof', 'roof', 'demobat', undefined, waveSpots(s, h.x, h.y), n, s.rtSeq);
  for (const e of bats) e.xp = 0;
  if (bats.length > 0) sfx(s, 'flap');
}

/** The roof's live bats. */
const roofBats = (s: S): Enemy[] => s.enemies.filter((e) => e.rt === 'roof' && !e.dead && e.hp > 0);

/** Sim.rooftop. On: Eddie to the front, planted, and the flock up. Off: the stand ends and the bats stay as they are. */
export function setRoof(s: S, on: boolean): void {
  const r = s.roof;
  if (!on) { r.on = false; return; }
  const i = s.heroes.findIndex((h) => h.id === 'eddie');
  const h = s.heroes[i];
  if (r.on || !h || h.ko) return;
  if (i !== s.active && !trySwap(s, i, true)) return;
  endStand(s, h);
  r.on = true; r.t = 0; r.streak = 0; r.gap = X.roofGap;
  r.ring = HERO_DEFS.eddie.special.reach;
  plant(h);
  bringBats(s, h, X.roofN - roofBats(s).length);
}

/** One frame of the song: he stays planted and the flock is kept up. */
export function updateRoof(s: S): void {
  const r = s.roof;
  if (!r.on) return;
  const h = eddieOf(s);
  // He is not the one up any more (dismissed, or knocked out and the stage lost): the song is over for the sim.
  if (!h || activeHero(s) !== h || h.ko) { r.on = false; return; }
  r.t++;
  plant(h);
  if (roofBats(s).length >= X.roofN) { r.gap = X.roofGap; return; }
  if (--r.gap > 0) return;
  r.gap = X.roofGap;
  bringBats(s, h, 1);
}

/** Sim.soloNote. A hit pulses the ring, a miss sends the nearest circling bat down. Off the roof it is a note of Eddie's own solo (heroes/eddie_solo.ts). */
export function soloNote(s: S, hit: boolean, perfect: boolean, radius?: number): void {
  const r = s.roof;
  const h = eddieOf(s);
  if (!r.on) { standNote(s, hit, perfect, radius); return; }
  if (!h) return;
  const sp = HERO_DEFS.eddie.special.x;
  if (hit) {
    r.streak++;
    r.ring = Math.min(sp.ringMax, r.ring + sp.ringStep * (perfect ? 2 : 1));
    pulse(s, h, perfect);
    return;
  }
  r.streak = 0;
  r.ring = Math.max(sp.ringMin, r.ring - sp.ringStep);
  let near: Enemy | null = null, best = Infinity;
  for (const e of s.enemies) {
    if ((e.bat?.move !== 'orbit' && e.bat?.move !== 'climb') || e.dead || e.dormant || !e.aware || e.hp <= 0) continue;
    const d = dist(e.x, e.y, h.x, h.y);
    if (d < best) { near = e; best = d; }
  }
  if (near) sendDive(s, near, h);
}

/** True while Eddie is playing the roof: nothing he is hit by flinches or shoves him. */
export const roofPlanted = (s: S, h: Hero): boolean => s.roof.on && h.id === 'eddie';

/** Called when a hero is knocked out: Eddie at 0 HP while the song plays loses the roof, whoever else is standing. Returns true when it did. */
export function roofFell(s: S, h: Hero): boolean {
  if (!roofPlanted(s, h)) return false;
  s.roof.on = false;
  s.over = true;
  s.events.push({ t: 'allDown' });
  return true;
}
