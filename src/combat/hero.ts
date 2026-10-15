// The active hero each tick: timers, movement, attack and special, animation, regen, and the follower trail.
import type { AnimId, Dir, SimInput } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { speedFactor } from '../heroes/common.ts';
import { useBasic, useSpecial } from '../heroes/kit.ts';
import type { Hero, S } from './state.ts';
import { activeHero, dirOfAngle, dirOfVec, snap8 } from './state.ts';
import { footBlocked, los, moveBody } from './space.ts';
import { floater, sfx } from './fx.ts';
import { speedMul } from './status.ts';
import { pokeAimed, trackBump } from './pokes.ts';
import { smashAimed } from './props.ts';
import { drinkCoke } from './pickups.ts';
import { endDash, stepDash } from '../heroes/skate.ts';
import { isHeld } from '../enemies/hold.ts';
import { holdsSpecial, readHold, useVariant, variantMp, variantReady } from '../heroes/hold.ts';

export const DEADZONE = 0.15;
const INPUT_BUFFER = 8;
const TRAIL = 256;

export function setAnim(h: Hero, anim: AnimId): void {
  if (h.anim !== anim) { h.anim = anim; h.animT = 0; }
}

/** Records edge-triggered presses for a few ticks so a press during hit-stop or a cooldown is not lost. */
export function bufferInput(s: S, input: SimInput): void {
  const b = s.buf;
  b.attack = input.attackPressed ? INPUT_BUFFER : Math.max(0, b.attack - 1);
  b.special = input.specialPressed ? INPUT_BUFFER : Math.max(0, b.special - 1);
  b.burst = input.burstPressed ? INPUT_BUFFER : Math.max(0, b.burst - 1);
  if (input.swapTo >= 0) { b.swapT = INPUT_BUFFER; b.swapTo = input.swapTo; b.swapDelta = 0; }
  else if (input.swapDelta !== 0) { b.swapT = INPUT_BUFFER; b.swapDelta = input.swapDelta; b.swapTo = -1; }
}

function checkNosebleed(s: S, h: Hero): void {
  if (h.id !== 'eleven') return;
  const low = h.mp < h.st.mp * 0.25;
  if (low && !h.nosebled) sfx(s, 'nosebleed');
  h.nosebled = low;
}

/** A held Special has filled its ring (heroes/hold.ts): the variant, through the same MP and Coke path as the Special. */
function castVariant(s: S, h: Hero): void {
  h.holdT = -1;
  if (!variantReady(s, h)) {
    sfx(s, 'noMp');
    floater(s, 'NOT YET', h.x, h.y - 18, 'mist', false, 28);
    return;
  }
  const cost = variantMp(h);
  if (h.mp < cost) drinkCoke(s, h);
  if (h.mp < cost) {
    sfx(s, 'noMp');
    floater(s, 'NO MP', h.x, h.y - 18, 'mist', false, 28);
    return;
  }
  h.mp -= cost;
  useVariant(s, h);
  checkNosebleed(s, h);
}

function tryActions(s: S, h: Hero, input: SimInput): void {
  const def = HERO_DEFS[h.id];
  const casting = h.act === 'special' && h.actT > 0;
  if (holdsSpecial(h) && readHold(s, h, input) && !casting && h.cdSpecial <= 0) {
    castVariant(s, h);
    return;
  }
  if (!casting && s.buf.special > 0 && h.cdSpecial <= 0) {
    s.buf.special = 0;
    // Short of MP with a Coke in the stash: drink it, and the special fires on this press if that was enough.
    if (h.mp < def.special.mp) drinkCoke(s, h);
    if (h.mp >= def.special.mp) {
      h.mp -= def.special.mp;
      // A special that does no damage (the DM screen) is not a try at anything.
      if (def.special.power > 0) pokeAimed(s, h, def.special.reach);
      useSpecial(s, h);
      checkNosebleed(s, h);
      return;
    }
    sfx(s, 'noMp');
    floater(s, 'NO MP', h.x, h.y - 18, 'mist', false, 28);
  }
  const wantsBasic = s.buf.attack > 0 || input.attackHeld;
  if (!casting && wantsBasic && h.cdBasic <= 0) {
    s.buf.attack = 0;
    // Smash first: a prop it lights is solved, so the same swing doesn't also count as the wrong hero trying it.
    smashAimed(s, h);
    pokeAimed(s, h, def.basic.reach);
    useBasic(s, h);
  }
}

