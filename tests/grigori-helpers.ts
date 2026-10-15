// Shared rigs for the Grigori tests. Not a test file.
import type { ActorView, FxView, PartySeed, Sim, SimEvent, SimInput, SimSpawn } from '../src/core/types.ts';
import { defaultParty } from '../src/core/campaign.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';
import type { Enemy, GrigoriState, Hero, S } from '../src/combat/state.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { arena, idle, inp, makeWhite, tc, tf } from './sim-helpers.ts';

export const GRIGORI = ENEMY_DEFS.grigori;
export const GX = GRIGORI.x;

/** Mike, Eleven, Robin and Steve: nobody who can shoot. */
export const NO_SHOOTER: PartySeed[] = [{ id: 'mike', level: 7 }, { id: 'eleven', level: 5 }, { id: 'robin', level: 5 }, { id: 'steve', level: 5 }];
/** The 3.2 party: Mike, Eleven, Robin and Nancy, who shoots. */
export const WITH_SHOOTER: PartySeed[] = defaultParty('3.2');

export const grigoriAt = (tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id: 'grigori', type: 'grigori', tx, ty, group: 'boss', ...extra });

/** The chamber's power box and breaker: a 32 by 32 plate at tile (7, 5), mid-floor, and the breaker in the north wall above it, off to one side. */
export const CHAMBER_PROPS: SimSpawn[] = [
  { kind: 'prop', id: 'powerbox1', prop: 'powerbox', tx: 7, ty: 5, w: 32, h: 32 },
  { kind: 'prop', id: 'breaker1', prop: 'breaker', tx: 9, ty: 0 },
];

export interface GRig { sim: Sim; s: S; boss: Enemy; g: GrigoriState; hero: Hero }

/**
 * The Key chamber in miniature: 18 by 12 tiles ringed with walls, Grigori awake at tile (13, 6), Mike in front at (3, 6) with HP to
 * spare unless `tough` is false, a power box mid-floor and the breaker in the north wall. enemyMult 1 on chief.
 */
export function gRig(over: Parameters<typeof makeWhite>[0] = {}, tough = true, party: PartySeed[] = WITH_SHOOTER): GRig {
  const { sim, s } = makeWhite({
    grid: arena(18, 12), party, start: { x: tc(3), y: tf(6) }, spawns: [grigoriAt(13, 6, { dormant: true }), ...CHAMBER_PROPS],
    enemyMult: 1, seed: 4, ...over,
  });
  sim.spawnGroup('boss');
  const boss = s.enemies.find((e) => e.kind === 'grigori') as Enemy;
  const hero = s.heroes[0] as Hero;
  if (tough) { hero.st.hp = 900; hero.hp = 900; }
  return { sim, s, boss, g: boss.grigori as GrigoriState, hero };
}

export const bossView = (r: { sim: Sim }): ActorView | undefined => r.sim.view().actors.find((a) => a.kind === 'enemy' && a.id === 'grigori');

export interface Frame { ev: SimEvent[]; v: ActorView | undefined; f: number; fx: FxView[] }

/** Steps n ticks and records Grigori's view, the effects on screen (copied) and the events of each. */
export function track(r: GRig, n: number, input: SimInput = idle()): Frame[] {
  const out: Frame[] = [];
  for (let f = 0; f < n; f++) {
    const ev = r.sim.step(input);
    out.push({ ev, v: bossView(r), f, fx: r.sim.view().fx.map((x) => ({ ...x })) });
  }
  return out;
}

/** Steps until `pred` holds (checked after each tick). Returns the frames taken and the events. Throws if it takes too long. */
export function until(r: { sim: Sim }, pred: () => boolean, max = 1500, input: SimInput = idle()): { frames: number; ev: SimEvent[] } {
  const ev: SimEvent[] = [];
  for (let f = 1; f <= max; f++) {
    ev.push(...r.sim.step(input));
    if (pred()) return { frames: f, ev };
  }
  throw new Error(`condition not met in ${max} frames`);
}

