// Vecna in phase one of the final boss (docs/level-16.md, stage 5.3). THE SEAM FOR 4.4's VECNA: this file is a stand-in, a fast caster with two
// moves, and it is the only place that knows how he fights. enemies/ai.ts calls `vecnaUpdate` and combat/kills.ts calls `clearVecna` and nothing
// else reads his moves, so the lead swaps chapter 4's Vecna kit in by replacing the body of these two functions. The kit runs at VECNA_SPEED times
// its own tempo and chimes the clock every VECNA_CHIME frames; the stand-in has no curse (chapter 4's), so it ignores the chime.
//
//   walk: closes on the hero to `near` px and circles him there, at 0.9 x 1.3 px a frame.
//   blast: with a clear line and the hero inside the blast's radius, a warning ring grows for blastWind frames (the 'ring' fx, life blastWind, w the
//     blast's diameter, anim 'cast' and the red "!"), then a 'nova' goes off round him: a hero inside it takes his power and a shove of blastKb.
//   orb: with a clear line and the hero at least orbMin px off, orbWind frames of cast, then orbN slow orbs fanned orbFan radians apart ('orb' fx, Proj
//     kind 'orb', orbSpeed px a frame) that turn toward the active hero by orbTurn rad a frame for orbLife frames. Each hits a hero it touches for orbPower.
//   The numbers are in enemies/defs.ts (vecna5): sized so the careful bot sidesteps almost all of it and the careless one pays for it.
//   0 HP: he sinks. kills.ts keeps his body for sinkT frames in anim 'ko' (the art's sink) and takes his orbs out of the air; the finale
//     (combat/finale.ts) wakes the Mind Flayer a beat into the sink.
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { BODY_Y, dist, los } from '../combat/space.ts';
import { addFx, dust, sfx, shake } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import type { FinState } from './fin_state.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';

const DEF = ENEMY_DEFS.vecna5;
const X = DEF.x;

/** How much faster than 4.4's Vecna this one is, and the frames between the clock's chimes (12 s) in the kit that is swapped in. */
export const VECNA_SPEED = 1.3;
export const VECNA_CHIME = 720;

const TAU = Math.PI * 2;

function begin(e: Enemy, f: FinState, move: FinState['move'], frames: number, mode: Enemy['mode']): void {
  f.move = move;
  f.t = frames;
  e.mode = mode;
}

function toRecover(e: Enemy, f: FinState, frames: number): void {
  begin(e, f, 'recover', frames, 'recover');
  setEnemyAnim(e, 'idle');
}

/** The orbs still in the air turn toward the active hero's chest, a little each frame. */
function steerOrbs(s: S, f: FinState, hero: Hero): void {
  if (f.orbs.length === 0) return;
  f.orbs = f.orbs.filter((p) => s.projs.includes(p));
  for (const p of f.orbs) {
    const speed = Math.hypot(p.vx, p.vy), now = Math.atan2(p.vy, p.vx);
    let d = (Math.atan2(hero.y - BODY_Y - p.y, hero.x - p.x) - now) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    const a = now + Math.max(-X.orbTurn, Math.min(X.orbTurn, d));
    p.vx = Math.cos(a) * speed;
    p.vy = Math.sin(a) * speed;
  }
}

function startBlast(s: S, e: Enemy, f: FinState): void {
  begin(e, f, 'blast', X.blastWind, 'windup');
  f.blastCd = X.blastCd;
  addFx(s, 'ring', e.x, e.y, e.dir, 0, X.blastWind, X.blastR * 2, X.blastR);
  sfx(s, 'alert');
  setEnemyAnim(e, 'cast');
}

function fireBlast(s: S, e: Enemy, f: FinState, hero: Hero): void {
  addFx(s, 'nova', e.x, e.y - BODY_Y, e.dir, 0, 20, X.blastR * 2, X.blastR * 2);
  sfx(s, 'slam');
  shake(s, 3);
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.blastR) hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.blastKb);
  toRecover(e, f, X.blastRecover);
}

