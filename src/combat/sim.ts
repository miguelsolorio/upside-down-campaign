// The simulation: one tick of play, and the Sim object built around the state. index.ts is the public API.
import type { HeroSnapshot, RunStats, Sim, SimEvent, SimInput, SimOptions } from '../core/types.ts';
import { updateEnemies, anyAggro } from '../enemies/ai.ts';
import type { S, Stats, Timer } from './state.ts';
import { activeHero } from './state.ts';
import { createState, setDifficulty } from './init.ts';
import { alertEnemy } from './damage.ts';
import { bufferInput, regen, updateActive, updateFollowers } from './hero.ts';
import { updateTalents } from '../heroes/talents6.ts';
import { ageBodies, awardXp, handleSwap, healParty, reapHeroes, recruitHero, setActiveLevel } from './party.ts';
import { reapEnemies } from './kills.ts';
import { tickEnemyStatus, tickHeroStatus } from './status.ts';
import { updateAreas, updateProjectiles } from './proj.ts';
import { updateItems, updateStash } from './pickups.ts';
import { closePropById, openPropById, updateProps } from './props.ts';
import { updatePowerboxes } from './powerbox.ts';
import { wakeFlayed } from '../enemies/flayed.ts';
import { wakeFlayer } from '../enemies/flayer.ts';
import { startDefense, updateDefense } from './defense.ts';
import { updateCameras } from './cameras.ts';
import { updateHazards } from './hazards.ts';
import { updatePools } from './pools.ts';
import { stepBurst, tryBurst } from './burst.ts';
import { dust, floater, sfx } from './fx.ts';
import { updateTraps } from '../heroes/nancy.ts';
import { buildView } from './view.ts';

function runTimers(s: S): void {
  if (s.timers.length === 0) return;
  const due: Timer[] = [];
  const rest: Timer[] = [];
  for (const t of s.timers) {
    if (--t.n <= 0) due.push(t); else rest.push(t);
  }
  s.timers = rest;
  for (const t of due) t.fn();
}

function tickShakeFlash(s: S): void {
  if (s.shake > 0.05) {
    s.shakeX = Math.round((s.frng() * 2 - 1) * s.shake);
    s.shakeY = Math.round((s.frng() * 2 - 1) * s.shake);
    s.shake *= 0.85;
  } else {
    s.shake = 0; s.shakeX = 0; s.shakeY = 0;
  }
  if (s.flash > 0) s.flash = Math.max(0, s.flash - 0.04);
}

function tickVisuals(s: S): void {
  for (const f of s.fx) f.t++;
  if (s.fx.length > 0) s.fx = s.fx.filter((f) => f.t < f.life);
  for (const f of s.floaters) f.t++;
  if (s.floaters.length > 0) s.floaters = s.floaters.filter((f) => f.t < f.life);
  for (const n of s.npcs) n.t++;
  tickShakeFlash(s);
}

function drain(s: S): SimEvent[] {
  const out = s.events;
  s.events = [];
  return out;
}

function stepSim(s: S, input: SimInput): SimEvent[] {
  s.frame++;
  s.stats.frames++;
  s.sfxSeen.clear();
  if (s.over) {
    tickVisuals(s);
    ageBodies(s);
    return drain(s);
  }
  bufferInput(s, input);
  if (s.seq) {
    stepBurst(s);
    reapEnemies(s);
    reapHeroes(s);
    tickVisuals(s);
    return drain(s);
  }
  if (s.hitstop > 0) {
    s.hitstop--;
    tickShakeFlash(s);
    // The defense clock is the stage's own: 45 seconds are 45 seconds, hit-stop or not. Only the burst and a game over stop it.
    updateDefense(s);
    return drain(s);
  }
  if (s.swapCd > 0) s.swapCd--;
  if (s.swapLock > 0) s.swapLock--;
  handleSwap(s);
  if (tryBurst(s)) {
    tickVisuals(s);
    return drain(s);
  }
  runTimers(s);
  updateActive(s, input);
  updateTalents(s);
  updateFollowers(s);
  tickEnemyStatus(s);
  tickHeroStatus(s);
  updateEnemies(s);
  updateDefense(s);
  updateProjectiles(s);
  updateAreas(s);
  updateTraps(s);
  updateItems(s);
  updateStash(s);
  updateProps(s);
  updatePowerboxes(s);
  updateCameras(s);
  updateHazards(s);
  updatePools(s);
  regen(s);
  reapEnemies(s);
  reapHeroes(s);
  if (s.inspire > 0) s.inspire--;
  if (anyAggro(s)) s.calm = 0;
  else if (++s.calm >= 240) s.armed = true;
  ageBodies(s);
  tickVisuals(s);
  return drain(s);
}

