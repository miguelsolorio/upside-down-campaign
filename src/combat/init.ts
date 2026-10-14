// Builds the starting state from SimOptions: party, enemies, items, props and npcs.
import type { PropKind, PropState, SimOptions, SimSpawn, Utility } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { createRng } from '../core/rng.ts';
import { ENEMY_DEFS, DIFFICULTY_MULT, ELITE } from '../enemies/defs.ts';
import { xpToNext } from '../progression/xp.ts';
import type { Enemy, S, Stats } from './state.ts';
import { noStatus } from './state.ts';
import { makeHero } from './party.ts';
import { hazardAt } from './hazards.ts';
import { newDemo } from '../enemies/demo_hit.ts';

const TRAIL = 256;

/** Feet position for a tile: centered, with the 10 x 8 foot box inside the tile. */
export function tileFeet(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + 12 };
}

const PROP_SIZE: Partial<Record<PropKind, [number, number]>> = { van: [48, 32] };
const SOLID_BY_DEFAULT = new Set<PropKind>(['log', 'gate', 'van', 'crate', 'floodlight', 'door', 'console', 'tank', 'rack', 'generator', 'vines']);
/** Props a hit lights instead of opens: they stay as they are and read 'lit' once solved. A shot camera is off for good. */
const LIT_WHEN_SOLVED = new Set<PropKind>(['target', 'console', 'camera', 'firebox']);
/** What lights or clears a prop when its spawn does not say: a target, camera or fire-door box takes a shot, vines take fire. */
const DEFAULT_HIT: Partial<Record<PropKind, Utility>> = { target: 'shoot', camera: 'shoot', firebox: 'shoot', vines: 'burn' };
const DEFAULT_STATE: Partial<Record<PropKind, PropState>> = { lights: 'off', floodlight: 'off' };

function makeEnemy(s: S, sp: Extract<SimSpawn, { kind: 'enemy' }>): Enemy {
  const def = ENEMY_DEFS[sp.type];
  const f = tileFeet(sp.tx, sp.ty);
  const uid = s.nextUid++;
  const elite = sp.tier === 'elite';
  const hp = Math.max(1, Math.round(elite ? def.hp * ELITE.hp * s.mult * s.foeMult : def.hp * s.mult * s.foeMult));
  const patrol = (sp.patrol ?? []).map((p) => tileFeet(p.tx, p.ty));
  return {
    uid, id: sp.id, kind: sp.type, group: sp.group,
    x: f.x, y: f.y, hx: f.x, hy: f.y, dir: sp.dir ?? 'down', vx: 0, vy: 0, z: 0,
    hp, hpMax: hp, atk: elite ? def.atk * ELITE.atk : def.atk, def: def.def,
    dormant: sp.dormant === true, dead: false, deadT: 0, aware: false,
    mode: patrol.length > 0 ? 'patrol' : 'idle', modeT: 0, cd: 0, stagger: 0, flash: 0, hurtSeen: false,
    anim: 'idle', animT: 0, patrol, pi: 0, wait: 0, ax: 0, ay: 0, hitDone: false, lostT: 0, backT: 0, stuckT: 0,
    lastX: f.x, lastY: f.y, wanderT: 30 + ((uid * 37) % 90), wanderA: Number.NaN, noLure: 0, by: null, stat: noStatus(),
    xp: elite ? def.xp * ELITE.xp : def.xp, drop: elite ? def.drop * ELITE.drop : def.drop, elite,
    spd: elite ? ELITE.speed : 1, cdMul: elite ? ELITE.cooldown : 1,
    broken: 0, grace: 0, turnT: 0, swings: 0, slam: false, ring: null,
    demo: sp.type === 'demogorgon' ? newDemo() : null,
  };
}

