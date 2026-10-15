// Grigori, the 3.2 mini-boss (docs/level-8.md, "Grigori"). One brain for all his moves:
//
//   walk: he comes straight at the hero and always turns to face him at once, except while he recovers. A hit from inside 70 degrees
//     of his front deals a quarter (enemies/grigori_hit.ts).
//   haymaker: at 28 px, 30 frames under the red "!", then an arc in front of him (reach 32, half angle 70, power 1.2, knockback 5,
//     `slam`). Then 50 frames of recovery in which he doesn't turn: the window to get behind him.
//   grab: about every 220 frames, with the hero 30 to 80 px away and a clear line: 24 frames of wind-up (pose 'grab', the "!"),
//     then a 12 frame lunge at 3.5 px a frame along the line locked when the wind-up began. On contact with a hero he can take, he holds
//     him for 45 frames (pose 'grab', the `grab` sfx) and throws him (power 1.0, knockback 6). A swap frees the hero, so does anything
//     that stuns, staggers or confuses Grigori (enemies/hold.ts). A miss or a throw leaves him recovering for 36 frames, not turning.
//   rage: at half HP he walks at 0.9, recovers in 36 frames from a haymaker and grabs about every 160.
//   stun: the power box (combat/powerbox.ts, grigori_hit.ts). Pose 'stun' for 180 frames.
// Hits don't stagger him or break a wind-up (poise). Word vomit staggers him for 30 frames; Nancy's traps don't hold him.
import type { AnimId } from '../core/types.ts';
import type { Enemy, GrigoriState, Hero, S } from '../combat/state.ts';
import { angleDiff, dist, los, moveBody } from '../combat/space.ts';
import { dust, floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { bringUp, howlSpots } from '../combat/spawns.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { beginHold, canGrab, isHolding, releaseHold } from './hold.ts';
import { DIR_ANGLE } from './shield.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.grigori;
const X = DEF.x;
const RAD = Math.PI / 180;
/** Frames of the swing pose at the start of the haymaker's recovery (anim 'attack' without the "!"). */
const SWING_POSE = 12;

/** n, give or take a tenth: so the moves don't fall into lockstep. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

function begin(e: Enemy, g: GrigoriState, move: GrigoriState['move'], frames: number, mode: Enemy['mode'], anim: AnimId): void {
  g.move = move;
  g.t = frames;
  e.mode = mode;
  setEnemyAnim(e, anim);
}

const toWalk = (e: Enemy, g: GrigoriState): void => begin(e, g, 'walk', 0, 'chase', 'idle');
const toRecover = (e: Enemy, g: GrigoriState, frames: number): void => begin(e, g, 'recover', frames, 'recover', 'idle');

/** Frames of the haymaker's recovery. */
const hayRecover = (g: GrigoriState): number => (g.raged ? X.rageRecover : X.recover);

// ---------------------------------------------------------------- haymaker
function startHay(s: S, e: Enemy, g: GrigoriState): void {
  begin(e, g, 'hay', DEF.windup, 'windup', 'attack');
  e.cd = jitter(s, DEF.cooldown);
  sfx(s, 'alert');
}

function haymaker(s: S, e: Enemy, g: GrigoriState, hero: Hero): void {
  const ang = DIR_ANGLE[e.dir];
  sfx(s, 'slam');
  shake(s, 3);
  sparks(s, e.x + Math.cos(ang) * 20, e.y - 10 + Math.sin(ang) * 20, 4);
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.reach && angleDiff(toHero, ang) <= X.arc * RAD && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb);
  }
  toRecover(e, g, hayRecover(g));
  setEnemyAnim(e, 'attack');
}

// ---------------------------------------------------------------- grab
/** Plants and locks the line through where the hero stands now. He will lunge along it whatever the hero does. */
function startGrab(s: S, e: Enemy, g: GrigoriState, hero: Hero): void {
  const a = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.ax = Math.cos(a) * X.lungeSpeed;
  e.ay = Math.sin(a) * X.lungeSpeed;
  begin(e, g, 'grab', X.grabWindup, 'windup', 'attack');
  g.grabCd = jitter(s, g.raged ? X.grabLow : X.grabEvery);
  sfx(s, 'alert');
}

