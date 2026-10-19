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
import { alphaPose } from '../enemies/alpha_hit.ts';
import { grigoriPose } from '../enemies/grigori_hit.ts';
import { billyK, billyPose, isBillyPinned } from '../enemies/billy_hit.ts';
import { flayedPose } from '../enemies/flayed.ts';
import { flayerPose, legPose } from '../enemies/flayer_hit.ts';
import { poolViews } from './pools.ts';
import { riftK, wardHud, wardView } from './defense.ts';
import { coldSpot } from '../heroes/cold.ts';
import { chargeOf } from '../heroes/hold.ts';
import { camoHides } from '../heroes/camo.ts';
import { petBiting } from '../heroes/dart.ts';
import { isMarked } from '../heroes/hellfire.ts';
import { soloHud } from '../heroes/eddie_solo.ts';
import { ghoulPose, inGlass, mirrorK } from '../enemies/ghoul_hit.ts';
import { batPose } from '../enemies/demobat_hit.ts';
import { chimesOn, walkmanHud } from './curse.ts';
import { onceOf } from '../heroes/talents9.ts';

let shakeScale = 1;
let reduceFlash = false;

/** Screen shake setting, 0 (off) to 1 (full). The view's shake offset is multiplied by it. */
export function setShakeScale(n: number): void { shakeScale = Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1)); }
/** Reduce-flashing setting. When on, the view's flash never goes above 0.2. */
export function setReduceFlashing(on: boolean): void { reduceFlash = on; }

function heroView(s: S, h: Hero, active: boolean): ActorView {
  const v: ActorView = {
    kind: 'hero', id: h.id, x: h.x, y: h.y, dir: h.dir, anim: h.anim, t: h.animT, flash: h.flash,
    blink: active && h.blink && h.invuln > 0 && ((s.frame >> 1) & 1) === 0,
    strained: h.id === 'eleven' && h.mp < h.st.mp * 0.25,
    tint: s.inspire > 0 ? 'yellow' : h.stat.slow > 0 ? 'purple' : null, alert: false, z: h.z, bar: { hp: Math.max(1, Math.ceil(h.hp)), hpMax: h.st.hp },
  };
  // Lucas under his Camo is drawn faint, and a held Special shows its ring. Neither is set otherwise.
  if (active && camoHides(s, h)) v.hidden = true;
  const charge = active ? chargeOf(s, h) : 0;
  if (charge > 0) v.charge = charge;
  // A cursed hero hangs where the curse found them, with the chimes sounded so far over their head.
  const chimes = chimesOn(s, h);
  if (chimes > 0) v.curse = chimes;
  return v;
}

function enemyView(s: S, e: Enemy): ActorView {
  const v: ActorView = {
    kind: 'enemy', id: e.kind, x: e.x, y: e.y, dir: e.dir,
    anim: e.dead ? 'ko' : e.anim, t: e.dead ? e.deadT : e.animT, flash: e.flash,
    blink: e.dead && e.deadT > 12 && (e.deadT & 1) === 1, strained: false,
    tint: e.dead ? null : e.stat.burn > 0 ? 'orange' : e.stat.stun > 0 ? 'yellow' : e.stat.slow > 0 ? 'purple' : null,
    alert: !e.dead && e.mode === 'windup',
    z: e.dead ? 0 : Math.max(e.z, Math.min(5, Math.hypot(e.vx, e.vy) * 1.2)),
    bar: e.hurtSeen && !e.dead ? { hp: Math.max(0, Math.ceil(e.hp)), hpMax: e.hpMax } : null,
  };
  if (e.elite) v.elite = true;
  if (!e.dead && isMarked(s, e)) v.marked = true;
  if (e.stat.confuse > 0 && !e.dead) v.confused = true;
  if (isShielded(e)) v.guarding = guarding(e);
  // A hidden enemy is faint until Cold spot has it or it strikes. Revealed, it says so, so gfx can tell the two apart.
  if (e.cloaked && !e.dead) v.hidden = e.hidden && !coldSpot(s, e);
  if (e.demo) {
    v.petals = e.demo.petals;
    const pose = e.dead ? undefined : demoPose(e.demo);
    if (pose) v.pose = pose;
  }
  if (e.ghoul && !e.dead) {
    const pose = ghoulPose(e.ghoul);
    if (pose) v.pose = pose;
  }
  if (e.bat && !e.dead) {
    const pose = batPose(e.bat);
    if (pose) v.pose = pose;
  }
  if (e.alpha && !e.dead) {
    const pose = alphaPose(e.alpha);
    if (pose) v.pose = pose;
  }
  if (e.grigori && !e.dead) {
    const pose = grigoriPose(e.grigori);
    if (pose) v.pose = pose;
  }
  if (e.billy && !e.dead) {
    const pose = billyPose(e.billy);
    if (pose) v.pose = pose;
    // The reach while he kneels. His bar is empty then: he is at 0 HP to anyone watching.
    const k = billyK(e.billy);
    if (k > 0) v.k = k;
    if (isBillyPinned(e) && v.bar) v.bar = { hp: 0, hpMax: e.hpMax };
  }
  if (e.flayed && !e.dead) {
    const pose = flayedPose(e.flayed);
    if (pose) v.pose = pose;
  }
  if (e.flayer && !e.dead) {
    const pose = flayerPose(e.flayer);
    if (pose) v.pose = pose;
  }
  // A leg is drawn from its root to its tip: x, y is the root, aim the tip (where the enemy stands and is hit).
  if (e.leg) {
    v.x = e.leg.rx; v.y = e.leg.ry;
    v.aim = { x: e.x, y: e.y };
    const pose = e.dead ? undefined : legPose(e.leg);
    if (pose) v.pose = pose;
  }
  return v;
}

