// Builds the SimView the renderer draws. Pure read of the state: no randomness, no mutation.
import type { ActorView, FxView, PartyHud, PropView, SimView } from '../core/types.ts';
import { xpToNext, MAX_LEVEL } from '../progression/xp.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Enemy, Glob, Hero, Prop, Proj, S } from './state.ts';
import { activeHero, dirOfVec } from './state.ts';
import { SWAP_COOLDOWN } from './party.ts';
import { BODY_Y } from './space.ts';
import { camView } from './cameras.ts';
import { hazardViews } from './hazards.ts';
import { guarding, isShielded } from '../enemies/shield.ts';
import { demoPose } from '../enemies/demo_hit.ts';

let shakeScale = 1;
let reduceFlash = false;

/** Screen shake setting, 0 (off) to 1 (full). The view's shake offset is multiplied by it. */
export function setShakeScale(n: number): void { shakeScale = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1)); }
/** Reduce-flashing setting. When on, the view's flash never goes above 0.2. */
export function setReduceFlashing(on: boolean): void { reduceFlash = on; }

function heroView(s: S, h: Hero, active: boolean): ActorView {
  return {
    kind: 'hero', id: h.id, x: h.x, y: h.y, dir: h.dir, anim: h.anim, t: h.animT, flash: h.flash,
    blink: active && h.blink && h.invuln > 0 && ((s.frame >> 1) & 1) === 0,
    strained: h.id === 'eleven' && h.mp < h.st.mp * 0.25,
    tint: s.inspire > 0 ? 'yellow' : null, alert: false, z: h.z, bar: null,
  };
}

function enemyView(e: Enemy): ActorView {
  const v: ActorView = {
    kind: 'enemy', id: e.kind, x: e.x, y: e.y, dir: e.dir,
    anim: e.dead ? 'ko' : e.anim, t: e.dead ? e.deadT : e.animT, flash: e.flash,
    blink: e.dead && e.deadT > 12 && (e.deadT & 1) === 1, strained: false,
    tint: e.dead ? null : e.stat.burn > 0 ? 'orange' : e.stat.stun > 0 ? 'yellow' : null,
    alert: !e.dead && e.mode === 'windup',
    z: e.dead ? 0 : Math.max(e.z, Math.min(5, Math.hypot(e.vx, e.vy) * 1.2)),
    bar: e.hurtSeen && !e.dead ? { hp: Math.max(0, Math.ceil(e.hp)), hpMax: e.hpMax } : null,
  };
  if (e.elite) v.elite = true;
  if (isShielded(e)) v.guarding = guarding(e);
  if (e.demo) {
    v.petals = e.demo.petals;
    const pose = e.dead ? undefined : demoPose(e.demo);
    if (pose) v.pose = pose;
  }
  return v;
}

function propView(p: Prop): PropView {
  const v: PropView = { id: p.id, kind: p.kind, x: p.x, y: p.y, w: p.w, h: p.h, state: p.state, t: p.t };
  if (p.cam) v.cam = camView(p);
  return v;
}

const BOSS_NAME: Partial<Record<Enemy['kind'], string>> = { warden: 'WARDEN', demogorgon: 'DEMOGORGON' };

/** The first Warden or Demogorgon that is awake and standing fills the boss bar. */
function bossBar(s: S): { name: string; hp: number; hpMax: number } | null {
  for (const e of s.enemies) {
    const name = BOSS_NAME[e.kind];
    if (name && !e.dormant && !e.dead && e.hp > 0) return { name, hp: Math.max(0, Math.ceil(e.hp)), hpMax: e.hpMax };
  }
  return null;
}

function projFx(p: Proj): FxView {
  const angle = Math.atan2(p.vy, p.vx);
  if (p.lob) {
    const t = Math.min(1, p.age / p.life);
    const arc = 4 * 20 * t * (1 - t);
    return { kind: 'candy', x: p.x, y: p.y - arc - BODY_Y * (1 - t) - 2, dir: 'down', angle: 0, t: p.age, life: p.life, w: 6, h: Math.round(arc) };
  }
  return { kind: p.kind, x: p.x, y: p.y, dir: dirOfVec(p.vx, p.vy, 'right'), angle, t: p.age, life: p.life, w: p.r * 2, h: p.r * 2 };
}