function startOrb(s: S, e: Enemy, f: FinState): void {
  begin(e, f, 'orb', X.orbWind, 'windup');
  f.orbCd = X.orbCd;
  sfx(s, 'alert');
  setEnemyAnim(e, 'cast');
}

function fireOrb(s: S, e: Enemy, f: FinState, hero: Hero): void {
  const aim = Math.atan2(hero.y - BODY_Y - (e.y - BODY_Y), hero.x - e.x);
  // orbN orbs fan out orbFan radians apart, each turning toward the hero from there.
  for (let k = 0; k < X.orbN; k++) {
    const a = aim + (k - (X.orbN - 1) / 2) * X.orbFan;
    const p = newProj({
      kind: 'orb', mine: false, x: e.x + Math.cos(a) * 6, y: e.y - BODY_Y + Math.sin(a) * 6, vx: Math.cos(a) * X.orbSpeed, vy: Math.sin(a) * X.orbSpeed,
      life: X.orbLife, r: X.orbR, power: X.orbPower, atk: e.atk, kb: X.orbKb, ox: e.x, oy: e.y,
    });
    s.projs.push(p);
    f.orbs.push(p);
  }
  sfx(s, 'acid');
  toRecover(e, f, X.orbRecover);
}

/** Walks to `near` px of the hero and circles him there; when he is far, closes at full pace. */
function walk(s: S, e: Enemy, f: FinState, hero: Hero, d: number, clear: boolean): void {
  e.mode = 'chase';
  const pace = DEF.speed * VECNA_SPEED * e.spd * speedMul(e.stat);
  if (d > X.near) {
    setEnemyAnim(e, chaseHero(s, e, hero, pace, clear) > 0 ? 'walk' : 'idle');
  } else {
    // The way round turns over every 120 frames.
    if (s.frame % 120 === 0) f.side = f.side === 1 ? -1 : 1;
    const phi = Math.atan2(e.y - hero.y, e.x - hero.x) + f.side * 0.45;
    setEnemyAnim(e, stepToward(s, e, hero.x + Math.cos(phi) * (X.near - 4), hero.y + Math.sin(phi) * (X.near - 4), pace * 0.8) > 0 ? 'walk' : 'idle');
  }
  faceHero(e, hero);
}

/** One tick of Vecna's brain (enemies/ai.ts). He is awake from the moment his group wakes. */
export function vecnaUpdate(s: S, e: Enemy, hero: Hero): void {
  const f = e.fin as FinState;
  steerOrbs(s, f, hero);
  if (f.blastCd > 0) f.blastCd--;
  if (f.orbCd > 0) f.orbCd--;
  if (!e.aware) alertEnemy(s, e);
  switch (f.move) {
    case 'blast':
      faceHero(e, hero);
      setEnemyAnim(e, 'cast');
      if (--f.t <= 0) fireBlast(s, e, f, hero);
      return;
    case 'orb':
      faceHero(e, hero);
      setEnemyAnim(e, 'cast');
      if (--f.t <= 0) fireOrb(s, e, f, hero);
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--f.t <= 0) { f.move = 'walk'; e.mode = 'chase'; }
      return;
    default: {
      const d = dist(e.x, e.y, hero.x, hero.y);
      const clear = los(s, e.x, e.y, hero.x, hero.y);
      walk(s, e, f, hero, d, clear);
      if (hero.ko || !clear) return;
      if (f.blastCd <= 0 && d <= X.blastR - 6) startBlast(s, e, f);
      else if (f.orbCd <= 0 && d >= X.orbMin && d <= 320) startOrb(s, e, f);
    }
  }
}

/** Called when he dies (combat/kills.ts): the orbs still in the air go out, and the floor takes him. */
export function clearVecna(s: S, e: Enemy): void {
  if (e.kind !== 'vecna5' || !e.fin) return;
  s.projs = s.projs.filter((p) => !e.fin?.orbs.includes(p));
  e.fin.orbs = [];
  e.dir = dirOfVec(0, 1, e.dir);
  dust(s, e.x, e.y, 6);
  sfx(s, 'shatter');
  shake(s, 4);
}