/** A dormant Flayed waits as a goo puddle: an actor with `puddle` set, standing still. */
function puddleView(s: S, e: Enemy): ActorView {
  return {
    kind: 'enemy', id: e.kind, x: e.x, y: e.y, dir: e.dir, anim: 'idle', t: s.frame, flash: 0, blink: false, strained: false,
    tint: null, alert: false, z: 0, bar: null, puddle: true,
  };
}

function propView(s: S, p: Prop): PropView {
  const v: PropView = { id: p.id, kind: p.kind, x: p.x, y: p.y, w: p.w, h: p.h, state: p.state, t: p.t };
  if (p.cam) v.cam = camView(p);
  const k = riftK(s, p);
  if (k !== undefined) v.k = k;
  else if (p.kind === 'cipher') v.k = p.k;
  else if (p.kind === 'mirror') { const share = mirrorK(s, p); if (share > 0) v.k = share; }
  return v;
}

const BOSS_NAME: Partial<Record<Enemy['kind'], string>> = { warden: 'WARDEN', demogorgon: 'DEMOGORGON', alpha: 'DEMODOG ALPHA', grigori: 'GRIGORI',
  billy: 'BILLY', flayer: 'MIND FLAYER', pitdemo: 'DEMOGORGON' };

/** The first Warden, Demogorgon (the pit one too), Alpha, Grigori, Billy or Mind Flayer that is awake and standing fills the boss bar. A pinned Billy is at 0 HP. */
function bossBar(s: S): { name: string; hp: number; hpMax: number; parts?: number[] } | null {
  for (const e of s.enemies) {
    const name = BOSS_NAME[e.kind];
    if (!name || e.dormant || e.dead || e.hp <= 0 || isBillyPinned(e)) continue;
    const bar = { name, hp: Math.max(0, Math.ceil(e.hp)), hpMax: e.hpMax };
    // The Mind Flayer's four legs, as the share of HP each has left: 0 for a severed one. The legs never fill the bar themselves.
    return e.flayer ? { ...bar, parts: e.flayer.legs.map((l) => (l.dead || l.hp <= 0 ? 0 : Math.min(1, l.hp / l.hpMax))) } : bar;
  }
  return null;
}

function projFx(p: Proj): FxView {
  const angle = Math.atan2(p.vy, p.vx);
  if (p.lob) {
    const t = Math.min(1, p.age / p.life);
    const arc = 4 * 20 * t * (1 - t);
    // A scoop in flight is a 6 wide 'scoop' fx, h its height off the ground. The splat (heroes/robin.ts) is the same kind, w its diameter.
    // Nancy's Molotov flies the same way as a 'bottle'.
    return { kind: p.kind === 'scoop' || p.kind === 'bottle' ? p.kind : 'candy', x: p.x, y: p.y - arc - BODY_Y * (1 - t) - 2, dir: 'down', angle: 0, t: p.age, life: p.life, w: 6, h: Math.round(arc) };
  }
  // A fireball is drawn as a small flame pointing the way it flies (w its reach, h its width).
  if (p.kind === 'fireball') return { kind: 'flame', x: p.x, y: p.y, dir: dirOfVec(p.vx, p.vy, 'right'), angle, t: p.age, life: p.life, w: 12, h: 10 };
  return { kind: p.kind, x: p.x, y: p.y, dir: dirOfVec(p.vx, p.vy, 'right'), angle, t: p.age, life: p.life, w: p.r * 2, h: p.r * 2 };
}

/**
 * A spat glob: one 'acid' fx for its whole life (flight + the splash). Until t reaches the flight time it moves along the floor
 * from the boss to its mark (x, y are the ground, angle the way it flies, gfx draws the lift). From then on it sits on the mark
 * as a splash. w and h are the splash's diameter and radius.
 */
