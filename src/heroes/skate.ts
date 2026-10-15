// Max's Skate dash, the part that runs between the cast and the landing. The roll is planned when she casts it (castSkate)
// and walked a frame at a time (stepDash). It is a straight roll along her aim at 4.5 px a frame for 16 frames, 72 px.
//   - She is invulnerable for the roll and 6 frames after. Every enemy her body passes through takes one hit.
//   - It stops early at a solid tile or a solid prop, but not at a gap: a gap is a drop, and she rolls over it.
//   - If the roll would end over a gap it carries on until her collision box is clear, at most 16 px more. If the far side
//     is blocked she stops on the near side instead, so she is never left inside the gap.
//   - The gaps she crossed open when she lands (one propCleared each, once), and stay solid to walking.
// What gfx sees: a 'trail' fx at her chest where the roll started, angle the heading, w the length rolled. Her anim is
// 'dash' for the roll.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { BODY_Y, dist, distToSegment, footBlocked, gapsUnder } from '../combat/space.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import { addFx, dust, sfx } from '../combat/fx.ts';
import { hitEnemy } from '../combat/damage.ts';
import { crossGap } from '../combat/props.ts';
import { beginAct } from './common.ts';

export interface RollPlan { len: number; gaps: string[] }

/**
 * How far a roll from (x, y) along the unit heading (ux, uy) goes, and which gaps it crosses. `max` is the full roll and
 * `extra` the most it may carry on to clear a gap it would otherwise end over. Whole pixels, so it is exact and repeatable.
 */
export function planRoll(s: S, x: number, y: number, ux: number, uy: number, max: number, extra: number): RollPlan {
  const blocked = (l: number): boolean => footBlocked(s, x + ux * l, y + uy * l, true);
  const over = (l: number): boolean => gapsUnder(s, x + ux * l, y + uy * l).length > 0;
  let len = 0;
  while (len < max && !blocked(len + 1)) len++;
  if (over(len)) {
    let e = len;
    while (e < len + extra && over(e) && !blocked(e + 1)) e++;
    if (!over(e)) len = e;
    else while (len > 0 && over(len)) len--;
  }
  const gaps = new Set<string>();
  for (let l = 0; l <= len; l++) for (const p of gapsUnder(s, x + ux * l, y + uy * l)) gaps.add(p.id);
  return { len, gaps: [...gaps] };
}

/** Starts the roll along her aim. Called from maxSpecial the frame she casts. */
export function castSkate(s: S, h: Hero): void {
  const d = HERO_DEFS.max.special;
  const aim = h.aim;
  const ux = Math.cos(aim), uy = Math.sin(aim);
  const plan = planRoll(s, h.x, h.y, ux, uy, d.x.speed * d.x.frames, d.x.extra);
  const frames = Math.max(1, Math.ceil(plan.len / d.x.speed));
  beginAct(h, d, 'special', { dur: frames });
  h.vx = 0; h.vy = 0;
  h.dash = { ux, uy, len: plan.len, gone: 0, hit: [], gaps: plan.gaps };
  h.invuln = frames + d.x.after;
  h.blink = false;
  sfx(s, 'skate');
  addFx(s, 'trail', h.x, h.y - BODY_Y, h.dir, aim, frames + 8, plan.len, 10);
}

/** One frame of the roll: moves her and hits whoever her body passed through. */
export function stepDash(s: S, h: Hero): void {
  const dash = h.dash;
  if (!dash) return;
  const d = HERO_DEFS.max.special;
  const step = Math.min(d.x.speed, dash.len - dash.gone);
  const px = h.x, py = h.y;
  if (step > 0) { h.x += dash.ux * step; h.y += dash.uy * step; dash.gone += step; }
  const heading = Math.atan2(dash.uy, dash.ux);
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0 || dash.hit.includes(e.uid)) continue;
    if (distToSegment(e.x, e.y - BODY_Y, px, py - BODY_Y, h.x, h.y - BODY_Y) > d.x.r) continue;
    dash.hit.push(e.uid);
    // Thrown to whichever side of her path it is on.
    const side = dash.ux * (e.y - h.y) - dash.uy * (e.x - h.x);
    const sign = side > 0 ? 1 : side < 0 ? -1 : (e.uid & 1) === 0 ? 1 : -1;
    hitEnemy(s, h, e, { power: d.power, kb: d.kb, angle: heading + sign * (Math.PI / 2), stagger: 14, hitstop: 1, shake: 0.5 });
  }
}

/** Kickflip (Lv 6): she lands with a shockwave that hits everything round her. */
function kickflip(s: S, h: Hero): void {
  const d = HERO_DEFS.max.special;
  addFx(s, 'nova', h.x, h.y, h.dir, 0, 14, d.x.kickR * 2, d.x.kickR);
  dust(s, h.x, h.y, 4);
  sfx(s, 'push');
  for (const e of s.enemies) {
    if (e.dead || e.dormant || e.hp <= 0 || dist(h.x, h.y, e.x, e.y) > d.x.kickR + 4) continue;
    hitEnemy(s, h, e, { power: d.x.kickPower, kb: d.x.kickKb, angle: Math.atan2(e.y - h.y, e.x - h.x), stagger: 12, hitstop: 1 });
  }
}

/**
 * The roll is over (her action timer ran out): she lands, and every gap she crossed opens. A roll cut short opens none. From Lv 6
 * the landing is a Kickflip, wherever it is.
 */
export function endDash(s: S, h: Hero): void {
  const dash = h.dash;
  if (!dash) return;
  h.dash = null;
  if (!h.ko && hasTalent('max', h.level, LV6)) kickflip(s, h);
  if (dash.gone < dash.len - 0.01) return;
  for (const id of dash.gaps) {
    const p = s.props.find((q) => q.id === id);
    if (p) crossGap(s, p);
  }
}