function lunge(s: S, e: Enemy, g: GrigoriState, hero: Hero): void {
  const mx = moveBody(s, e, e.ax, 0), my = moveBody(s, e, 0, e.ay);
  if ((s.frame & 3) === 0) dust(s, e.x, e.y, 1);
  if (canGrab(s, hero) && Math.abs(e.x - hero.x) < 13 && Math.abs(e.y - hero.y) < 11) {
    beginHold(s, e, hero);
    begin(e, g, 'hold', 0, 'recover', 'attack');
    return;
  }
  const blockedX = Math.abs(e.ax) > 0.3 && mx < Math.abs(e.ax) - 0.01;
  const blockedY = Math.abs(e.ay) > 0.3 && my < Math.abs(e.ay) - 0.01;
  if (blockedX || blockedY) { sfx(s, 'thud'); dust(s, e.x, e.y, 4); toRecover(e, g, X.grabRecover); return; }
  if (--g.t <= 0) toRecover(e, g, X.grabRecover);
}

/** The hold is over: he throws the hero. The shove lands even if the hit didn't (another hit left him invulnerable). */
function throwHero(s: S, e: Enemy, g: GrigoriState, hero: Hero): void {
  releaseHold(s, e);
  const a = Math.atan2(hero.y - e.y, hero.x - e.x);
  if (hurtHero(s, hero, e.x, e.y, X.throwPower, e.atk, X.throwKb) <= 0 && !hero.ko) {
    hero.vx += Math.cos(a) * X.throwKb;
    hero.vy += Math.sin(a) * X.throwKb;
  }
  sfx(s, 'slam');
  shake(s, 4);
  dust(s, hero.x, hero.y, 5);
  toRecover(e, g, X.grabRecover);
}

// ---------------------------------------------------------------- the brain
function rage(s: S, e: Enemy, g: GrigoriState): void {
  g.raged = true;
  // He calls his men: X.call soldiers come in round him, run-time spawns like the Alpha's pack (1 XP each, never skipped on a retry).
  // A careful player sidesteps every haymaker, so without them the second half of the fight never threatened anyone.
  if (X.call > 0) bringUp(s, 'howl', 'guards', 'soldier', undefined, howlSpots(s, e.x, e.y), X.call);
  floater(s, 'RAGE', e.x, e.y - 34, 'hot', true, 60);
  sfx(s, 'roar');
  shake(s, 4);
  flashScreen(s, 0.15);
}

export function grigoriUpdate(s: S, e: Enemy, hero: Hero): void {
  const g = e.grigori as GrigoriState;
  if (g.grabCd > 0) g.grabCd--;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (!g.raged && e.hp <= e.hpMax * X.rageAt) rage(s, e, g);
  // Something let the hero go (a swap, a stun, Word vomit): the hold is over.
  if (g.move === 'hold' && !isHolding(s, e)) toRecover(e, g, X.grabRecover);
  switch (g.move) {
    case 'walk': {
      e.mode = 'chase';
      faceHero(e, hero);
      if (clear && !hero.ko) {
        if (e.cd <= 0 && d <= X.range) { startHay(s, e, g); return; }
        if (g.grabCd <= 0 && d >= X.grabMin && d <= X.grabMax && canGrab(s, hero)) { startGrab(s, e, g, hero); return; }
      }
      if (d > X.hold || !clear) {
        const sp = (g.raged ? X.rageSpeed : DEF.speed) * e.spd * speedMul(e.stat);
        const moved = chaseHero(s, e, hero, sp, clear);
        faceHero(e, hero);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        setEnemyAnim(e, 'idle');
      }
      return;
    }
    case 'hay':
      faceHero(e, hero);
      if (--g.t <= 0) haymaker(s, e, g, hero);
      return;
    case 'grab':
      faceHero(e, hero);
      if (--g.t <= 0) begin(e, g, 'lunge', X.lungeT, 'lunge', 'dash');
      return;
    case 'lunge': lunge(s, e, g, hero); return;
    case 'hold':
      setEnemyAnim(e, 'attack');
      if (++g.t >= X.holdT) throwHero(s, e, g, hero);
      return;
    case 'recover':
      if (e.anim === 'attack' && hayRecover(g) - g.t >= SWING_POSE - 1) setEnemyAnim(e, 'idle');
      if (--g.t <= 0) toWalk(e, g);
      return;
    case 'stun':
      setEnemyAnim(e, 'hurt');
      if (--g.t <= 0) toWalk(e, g);
      return;
  }
}