/** HeroSnapshot plus the d20 bonus points earned so far. Pass a snapshot back as a PartySeed and the stats carry over. */
function snapshot(s: S): HeroSnapshot[] {
  return s.heroes.map((h) => {
    const snap: HeroSnapshot & { bonus: Stats } = {
      id: h.id, level: h.level, xp: h.xp, hp: h.ko ? 0 : Math.max(1, Math.ceil(h.hp)), hpMax: h.st.hp, bonus: { ...h.bonus },
    };
    return snap;
  });
}

function copyStats(st: RunStats): RunStats {
  return { ...st, killsByKind: { ...st.killsByKind }, levelUps: st.levelUps.map((l) => ({ ...l })) };
}

/** Builds a Sim and also hands back its internal state, for white-box tests. */
export function buildSim(opts: SimOptions): { sim: Sim; s: S } {
  const s = createState(opts);
  const sim: Sim = {
    step: (input) => stepSim(s, input),
    view: () => buildView(s),
    recruit: (id) => recruitHero(s, id),
    dismiss(id) {
      const n = s.npcs.find((p) => p.id === id);
      if (!n) return;
      dust(s, n.x, n.y, 4);
      s.npcs = s.npcs.filter((p) => p !== n);
    },
    spawnGroup(group) {
      for (const e of s.enemies) {
        if (!e.dormant || e.dead || e.group !== group) continue;
        e.dormant = false;
        dust(s, e.x, e.y, 4);
        alertEnemy(s, e);
        // A Flayed comes up out of its puddle before it hunts.
        wakeFlayed(e);
        wakeFlayer(s, e);
      }
    },
    openProp: (id) => openPropById(s, id),
    closeProp: (id) => closePropById(s, id),
    defend: () => startDefense(s),
    healParty: (frac) => healParty(s, frac),
    setDifficulty: (d) => setDifficulty(s, d),
    bonus(xp, quarters) {
      const h = activeHero(s);
      awardXp(s, xp);
      s.stats.quarters += Math.max(0, Math.floor(quarters));
      sfx(s, 'pickup');
      if (xp > 0) floater(s, `+${xp} XP`, h.x, h.y - 34, 'yellow', false, 90);
      if (quarters > 0) floater(s, `+${quarters} COINS`, h.x, h.y - 24, 'amber', false, 90);
    },
    heroPos() { const h = activeHero(s); return { x: h.x, y: h.y }; },
    party: () => snapshot(s),
    stats: () => copyStats(s.stats),
    enemiesAlive: (group) => s.enemies.filter((e) => !e.dead && (group === undefined || e.group === group)).length,
    aggro: () => anyAggro(s),
    dev: {
      get god() { return s.god; },
      set god(v: boolean) { s.god = v; },
      get hitboxes() { return s.boxes; },
      set hitboxes(v: boolean) { s.boxes = v; },
      giveXp: (n) => awardXp(s, n),
      setLevel: (n) => setActiveLevel(s, n),
      killAll() {
        for (const e of s.enemies) if (!e.dead) { e.dormant = false; e.hp = 0; }
        reapEnemies(s);
      },
      teleport(px, py) {
        for (const h of s.heroes) { h.x = px; h.y = py; h.vx = 0; h.vy = 0; }
        s.trailX.fill(px); s.trailY.fill(py);
      },
    },
  };
  return { sim, s };
}