/** The plate in CHAMBER_PROPS is x 112 to 144, y 80 to 112. A body with its feet here is on it. */
export const ON_PLATE = { x: 128, y: 100 };
/** The breaker's middle. A shot flying north along x = 152 from anywhere south of it hits it. */
export const BREAKER = { x: 152, y: 8 };

/** Puts Grigori down at (x, y) and holds him in his recovery for `frames`, so a test can read what a hit or the box does to him. */
export function park(r: GRig, x: number, y: number, frames = 99999): void {
  r.boss.x = x; r.boss.y = y; r.boss.hx = x; r.boss.hy = y;
  r.g.move = 'recover';
  r.g.t = frames;
  r.boss.mode = 'recover';
  r.g.grabCd = 99999;
  r.boss.cd = 99999;
}

export const prop = (r: { sim: Sim }, id: string) => r.sim.view().props.find((p) => p.id === id);
/** Puts the active hero at (x, y), standing still. */
export function at(r: GRig, x: number, y: number): void {
  r.hero.x = x; r.hero.y = y; r.hero.vx = 0; r.hero.vy = 0;
  r.s.trailX.fill(x); r.s.trailY.fill(y);
}
/** A swing at him from the point `deg` degrees round from his right, `d` px out. The knockback runs away from the attacker. */
export function strike(r: GRig, deg: number, d = 20) {
  const a = (deg * Math.PI) / 180;
  const h = r.hero;
  h.x = r.boss.x + Math.cos(a) * d; h.y = r.boss.y + Math.sin(a) * d;
  const hp = r.boss.hp;
  r.boss.hp = r.boss.hpMax;
  r.s.sfxSeen.clear();
  const ev = r.s.events.length;
  hitEnemy(r.s, h, r.boss, { power: 1, kb: 0, angle: a + Math.PI, noCrit: true });
  const out = { dmg: r.boss.hpMax - r.boss.hp, sounds: r.s.events.slice(ev).flatMap((e) => (e.t === 'sfx' ? [e.id] : [])) };
  r.boss.hp = hp;
  return out;
}


/** Grigori walks up to a hero who stands still (`from` px away) and starts the haymaker. Returns the frames of the wind-up and the swing. */
export function haymaker(from: number, away = 0, hpShare = 1) {
  const r = gRig({ god: false });
  r.boss.hp = r.boss.hpMax * hpShare;
  r.g.grabCd = 99999;
  r.boss.cd = 0;
  at(r, r.boss.x - from, r.boss.y);
  const ev: SimEvent[] = [];
  let alerts = 0, swingAt = -1, f = 0;
  for (; f < 300; f++) {
    const winding = bossView(r)?.alert === true;
    // Backing off along the floor while the "!" is up, when asked to.
    ev.push(...r.sim.step(winding && away > 0 ? inp({ mx: -away }) : idle()));
    if (bossView(r)?.alert) alerts++;
    else if (alerts > 0) { swingAt = f; break; }
  }
  return { ...r, ev, alerts, swingAt };
}


/** Grigori about to grab: the timer is up and the hero stands `from` px west of him, in line. */
export function grabber(from = 45, over: Parameters<typeof gRig>[0] = {}) {
  const r = gRig({ god: false, ...over });
  r.g.grabCd = 0;
  r.boss.cd = 99999;
  at(r, r.boss.x - from, r.boss.y);
  return r;
}


/** The chamber with a second plate and Nancy in front, on the vertical line below the breaker. */
export function box(over: Parameters<typeof gRig>[0] = {}, party: PartySeed[] = [{ id: 'nancy', level: 5 }, { id: 'mike', level: 7 }]) {
  const extra: SimSpawn = { kind: 'prop', id: 'powerbox2', prop: 'powerbox', tx: 2, ty: 2, w: 32, h: 32 };
  const r = gRig({ party, start: { x: 152, y: 148 }, spawns: [grigoriAt(15, 6, { dormant: true }), ...CHAMBER_PROPS, extra], ...over });
  park(r, tc(15), tf(6));
  return r;
}
export const plates = (r: GRig) => ['powerbox1', 'powerbox2'].map((id) => prop(r, id)!.state);