export function updateActive(s: S, input: SimInput): void {
  const h = activeHero(s);
  const def = HERO_DEFS[h.id];
  if (h.ko) return;
  if (h.cdBasic > 0) h.cdBasic--;
  if (h.cdSpecial > 0) h.cdSpecial--;
  if (h.comboT > 0 && --h.comboT === 0) h.combo = 0;
  if (h.invuln > 0 && --h.invuln === 0) h.blink = false;
  if (h.hurtT > 0) h.hurtT--;
  if (h.actT > 0 && --h.actT === 0) h.act = null;
  // Max's roll ends with her action timer. Anything that cut the action short ended it for good.
  if (h.dash && h.actT <= 0) endDash(s, h);
  if (h.flash > 0) h.flash = Math.max(0, h.flash - 0.12);
  if (h.z > 0) h.z = Math.max(0, h.z - 1.5);
  h.animT++;

  const mag = Math.hypot(input.mx, input.my);
  const live = mag > DEADZONE;
  const ux = live ? input.mx / mag : 0;
  const uy = live ? input.my / mag : 0;
  const x0 = h.x, y0 = h.y;
  let meant = 0;

  // A hero a Flayed or Grigori holds can't walk, swing or cast until it lets go (enemies/hold.ts).
  const held = isHeld(s, h);
  if (h.hurtT <= 0 && !held) {
    // A rolling Max goes where she was aimed: the stick does not steer her, turn her or walk her.
    if (live && !h.dash) {
      h.aim = snap8(Math.atan2(uy, ux));
      h.dir = dirOfAngle(h.aim);
      // The way he is walking, from his input. Followers rest on the opposite side when he stops.
      s.walkDir = dirOfVec(ux, uy, s.walkDir);
    }
    tryActions(s, h, input);
    if (h.dash) {
      stepDash(s, h);
    } else {
      const lock = h.actT > 0 ? h.lock : 1;
      const sp = def.speed * speedFactor(h) * speedMul(h.stat) * lock * Math.min(1, mag);
      if (live) { moveBody(s, h, ux * sp, uy * sp, true); meant = sp; }
    }
  }
  if (h.vx !== 0 || h.vy !== 0) {
    moveBody(s, h, h.vx, h.vy);
    h.vx *= 0.78; h.vy *= 0.78;
    if (Math.hypot(h.vx, h.vy) < 0.1) { h.vx = 0; h.vy = 0; }
  }
  h.moving = Math.hypot(h.x - x0, h.y - y0) > 0.1;
  trackBump(s, h, live ? ux : 0, live ? uy : 0, meant, Math.hypot(h.x - x0, h.y - y0));

  let anim: AnimId = 'idle';
  if (h.hurtT > 0 || held) anim = 'hurt';
  else if (h.dash) anim = 'dash';
  else if (h.actT > 0 && h.act) anim = h.act === 'special' ? 'cast' : 'attack';
  else if (h.moving) anim = 'walk';
  setAnim(h, anim);
}

/** MP and HP regeneration: 4 percent MP a second for the active hero, 6 and 2 percent for the bench. */
export function regen(s: S): void {
  for (let i = 0; i < s.heroes.length; i++) {
    const h = s.heroes[i] as Hero;
    if (h.ko) continue;
    if (i === s.active) {
      h.mp = Math.min(h.st.mp, h.mp + (h.st.mp * 0.04) / 60);
    } else {
      h.mp = Math.min(h.st.mp, h.mp + (h.st.mp * 0.06) / 60);
      h.hp = Math.min(h.st.hp, h.hp + (h.st.hp * 0.02) / 60);
      // Cooldowns keep running on the bench, so a hero who tags back in is ready.
      if (h.cdBasic > 0) h.cdBasic--;
      if (h.cdSpecial > 0) h.cdSpecial--;
    }
    if (h.id === 'eleven' && h.mp >= h.st.mp * 0.25) h.nosebled = false;
  }
}

/** Frames the leader has to stand still before a follower that is on top of him steps out behind him. */
const STAND_FRAMES = 6;
/** How fast a follower steps out to a spot behind the leader, in px per frame. About a hero's own walking pace. */
const SETTLE_SPEED = 1;
/** The most a follower moves in a frame while trailing the leader's path. Enough to keep up with him, never a sprint. */
const TRAIL_SPEED = 2;
/**
 * How close each follower comes to the leader, in px, in party order, both while he walks and once he stops. They stack
 * up close against each other (each shows a few pixels more than the one in front of it) and never get closer than
 * this, so the leader stays clear. Because the gap is the same walking or standing, a follower who stops with him does
 * not shuffle: the ones further back finish closing their gap, and nobody ever steps away from him.
 */