function globFx(g: Glob): FxView {
  const t = Math.min(1, g.age / g.life);
  const w = ENEMY_DEFS[g.kind].x.splash * 2;
  return {
    kind: 'acid', x: g.sx + (g.x - g.sx) * t, y: g.sy + (g.y - g.sy) * t, dir: 'down', angle: g.ang, t: g.age,
    life: g.life + ENEMY_DEFS[g.kind].x.splashT, w, h: w / 2,
  };
}

function fxList(s: S): FxView[] {
  const out = s.fx.slice();
  for (const p of s.projs) out.push(projFx(p));
  for (const g of s.globs) out.push(globFx(g));
  for (const z of s.zones) {
    // A full circle is the Molotov's pool: 'fire' on the floor, w its diameter. A cone is a spray: 'flame', w its reach.
    if (z.half >= Math.PI) { out.push({ kind: 'fire', x: z.x, y: z.y + BODY_Y, dir: 'down', angle: 0, t: z.age, life: z.life, w: z.r * 2, h: z.r }); continue; }
    out.push({ kind: 'flame', x: z.x, y: z.y, dir: dirOfVec(Math.cos(z.angle), Math.sin(z.angle), 'right'), angle: z.angle, t: z.age, life: z.life, w: z.r, h: Math.round(2 * z.r * Math.sin(z.half)) });
  }
  // A bear trap on the floor: one 'trap' fx for as long as it lasts, w by h its size. It is gone once an enemy springs it.
  for (const t of s.traps) out.push({ kind: 'trap', x: t.x, y: t.y, dir: 'down', angle: 0, t: t.age, life: t.life, w: 14, h: 8 });
  const pet = s.t6.dart;
  if (pet) out.push({ kind: 'pet', x: pet.x, y: pet.y, dir: pet.dir, angle: 0, t: pet.t, life: pet.life, w: petBiting(pet) ? 1 : 0, h: 0 });
  if (s.lure) out.push({ kind: 'candy', x: s.lure.x, y: s.lure.y - 2, dir: 'down', angle: 0, t: s.lure.age, life: s.lure.life, w: 8, h: 0 });
  if (s.shield) {
    const sh = s.shield;
    out.push({ kind: 'shield', x: sh.x, y: sh.y, dir: dirOfVec(Math.cos(sh.angle), Math.sin(sh.angle), 'right'), angle: sh.angle, t: sh.age, life: sh.life, w: sh.half * 2, h: sh.half * 2 });
  }
  return out;
}

function partyHud(s: S): PartyHud[] {
  return s.heroes.map((h, i) => {
    const row: PartyHud = {
      id: h.id, name: HERO_DEFS[h.id].name, level: h.level,
      hp: h.ko ? 0 : Math.max(1, Math.ceil(h.hp)), hpMax: h.st.hp,
      mp: Math.floor(h.mp), mpMax: h.st.mp, mpCost: HERO_DEFS[h.id].special.mp,
      xp: h.level >= MAX_LEVEL ? xpToNext(h.level) : h.xp, xpNext: xpToNext(h.level),
      ko: h.ko, active: i === s.active,
    };
    const once = onceOf(s, h);
    if (once) row.once = once;
    const chimes = chimesOn(s, h);
    if (chimes > 0) row.curse = chimes;
    return row;
  });
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
  for (const e of s.enemies) {
    // A freed Billy is the npc that replaces him (enemies/billy_hit.ts): his body is not drawn dying. A ghoul in its mirror is nowhere.
    if (!e.dormant && !(e.billy && e.dead) && !inGlass(e)) actors.push(enemyView(s, e));
    else if (e.flayed && !e.dead) actors.push(puddleView(s, e));
  }
  for (const n of s.npcs) {
    const ward = wardView(s, n);
    if (ward) { actors.push(ward); continue; }
    actors.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, dir: n.dir, anim: 'idle', t: n.t, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null });
  }
  actors.sort((p, q) => p.y - q.y);
  return {
    actors,
    fx: fxList(s),
    items: s.items.map((it) => ({ kind: it.kind, x: it.x, y: it.y, t: it.t })),
    props: s.props.map((p) => propView(s, p)),
    hazards: hazardViews(s),
    pools: poolViews(s),
    floaters: s.floaters.slice(),
    hud: {
      party: partyHud(s), burst: s.burst, burstReady: s.burst >= 1 && !s.seq,
      quarters: s.purse + s.stats.quarters, inspiration: Math.ceil(s.inspire / 60),
      swapReady: s.swapCd > 0 ? Math.max(0, 1 - s.swapCd / SWAP_COOLDOWN) : 1, boss: bossBar(s),
      ward: wardHud(s),
      stash: { ...s.stash },
      solo: soloHud(s),
      walkman: walkmanHud(s),
    },
    focus: { x: a.x, y: a.y },
    shake: { x: Math.round(s.shakeX * shakeScale) || 0, y: Math.round(s.shakeY * shakeScale) || 0 },
    flash: reduceFlash ? Math.min(s.flash, 0.2) : s.flash,
  };
}