export function createState(opts: SimOptions): S {
  const seed = opts.seed ?? 1983;
  const skip = new Set(opts.skipSpawns ?? []);
  const open = new Set(opts.openProps ?? []);
  if (opts.party.length === 0) throw new Error('createSim: the party needs at least one hero');
  const heroes = opts.party.map((p) => {
    // `bonus` is not in PartySeed yet. A snapshot from party() carries it, so d20 gains survive a rebuilt sim.
    const h = makeHero(p.id, p.level ?? 1, 0, opts.start.x, opts.start.y, (p as { bonus?: Partial<Stats> }).bonus);
    h.xp = Math.max(0, Math.min(p.xp ?? 0, xpToNext(h.level) - 1));
    return h;
  });
  const trailX = new Float32Array(TRAIL), trailY = new Float32Array(TRAIL);
  for (let i = 0; i < TRAIL; i++) {
    const age = TRAIL - 1 - i;
    trailX[i] = opts.start.x - Math.min(16, age * 0.5);
    trailY[i] = opts.start.y + Math.min(5, age * 0.2);
  }
  trailX[TRAIL - 1] = opts.start.x; trailY[TRAIL - 1] = opts.start.y;
  const s: S = {
    grid: opts.grid, rng: createRng(seed), frng: createRng((seed ^ 0x9e3779b9) >>> 0),
    mult: DIFFICULTY_MULT[opts.difficulty ?? 'chief'], foeMult: opts.enemyMult ?? 1, frame: 0,
    heroes, active: 0, swapCd: 0, swapLock: 0, trailX, trailY, trailHead: TRAIL - 1, standT: 0, walkDir: 'right', bump: null,
    enemies: [], globs: [], projs: [], zones: [], lure: null, shield: null, fx: [], floaters: [], items: [], props: [],
    hazards: (opts.hazards ?? []).map((h) => ({ ...h })), hazT: 0, hazPrev: (opts.hazards ?? []).map((h) => hazardAt(h, 0).state),
    npcs: [], bodies: [],
    timers: [], events: [], sfxSeen: new Set(), hitstop: 0, shake: 0, shakeX: 0, shakeY: 0, flash: 0,
    burst: 0, seq: null, inspire: 0, calm: 9999, armed: true, over: false, nextUid: 1, nextDrop: 1,
    stats: {
      kills: 0, killsByKind: {}, damageDealt: 0, damageTaken: 0, xpEarned: 0, quarters: 0, levelUps: [], frames: 0, kos: 0,
    },
    buf: { attack: 0, special: 0, burst: 0, swapT: 0, swapDelta: 0, swapTo: -1 },
    flow: { tx: -1, ty: -1, dist: null, nav: null, age: 0 },
    cleared: new Set(), god: opts.god === true, boxes: false,
  };
  for (const sp of opts.spawns) {
    if (sp.kind !== 'prop' && skip.has(sp.id)) continue;
    if (sp.kind === 'enemy') {
      s.enemies.push(makeEnemy(s, sp));
    } else if (sp.kind === 'item') {
      const f = tileFeet(sp.tx, sp.ty);
      s.items.push({ id: sp.id, kind: sp.item, x: f.x, y: f.y, t: 0 });
    } else if (sp.kind === 'npc') {
      const f = tileFeet(sp.tx, sp.ty);
      s.npcs.push({ id: sp.id, x: f.x, y: f.y, dir: sp.dir, t: 0 });
    } else {
      const size = PROP_SIZE[sp.prop] ?? [TILE, TILE];
      let solid = sp.solid ?? SOLID_BY_DEFAULT.has(sp.prop);
      let state: PropState = sp.state ?? DEFAULT_STATE[sp.prop] ?? 'closed';
      if (open.has(sp.id)) {
        state = LIT_WHEN_SOLVED.has(sp.prop) ? 'lit' : 'open';
        if (!LIT_WHEN_SOLVED.has(sp.prop)) solid = false;
      }
      const hitBy: Utility | undefined = sp.hitBy ?? DEFAULT_HIT[sp.prop];
      const pushBy: Utility | undefined = sp.pushBy ?? (sp.prop === 'log' ? 'push' : undefined);
      s.props.push({
        id: sp.id, kind: sp.prop, x: sp.tx * TILE, y: sp.ty * TILE, w: sp.w ?? size[0], h: sp.h ?? size[1],
        solid, state, t: 0, hitBy, pushBy, cam: sp.cam ? { ...sp.cam } : undefined, camT: 0, pokeCd: 0, burnT: 0,
      });
    }
  }
  return s;
}