const REST_GAPS = [14, 19, 24];
/** The side of a leader that is "behind" him, by the way he last walked: a leader who walked right has them to his left. */
const BEHIND: Record<Dir, readonly [number, number]> = { right: [-1, 0], left: [1, 0], down: [0, -1], up: [0, 1] };

/**
 * Where follower number `n` steps out to when it is on top of the leader (right after a swap, at the start of a level):
 * behind him, at its gap. If that spot is in a wall or out of his sight the next tries are a little to either side,
 * then closer in, then straight out to either side. Null when he is boxed in.
 */
function restSpot(s: S, lead: Hero, n: number): [number, number] | null {
  const [bx, by] = BEHIND[s.walkDir];
  const gap = REST_GAPS[Math.min(n, REST_GAPS.length - 1)] as number;
  const px = -by, py = bx;
  const tries: readonly (readonly [number, number])[] = [
    [bx * gap, by * gap], [bx * gap + px * 10, by * gap + py * 10], [bx * gap - px * 10, by * gap - py * 10],
    [bx * gap * 0.6, by * gap * 0.6], [px * 14, py * 14], [-px * 14, -py * 14],
  ];
  for (const [dx, dy] of tries) {
    const x = lead.x + dx, y = lead.y + dy;
    if (!footBlocked(s, x, y) && los(s, lead.x, lead.y, x, y)) return [x, y];
  }
  return null;
}

/**
 * Records the active hero's path and moves the bench heroes along it as cosmetic followers. Each follower walks toward
 * the point on his path a short while back, but never gets closer to him than its gap, so when he stops they stop with
 * him (or finish closing up) instead of piling onto his feet or backing away. A follower that really is on top of him
 * (after a swap, or at the start of a level) steps out to a spot behind him, at walking pace.
 */
export function updateFollowers(s: S): void {
  const a = activeHero(s);
  const dx = a.x - (s.trailX[s.trailHead] as number), dy = a.y - (s.trailY[s.trailHead] as number);
  s.standT = Math.hypot(dx, dy) < 0.05 ? s.standT + 1 : 0;
  s.trailHead = (s.trailHead + 1) % TRAIL;
  s.trailX[s.trailHead] = a.x;
  s.trailY[s.trailHead] = a.y;
  const resting = s.standT >= STAND_FRAMES;
  let k = 0;
  for (let i = 0; i < s.heroes.length; i++) {
    const h = s.heroes[i] as Hero;
    if (i === s.active || h.ko) continue;
    const n = k++;
    const gap = REST_GAPS[Math.min(n, REST_GAPS.length - 1)] as number;
    const near = Math.hypot(h.x - a.x, h.y - a.y);
    // Well inside its gap while he stands: it is on top of him. Step out behind him.
    const spot = resting && near < gap - 1.5 ? restSpot(s, a, n) : null;
    let mx = 0, my = 0;
    if (spot) {
      const ex = spot[0] - h.x, ey = spot[1] - h.y, d = Math.hypot(ex, ey);
      const step = Math.min(d, SETTLE_SPEED);
      if (d > 1e-6) { mx = (ex / d) * step; my = (ey / d) * step; }
    } else {
      const idx = (s.trailHead - (12 + 13 * n) + TRAIL * 4) % TRAIL;
      const ex = (s.trailX[idx] as number) - h.x, ey = (s.trailY[idx] as number) - h.y, d = Math.hypot(ex, ey);
      // Ease toward the path point. If that would bring it inside its gap, stop at the gap instead.
      const move = Math.min(d * 0.3, TRAIL_SPEED);
      if (d > 1e-6) { mx = (ex / d) * move; my = (ey / d) * move; }
      const after = Math.hypot(h.x + mx - a.x, h.y + my - a.y);
      if (after < gap && after < near) {
        const f = near > gap ? (near - gap) / (near - after) : 0;
        mx *= f; my *= f;
      }
    }
    const step = Math.hypot(mx, my);
    const moved = step > 0.12;
    if (step > 0) { h.x += mx; h.y += my; }
    if (moved) h.dir = dirOfVec(mx, my, h.dir);
    // Standing together after stepping out, they face the way the leader walked.
    else if (spot) h.dir = s.walkDir;
    h.moving = moved;
    h.z = 0; h.flash = Math.max(0, h.flash - 0.12);
    h.animT++;
    setAnim(h, moved ? 'walk' : 'idle');
  }
}
