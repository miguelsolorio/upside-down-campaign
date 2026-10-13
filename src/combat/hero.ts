// The active hero each tick: timers, dash, movement, attack and special, animation, regen, and the follower trail.
import type { AnimId, SimInput } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { speedFactor } from '../heroes/common.ts';
import { useBasic, useSpecial } from '../heroes/kit.ts';
import type { Hero, S } from './state.ts';
import { activeHero, dirOfAngle, dirOfVec, snap8 } from './state.ts';
import { moveBody } from './space.ts';
import { dust, floater, sfx } from './fx.ts';
import { speedMul } from './status.ts';

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
  b.dash = input.dashPressed ? INPUT_BUFFER : Math.max(0, b.dash - 1);
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

function tryDash(s: S, h: Hero, ux: number, uy: number): void {
  const d = HERO_DEFS[h.id].dash;
  if (s.buf.dash <= 0 || h.dashCd > 0 || h.dashT > 0) return;
  s.buf.dash = 0;
  const fx = ux !== 0 || uy !== 0 ? ux : Math.cos(h.aim);
  const fy = ux !== 0 || uy !== 0 ? uy : Math.sin(h.aim);
  const m = Math.hypot(fx, fy) || 1;
  h.dashX = fx / m; h.dashY = fy / m;
  h.dashT = d.dur;
  h.dashCd = d.cd;
  if (h.invuln <= 0) h.blink = false;
  h.invuln = Math.max(h.invuln, d.iframes);
  h.actId++; h.actT = 0; h.act = null;
  h.dir = dirOfVec(h.dashX, h.dashY, h.dir);
  sfx(s, 'dash');
  dust(s, h.x, h.y, 3);
}

function tryActions(s: S, h: Hero, input: SimInput): void {
  const def = HERO_DEFS[h.id];
  const casting = h.act === 'special' && h.actT > 0;
  if (!casting && s.buf.special > 0 && h.cdSpecial <= 0) {
    s.buf.special = 0;
    if (h.mp >= def.special.mp) {
      h.mp -= def.special.mp;
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
    useBasic(s, h);
  }
}

export function updateActive(s: S, input: SimInput): void {
  const h = activeHero(s);
  const def = HERO_DEFS[h.id];
  if (h.ko) return;
  if (h.dashCd > 0) h.dashCd--;
  if (h.cdBasic > 0) h.cdBasic--;
  if (h.cdSpecial > 0) h.cdSpecial--;
  if (h.comboT > 0 && --h.comboT === 0) h.combo = 0;
  if (h.invuln > 0 && --h.invuln === 0) h.blink = false;
  if (h.hurtT > 0) h.hurtT--;
  if (h.actT > 0 && --h.actT === 0) h.act = null;
  if (h.flash > 0) h.flash = Math.max(0, h.flash - 0.12);
  if (h.z > 0) h.z = Math.max(0, h.z - 1.5);
  h.animT++;

  const mag = Math.hypot(input.mx, input.my);
  const live = mag > DEADZONE;
  const ux = live ? input.mx / mag : 0;
  const uy = live ? input.my / mag : 0;
  const x0 = h.x, y0 = h.y;

  if (h.hurtT <= 0) {
    if (live && h.dashT <= 0) {
      h.aim = snap8(Math.atan2(uy, ux));
      h.dir = dirOfAngle(h.aim);
    }
    tryDash(s, h, ux, uy);
  }
  if (h.dashT > 0) {
    h.dashT--;
    moveBody(s, h, h.dashX * def.dash.speed, h.dashY * def.dash.speed);
    if (h.dashT % 3 === 0) dust(s, h.x, h.y, 1);
  } else if (h.hurtT <= 0) {
    tryActions(s, h, input);
    const lock = h.actT > 0 ? h.lock : 1;
    const sp = def.speed * speedFactor(h) * speedMul(h.stat) * lock * Math.min(1, mag);
    if (live) moveBody(s, h, ux * sp, uy * sp, true);
  }
  if (h.vx !== 0 || h.vy !== 0) {
    moveBody(s, h, h.vx, h.vy);
    h.vx *= 0.78; h.vy *= 0.78;
    if (Math.hypot(h.vx, h.vy) < 0.1) { h.vx = 0; h.vy = 0; }
  }
  h.moving = Math.hypot(h.x - x0, h.y - y0) > 0.1;

  let anim: AnimId = 'idle';
  if (h.hurtT > 0) anim = 'hurt';
  else if (h.dashT > 0) anim = 'dash';
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
      if (h.dashCd > 0) h.dashCd--;
    }
    if (h.id === 'eleven' && h.mp >= h.st.mp * 0.25) h.nosebled = false;
  }
}

/** Records the active hero's path and moves the bench heroes along it as cosmetic followers. */
export function updateFollowers(s: S): void {
  const a = activeHero(s);
  s.trailHead = (s.trailHead + 1) % TRAIL;
  s.trailX[s.trailHead] = a.x;
  s.trailY[s.trailHead] = a.y;
  let k = 0;
  for (let i = 0; i < s.heroes.length; i++) {
    const h = s.heroes[i] as Hero;
    if (i === s.active || h.ko) continue;
    const delay = 12 + 13 * k++;
    const idx = (s.trailHead - delay + TRAIL * 4) % TRAIL;
    const tx = s.trailX[idx] as number, ty = s.trailY[idx] as number;
    const nx = h.x + (tx - h.x) * 0.3, ny = h.y + (ty - h.y) * 0.3;
    const moved = Math.hypot(nx - h.x, ny - h.y) > 0.12;
    if (moved) h.dir = dirOfVec(nx - h.x, ny - h.y, h.dir);
    h.x = nx; h.y = ny;
    h.moving = moved;
    h.z = 0; h.flash = Math.max(0, h.flash - 0.12);
    h.animT++;
    setAnim(h, moved ? 'walk' : 'idle');
  }
}
