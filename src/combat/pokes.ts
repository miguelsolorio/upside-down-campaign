// "Trying it": a hero swings or fires toward a gate, door, log, crate, van, lantern, console, vines, fire-door box or hidden path that
// is still shut, or pushes against one. The sim only reports the attempt, as `{ t: 'poked', propId, hero }`, whichever
// hero it was. The stage decides whether that hero was the wrong one for the puzzle and shows the hint (see
// world/puzzles.ts). A pinned Demogorgon reports the same event for a hit that is not Eleven's beam (enemies/demo_hit.ts).
// A gap, a crack and a cipher door are the exception: the hero who solves them (Max's dash, Steve's nail bat, Robin) never pokes them.
// A try at a prop that only knocked-out heroes can open stands the first of them back up (standFor), so a gate never
// waits on a hero who is out.
import type { HeroId, PropKind, Utility } from '../core/types.ts';
import type { Hero, Prop, S } from './state.ts';
import { FOOT_H, FOOT_W, angleDiff, dist, propBlocks, rectsOverlap } from './space.ts';
import { HERO_DEFS, utilitiesAt } from '../heroes/defs.ts';

/** Props that can be a puzzle. A crate, van or lantern only counts if it asks for something: a decor crate does not. */
const PUZZLE_KINDS = new Set<PropKind>(['gate', 'door', 'log', 'crate', 'van', 'target', 'console', 'vines', 'firebox', 'hidden', 'gap', 'crack', 'shutter', 'cipher', 'breaker']);
/** Props whose own hero is not "trying" them when he goes at them: it is how they are solved. Robin walks up to a cipher door. */
const SOLVED_BY_TRY = new Set<PropKind>(['gap', 'crack', 'cipher']);
/** Frames before the same prop reports another attempt. */
const POKE_GAP = 45;
/** Frames of pushing against a shut prop before it counts as trying it. A third of a second. */
const BUMP_FRAMES = 20;
/** How far past its reach an attack still counts as aimed at a prop, in px. */
const REACH_SLACK = 6;
/** How wide a cone an attack counts as aimed: wide for a swing, narrow for a shot down a line. */
const MELEE_HALF = 0.96;
const SHOT_HALF = 0.38;
/** A hero with an enemy this close that has noticed him is fighting, not trying a door. */
const FIGHT_RANGE = 200;

/** Is this prop a shut puzzle? */
function shut(p: Prop): boolean {
  if (!PUZZLE_KINDS.has(p.kind) || p.state === 'open' || p.state === 'lit') return false;
  return p.kind === 'gate' || p.kind === 'door' || p.kind === 'shutter' || p.hitBy !== undefined || p.pushBy !== undefined;
}

function report(s: S, p: Prop, hero: HeroId): void {
  if (p.pokeCd > 0) return;
  const level = s.heroes.find((h) => h.id === hero)?.level ?? 1;
  if (SOLVED_BY_TRY.has(p.kind) && p.hitBy !== undefined && utilitiesAt(hero, level).includes(p.hitBy)) return;
  p.pokeCd = POKE_GAP;
  s.events.push({ t: 'poked', propId: p.id, hero });
  standFor(s, p);
}

/** Share of max HP a hero stands back up with when a gate needs them. The same as Eleven's for the pinned Demogorgon. */
const STAND_HP = 0.3;

/** What a shut prop asks for: a gap asks for the dash, anything else for its hitBy or pushBy. Gates, doors and shutters ask nothing. */
function needs(p: Prop): Utility | undefined {
  return p.kind === 'gap' ? 'dash' : p.hitBy ?? p.pushBy;
}

/**
 * A gate can't wait on a hero who is out. When the party tries a prop that only knocked-out heroes can open (Max for a
 * gap, Steve for a crack, Dustin for vines), the first of them stands back up with STAND_HP of their HP and the MP for
 * one special. Nobody stands if someone who can open it is still up, or if nobody in the party can.
 */
function standFor(s: S, p: Prop): void {
  const util = needs(p);
  if (util === undefined) return;
  const able = s.heroes.filter((h) => utilitiesAt(h.id, h.level).includes(util));
  const h = able[0];
  if (!h || able.some((a) => !a.ko)) return;
  h.ko = false;
  h.hp = Math.max(1, Math.ceil(h.st.hp * STAND_HP));
  h.mp = Math.max(h.mp, HERO_DEFS[h.id].special.mp);
  h.anim = 'idle'; h.animT = 0;
  s.bodies = s.bodies.filter((b) => b.id !== h.id);
}

/**
 * A hero starts an attack or a special that reaches `reach` px along `h.aim`. Every shut puzzle prop inside that cone
 * is being tried. Skipped while an enemy who has noticed him is close: then he is fighting, and the door behind the
 * enemy is not what he is trying.
 */
export function pokeAimed(s: S, h: Hero, reach: number): void {
  if (s.enemies.some((e) => e.aware && !e.dead && !e.dormant && dist(e.x, e.y, h.x, h.y) < FIGHT_RANGE)) return;
  const half = reach <= 60 ? MELEE_HALF : SHOT_HALF;
  const hy = h.y - 2;
  for (const p of s.props) {
    if (!shut(p)) continue;
    // The nearest point of the prop to his feet: inside it counts, and so does a prop he is leaning on.
    const nx = Math.max(p.x, Math.min(h.x, p.x + p.w)), ny = Math.max(p.y, Math.min(hy, p.y + p.h));
    const d = dist(h.x, hy, nx, ny);
    if (d > reach + REACH_SLACK) continue;
    if (d > 2 && angleDiff(Math.atan2(ny - hy, nx - h.x), h.aim) > half) continue;
    report(s, p, h.id);
  }
}

/**
 * Called each tick after the active hero has moved. (ux, uy) is the way he is pushing the stick, `speed` how far he
 * meant to go and `moved` how far he got. Pressed against a shut puzzle prop and going nowhere for a third of a second
 * is trying it.
 */
export function trackBump(s: S, h: Hero, ux: number, uy: number, speed: number, moved: number): void {
  let hit: Prop | null = null;
  if ((ux !== 0 || uy !== 0) && speed > 0 && moved < speed * 0.3) {
    const l = h.x + ux * 3 - FOOT_W / 2, t = h.y + uy * 3 - FOOT_H;
    hit = s.props.find((p) => shut(p) && propBlocks(p) && rectsOverlap(l, t, FOOT_W, FOOT_H, p.x, p.y, p.w, p.h)) ?? null;
  }
  if (!hit) { s.bump = null; return; }
  if (s.bump?.id === hit.id) s.bump.t++; else s.bump = { id: hit.id, t: 1 };
  if (s.bump.t >= BUMP_FRAMES) { report(s, hit, h.id); s.bump.t = 0; }
}
