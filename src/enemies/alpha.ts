// The Demodog Alpha, chapter 2's boss (docs/level-6.md). One brain for all its moves:
//
//   bite: walks at the hero and, up close, winds up for 24 frames under the red "!", then an arc in front of it.
//   lunge: about every 120 frames, with the hero 50 to 120 px away: it plants for 30 frames under the "!" facing a line that was
//     locked when the wind-up started, then runs 18 frames along that line at 4.6 px a frame. A hero who steps off the line in
//     the wind-up isn't touched. It hurts a hero in the way, stops at a wall and isn't stunned.
//   pounce: about every 240 frames (150 below half HP): it crouches 30 frames (pose 'crouch'), then leaps (pose 'leap', z rises
//     and falls) onto the hero's spot with a 'mark' growing there for the 40 frames it's in the air. The landing is a 36 px
//     shockwave, then it's dazed for 40 frames (pose 'stun') and takes 50 percent more damage.
//   howl: at 75, 50 and 25 percent HP, once each, it stops where it is for 50 frames (pose 'howl', anim 'cast'), with a 'howl' fx
//     ring, the 'howl' sfx and a { t: 'howl' } event, and takes double damage. Three young demodogs climb out of the three
//     burrows nearest it (combat/spawns.ts).
//
// Hits don't stun it or break a wind-up (enemies/alpha_hit.ts). Effects it adds to the view, for gfx: 'mark' (a dark ring on the
// floor that grows over its life: w is its final diameter, h its radius), 'ring' for the landing's shockwave and 'howl' (w the
// diameter the ring grows to, h its radius).
import type { AnimId } from '../core/types.ts';
import { ENEMY_DEFS } from './defs.ts';
import type { AlphaMove, AlphaState, Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { angleDiff, dist, los, moveBody } from '../combat/space.ts';
import { addFx, dust, flashScreen, floater, sfx, shake, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { bringUp, howlSpots } from '../combat/spawns.ts';
import { speedMul } from '../combat/status.ts';
import { HOWL_AT } from './alpha_hit.ts';
import { DIR_ANGLE } from './shield.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.alpha;
const X = DEF.x;
const RAD = Math.PI / 180;
/** Frames of the swing pose at the start of the bite's recovery (anim 'attack' without the "!"). */
const SWING_POSE = 12;

/** n, give or take a tenth: so the moves don't fall into lockstep. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

/** Starts a move: how long it lasts, the enemy mode the rest of the sim sees (windup shows the red "!") and the base anim. */
function begin(e: Enemy, a: AlphaState, move: AlphaMove, frames: number, mode: Enemy['mode'], anim: AnimId): void {
  a.move = move;
  a.t = frames;
  e.mode = mode;
  setEnemyAnim(e, anim);
}

function toWalk(e: Enemy, a: AlphaState): void { begin(e, a, 'walk', 0, 'chase', 'idle'); }

function toRecover(e: Enemy, a: AlphaState, frames: number): void { begin(e, a, 'recover', frames, 'recover', 'idle'); }

// ---------------------------------------------------------------- bite
function startBite(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  e.dir = dirOfVec(hero.x - e.x, hero.y - e.y, e.dir);
  begin(e, a, 'bite', DEF.windup, 'windup', 'attack');
  e.cd = jitter(s, DEF.cooldown);
  sfx(s, 'alert');
}

function bite(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  const ang = DIR_ANGLE[e.dir];
  sfx(s, 'chomp');
  sparks(s, e.x + Math.cos(ang) * 16, e.y - 10 + Math.sin(ang) * 16, 3);
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  if (dist(e.x, e.y, hero.x, hero.y) <= X.reach && angleDiff(toHero, ang) <= X.arc * RAD && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb);
  }
  toRecover(e, a, X.recover);
  setEnemyAnim(e, 'attack');
}

// ---------------------------------------------------------------- lunge
/** Plants and locks the line through where the hero stands now. It will run along it whatever the hero does. */
function startLunge(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  const ang = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.ax = Math.cos(ang) * X.lungeSpeed;
  e.ay = Math.sin(ang) * X.lungeSpeed;
  e.dir = dirOfVec(e.ax, e.ay, e.dir);
  begin(e, a, 'wind', X.lungeWindup, 'windup', 'attack');
  sfx(s, 'alert');
}

function launch(s: S, e: Enemy, a: AlphaState): void {
  e.hitDone = false;
  begin(e, a, 'run', X.lungeT, 'lunge', 'dash');
  sfx(s, 'lunge');
}

function endLunge(s: S, e: Enemy, a: AlphaState): void {
  a.lungeCd = jitter(s, X.lungeEvery);
  toRecover(e, a, X.lungeRecover);
}

function run(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  const mx = moveBody(s, e, e.ax, 0), my = moveBody(s, e, 0, e.ay);
  if ((s.frame & 3) === 0) dust(s, e.x, e.y, 1);
  // A hero in the way is hurt once. The lunge doesn't stop for him.
  if (!e.hitDone && !hero.ko && Math.abs(e.x - hero.x) < 13 && Math.abs(e.y - hero.y) < 11) {
    e.hitDone = true;
    if (hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, X.lungePower, e.atk, X.lungeKb) > 0) sfx(s, 'chomp');
  }
  // A wall ends it. It isn't stunned.
  const blockedX = Math.abs(e.ax) > 0.3 && mx < Math.abs(e.ax) - 0.01;
  const blockedY = Math.abs(e.ay) > 0.3 && my < Math.abs(e.ay) - 0.01;
  if (blockedX || blockedY) { sfx(s, 'thud'); dust(s, e.x, e.y, 4); endLunge(s, e, a); return; }
  if (--a.t <= 0) endLunge(s, e, a);
}

