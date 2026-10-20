// What the mouse is over. Turns a click on the screen into a world point and says what is under it: an enemy, a hero or bare ground.
// Pure: it reads the view and nothing else, so the glue in play.ts decides what a pick means (walk, attack, swap, aim) and these
// functions are tested in Node with stub views. Enemies are picked by a box around the foot, bigger for the boss-sized sprites, and
// enemies beat heroes, so a rat standing on a hero's tile can still be clicked.
import type { ActorView, EnemyKind, HeroId, SimView, Vec2 } from '../core/types.ts';
import type { Camera } from '../core/camera.ts';
import { VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import { BODY_Y } from '../combat/space.ts';

/** What is under the cursor. An enemy carries its foot (see `footOf`), a ground pick the world point. */
export type Pick =
  | { kind: 'enemy'; id: EnemyKind; x: number; y: number }
  | { kind: 'hero'; id: HeroId }
  | { kind: 'ground'; x: number; y: number };

/** A pick box: half its width, and how far it rises above the foot. All boxes reach DOWN px below the foot. */
interface Box { hw: number; up: number }

const DOWN = 3;
const ENEMY_BOX: Box = { hw: 9, up: 20 };
const HERO_BOX: Box = { hw: 8, up: 16 };
/** The sprites that are taller or wider than a rat or an agent. */
const BIG: Partial<Record<EnemyKind, Box>> = {
  demogorgon: { hw: 18, up: 40 },
  pitdemo: { hw: 18, up: 40 },
  twin: { hw: 18, up: 40 },
  alpha: { hw: 18, up: 26 },
  demodog: { hw: 14, up: 22 },
};

/** A point on the screen to a point in the world. `shake` is the view's screen shake offset, which moved the picture. */
export function toWorld(p: Vec2, cam: Camera, shake: Vec2 = { x: 0, y: 0 }): Vec2 {
  return { x: p.x + cam.x - shake.x, y: p.y - VIEW_TOP + cam.y - shake.y };
}

/** True when a screen point is over the world: below the HUD strip and inside the clear band. Reads the live screen width. */
export function inField(p: Vec2): boolean {
  return p.y >= VIEW_TOP && p.x >= VIEW_X && p.x < VIEW_X + VIEW_W;
}

/**
 * True for an enemy the player can hit: not knocked out, not hidden, not a goo puddle waiting to rise, and not one that is rising,
 * falling or climbing, or a severed leg. The bot's filter for what it fights, without its exclusions by kind: the player picks.
 */
export function isFoe(a: ActorView): boolean {
  if (a.kind !== 'enemy' || a.anim === 'ko' || a.hidden === true || a.puddle === true) return false;
  return a.pose !== 'rise' && a.pose !== 'fall' && a.pose !== 'climb' && a.pose !== 'severed';
}

/** Where an enemy is hit and walked to: its feet, except a Mind Flayer leg, whose tip (`aim`) is the end that strikes. */
export function footOf(a: ActorView): Vec2 {
  if ((a.id === 'flayerleg' || a.id === 'leg5') && a.aim) return { x: a.aim.x, y: a.aim.y };
  return { x: a.x, y: a.y };
}

/** Whether the world point w is inside the box around a foot, lifted by the actor's height off the ground. */
function inBox(f: Vec2, z: number, box: Box, w: Vec2): boolean {
  const base = f.y - z;
  return Math.abs(w.x - f.x) <= box.hw && w.y >= base - box.up && w.y <= base + DOWN;
}

/** Distance from w to the middle of the body that stands at foot f and hovers z px above it. */
function bodyDist(f: Vec2, z: number, w: Vec2): number {
  return Math.hypot(w.x - f.x, w.y - (f.y - z - BODY_Y));
}

/**
 * What is at the world point `w`. An enemy whose box holds it wins, then a hero who is standing; where boxes overlap, the body
 * centre nearest the point wins. Anything else is ground at `w`.
 */
export function pickAt(view: SimView, w: Vec2): Pick {
  let foe: ActorView | null = null, foot: Vec2 = w, foeD = Infinity;
  let hero: ActorView | null = null, heroD = Infinity;
  for (const a of view.actors) {
    if (a.kind === 'enemy') {
      if (!isFoe(a)) continue;
      const f = footOf(a);
      if (!inBox(f, a.z, BIG[a.id as EnemyKind] ?? ENEMY_BOX, w)) continue;
      const d = bodyDist(f, a.z, w);
      if (d < foeD) { foe = a; foot = f; foeD = d; }
    } else if (a.kind === 'hero' && a.anim !== 'ko') {
      if (!inBox(a, a.z, HERO_BOX, w)) continue;
      const d = bodyDist(a, a.z, w);
      if (d < heroD) { hero = a; heroD = d; }
    }
  }
  if (foe) return { kind: 'enemy', id: foe.id as EnemyKind, x: foot.x, y: foot.y };
  if (hero) return { kind: 'hero', id: hero.id as HeroId };
  return { kind: 'ground', x: w.x, y: w.y };
}