/**
 * A spat glob: one 'acid' fx for its whole life (flight + the splash). Until t reaches the flight time it moves along the floor
 * from the boss to its mark (x, y are the ground, angle the way it flies, gfx draws the lift). From then on it sits on the mark
 * as a splash. w and h are the splash's diameter and radius.
 */
function globFx(g: Glob): FxView {
  const t = Math.min(1, g.age / g.life);
  const w = ENEMY_DEFS.demogorgon.x.splash * 2;
  return {
    kind: 'acid', x: g.sx + (g.x - g.sx) * t, y: g.sy + (g.y - g.sy) * t, dir: 'down', angle: g.ang, t: g.age,
    life: g.life + ENEMY_DEFS.demogorgon.x.splashT, w, h: w / 2,
  };
}

function fxList(s: S): FxView[] {
  const out = s.fx.slice();
  for (const p of s.projs) out.push(projFx(p));
  for (const g of s.globs) out.push(globFx(g));
  for (const z of s.zones) {
    out.push({ kind: 'flame', x: z.x, y: z.y, dir: dirOfVec(Math.cos(z.angle), Math.sin(z.angle), 'right'), angle: z.angle, t: z.age, life: z.life, w: z.r, h: Math.round(2 * z.r * Math.sin(z.half)) });
  }
  if (s.lure) out.push({ kind: 'candy', x: s.lure.x, y: s.lure.y - 2, dir: 'down', angle: 0, t: s.lure.age, life: s.lure.life, w: 8, h: 0 });
  if (s.shield) {
    const sh = s.shield;
    out.push({ kind: 'shield', x: sh.x, y: sh.y, dir: dirOfVec(Math.cos(sh.angle), Math.sin(sh.angle), 'right'), angle: sh.angle, t: sh.age, life: sh.life, w: sh.half * 2, h: sh.half * 2 });
  }
  return out;
}

function partyHud(s: S): PartyHud[] {
  return s.heroes.map((h, i) => ({
    id: h.id, name: HERO_DEFS[h.id].name, level: h.level,
    hp: h.ko ? 0 : Math.max(1, Math.ceil(h.hp)), hpMax: h.st.hp,
    mp: Math.floor(h.mp), mpMax: h.st.mp, mpCost: HERO_DEFS[h.id].special.mp,
    xp: h.level >= MAX_LEVEL ? xpToNext(h.level) : h.xp, xpNext: xpToNext(h.level),
    ko: h.ko, active: i === s.active,
  }));
}

export function buildView(s: S): SimView {
  const actors: ActorView[] = [];
  const a = activeHero(s);
  // Followers first so the active hero draws on top when feet are level.
  s.heroes.forEach((h, i) => { if (i !== s.active && !h.ko) actors.push(heroView(s, h, false)); });
  if (!a.ko) actors.push(heroView(s, a, true));
  for (const b of s.bodies) {
    actors.push({ kind: 'hero', id: b.id, x: b.x, y: b.y, dir: b.dir, anim: 'ko', t: b.t, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null });
  }
  for (const e of s.enemies) if (!e.dormant) actors.push(enemyView(e));
  for (const n of s.npcs) {
    actors.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, dir: n.dir, anim: 'idle', t: n.t, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null });
  }
  actors.sort((p, q) => p.y - q.y);
  return {
    actors,
    fx: fxList(s),
    items: s.items.map((it) => ({ kind: it.kind, x: it.x, y: it.y, t: it.t })),
    props: s.props.map(propView),
    hazards: hazardViews(s),
    floaters: s.floaters.slice(),
    hud: {
      party: partyHud(s), burst: s.burst, burstReady: s.burst >= 1 && !s.seq,
      quarters: s.stats.quarters, inspiration: Math.ceil(s.inspire / 60),
      swapReady: s.swapCd > 0 ? Math.max(0, 1 - s.swapCd / SWAP_COOLDOWN) : 1, boss: bossBar(s),
    },
    focus: { x: a.x, y: a.y },
    shake: { x: Math.round(s.shakeX * shakeScale) || 0, y: Math.round(s.shakeY * shakeScale) || 0 },
    flash: reduceFlash ? Math.min(s.flash, 0.2) : s.flash,
  };
}