// ---------------------------------------------------------------- pounce
function startPounce(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, a, 'crouch', X.crouch, 'windup', 'attack');
  sfx(s, 'alert');
}

/** The crouch is over: leap onto the spot where the hero stands now, with a mark growing there. */
function leap(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  a.sx = e.x; a.sy = e.y; a.tx = hero.x; a.ty = hero.y;
  a.mark = addFx(s, 'mark', a.tx, a.ty, 'down', 0, X.air + 1, X.shock * 2, X.shock);
  begin(e, a, 'air', X.air, 'lunge', 'dash');
  sfx(s, 'lunge');
}

function air(s: S, e: Enemy, a: AlphaState, hero: Hero): void {
  a.t--;
  const p = Math.min(1, (X.air - a.t) / X.air);
  e.x = a.sx + (a.tx - a.sx) * p;
  e.y = a.sy + (a.ty - a.sy) * p;
  e.z = 4 * X.height * p * (1 - p);
  if (a.t > 0) return;
  e.x = a.tx; e.y = a.ty; e.z = 0;
  sfx(s, 'thud');
  shake(s, 6);
  dust(s, e.x, e.y, 8);
  addFx(s, 'ring', e.x, e.y, e.dir, 0, 14, X.shock * 2, X.shock);
  // The shockwave does not go through walls.
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.shock && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, X.pouncePower, e.atk, X.pounceKb);
  }
  const mark = a.mark;
  if (mark) s.fx = s.fx.filter((f) => f !== mark);
  a.mark = null;
  a.pounceCd = jitter(s, e.hp <= e.hpMax * 0.5 ? X.pounceLow : X.pounceEvery);
  a.lungeCd = Math.max(a.lungeCd, 45);
  e.cd = Math.max(e.cd, 30);
  floater(s, 'DAZED', e.x, e.y - 34, 'yellow', false, 44);
  begin(e, a, 'stun', X.stunT, 'recover', 'hurt');
}

// ---------------------------------------------------------------- howl
function startHowl(s: S, e: Enemy, a: AlphaState): void {
  a.howls++;
  begin(e, a, 'howl', X.howlT, 'recover', 'cast');
  addFx(s, 'howl', e.x, e.y, e.dir, 0, X.howlT, X.howlRing, X.howlRing / 2);
  sfx(s, 'howl');
  shake(s, 3);
  flashScreen(s, 0.15);
  dust(s, e.x, e.y, 6);
  s.events.push({ t: 'howl', spawnId: e.id });
  bringUp(s, 'howl', `howl${a.howls}`, 'demodog', undefined, howlSpots(s, e.x, e.y), X.pack);
}

// ---------------------------------------------------------------- the brain
function stalk(s: S, e: Enemy, a: AlphaState, hero: Hero, d: number, clear: boolean): void {
  e.mode = 'chase';
  // One howl per threshold. A hit big enough to skip one starts the next as soon as this one is done.
  if (a.howls < HOWL_AT.length && e.hp <= e.hpMax * (HOWL_AT[a.howls] as number)) { startHowl(s, e, a); return; }
  if (clear) {
    if (a.pounceCd <= 0 && d >= X.pounceMin && d <= X.pounceMax) { startPounce(s, e, a, hero); return; }
    if (a.lungeCd <= 0 && d >= X.lungeMin && d <= X.lungeMax) { startLunge(s, e, a, hero); return; }
    if (e.cd <= 0 && d <= X.range) { startBite(s, e, a, hero); return; }
  }
  // Close but round a corner: no attack lands without a line, so it keeps coming until it has one.
  if (d > X.hold || !clear) {
    const moved = chaseHero(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
  } else {
    faceHero(e, hero);
    setEnemyAnim(e, 'idle');
  }
}

export function alphaUpdate(s: S, e: Enemy, hero: Hero): void {
  const a = e.alpha as AlphaState;
  if (a.lungeCd > 0) a.lungeCd--;
  if (a.pounceCd > 0) a.pounceCd--;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  switch (a.move) {
    case 'walk': stalk(s, e, a, hero, d, clear); return;
    case 'bite': if (--a.t <= 0) bite(s, e, a, hero); return;
    case 'wind': if (--a.t <= 0) launch(s, e, a); return;
    case 'run': run(s, e, a, hero); return;
    case 'crouch': faceHero(e, hero); if (--a.t <= 0) leap(s, e, a, hero); return;
    case 'air': air(s, e, a, hero); return;
    case 'howl': case 'stun': if (--a.t <= 0) toWalk(e, a); return;
    case 'recover':
      if (e.anim === 'attack' && X.recover - a.t >= SWING_POSE - 1) setEnemyAnim(e, 'idle');
      if (--a.t <= 0) toWalk(e, a);
      return;
  }
}
