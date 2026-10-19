// The final fight (docs/level-16.md, stage 5.3): Vecna, the Mind Flayer with Vecna in its chest, then the channel, in one arena behind one boss
// bar. S.finale (finale_state.ts) holds the phase. The stage's `defend` beat step starts it (Sim.defend()), at the first boss still standing,
// so a retry that finds Vecna or the spider already down (the kill list carries them) starts at the next phase.
//
//   1 VECNA: group `boss` wakes: chapter 4's Vecna and his four memory orbs (enemies/vecna.ts), run at 1.3 times his pace with the clock chiming every
//     12 s (the spawn's x: speedMul 1.3, chimeEvery 720), the curse as 4.4 built it and Max's Walkman working. At 0 HP he sinks for the spawn's sinkT
//     frames in anim 'ko' (combat/kills.ts), his orbs and every curse they marked going with him, and SINK_WAIT frames into it the party gets its
//     breather and phase two begins.
//   2 THE MIND FLAYER: group `flayer` wakes. Its chest is shut and takes no hit until a hit on a leg opens it for chestT frames (enemies/flayer_legs.ts,
//     flayer_hit.ts); with every leg cut the head comes down and the chest is open then too. At 0 HP it dies as 3.3's does (one `groupCleared`, the
//     legs with it) and its body stays, kneeling (pose 'down'), for the rest of the stage. KNEEL_WAIT frames later, a breather and phase three.
//   3 THE CHANNEL: Eleven and Will walk to their marks and channel (combat/channel.ts) for the stage's `frames` while the party holds the line.
//     When the clock runs out: { t: 'finalRoll', heroes, roll }, the run-time enemies drop, and the stage's beat takes it from there.
//   The bar names each phase: VECNA, THE MIND FLAYER, THE CHANNEL, whose bar is its countdown. Each phase is announced once: { t: 'bossPhase', phase }.
import type { HudView } from '../core/types.ts';
import { rollFinal } from '../ui/finalroll_logic.ts';
import type { Enemy, S } from './state.ts';
import type { Finale } from './finale_state.ts';
import { flashScreen, shake, sfx } from './fx.ts';
import { healParty } from './party.ts';
import { dropRuntime, startChannel, stepChannel } from './channel.ts';
import { wakeGroup } from './wake.ts';

/** Frames into Vecna's sink before the Mind Flayer rises, and into the Mind Flayer's kneel before the channel starts. */
export const SINK_WAIT = 44;
export const KNEEL_WAIT = 60;
/** The share of everyone's HP and MP a phase change gives back, standing the fallen up. */
export const BREATHER = 0.3;

const firstOf = (s: S, kind: Enemy['kind']): Enemy | undefined => s.enemies.find((e) => e.kind === kind);
/** A boss of this kind that has not died yet, awake or not. */
const standing = (s: S, kind: Enemy['kind']): Enemy | undefined => s.enemies.find((e) => e.kind === kind && !e.dead);

function begin(s: S, f: Finale, phase: 1 | 2 | 3): void {
  f.phase = phase;
  f.t = 0;
  f.wait = 0;
  s.events.push({ t: 'bossPhase', phase });
  if (phase > 1) healParty(s, BREATHER);
  if (phase === 1) wakeGroup(s, (standing(s, 'vecna') as Enemy).group);
  else if (phase === 2) wakeGroup(s, (standing(s, 'flayer5') as Enemy).group);
  else startChannel(s, f);
}

/** Sim.defend(): the fight starts at the first boss still standing. Does nothing without a finale, or once it has started. */
export function startFinale(s: S): void {
  const f = s.finale;
  if (!f || f.phase !== 0) return;
  begin(s, f, standing(s, 'vecna') ? 1 : standing(s, 'flayer5') ? 2 : 3);
}

/** The clock ran out with the channelers standing: the Final Roll of every hero still up, and nothing run-time is left on the field. */
function finalRoll(s: S, f: Finale): void {
  f.done = true;
  f.left = 0;
  dropRuntime(s);
  const heroes = s.heroes.filter((h) => !h.ko).map((h) => h.id);
  s.events.push({ t: 'finalRoll', heroes, roll: rollFinal(heroes, s.rng) });
  sfx(s, 'gateShut');
  shake(s, 7);
  flashScreen(s, 0.7);
}

/** One tick: the next phase when a boss has been down long enough, or the channel's clock. Runs after the enemies have had their turn. */
export function updateFinale(s: S): void {
  const f = s.finale;
  if (!f || f.phase === 0 || f.done || s.over) return;
  f.t++;
  if (f.phase === 1) {
    const v = firstOf(s, 'vecna');
    if (!v || (v.dead && ++f.wait >= SINK_WAIT)) begin(s, f, standing(s, 'flayer5') ? 2 : 3);
  } else if (f.phase === 2) {
    const b = firstOf(s, 'flayer5');
    if (!b || (b.dead && ++f.wait >= KNEEL_WAIT)) begin(s, f, 3);
  } else if (stepChannel(s, f)) {
    finalRoll(s, f);
  }
}

/** HudView.boss in the final fight, or undefined outside it (view.ts then looks for an ordinary boss). */
export function finaleBar(s: S): HudView['boss'] | undefined {
  const f = s.finale;
  if (!f || f.phase === 0) return undefined;
  const hp = (e: Enemy | undefined): number => (e && !e.dead ? Math.max(0, Math.ceil(e.hp)) : 0);
  if (f.phase === 1) {
    const v = firstOf(s, 'vecna');
    // His four memory orbs as the share of HP each has left, 0 for a broken one, as 4.4's bar shows them.
    const parts = (v?.vecna?.orbs ?? []).map((o) => (o.dead || o.hp <= 0 ? 0 : Math.min(1, o.hp / o.hpMax)));
    return { name: 'VECNA', hp: hp(v), hpMax: v?.hpMax ?? 1, parts, phase: 1 };
  }
  if (f.phase === 2) {
    const b = firstOf(s, 'flayer5');
    // The legs' shares, as the 3.3 bar shows them: 0 for a cut one.
    const parts = (b?.flayer?.legs ?? []).map((l) => (l.dead || l.hp <= 0 ? 0 : Math.min(1, l.hp / l.hpMax)));
    return { name: 'THE MIND FLAYER', hp: hp(b), hpMax: b?.hpMax ?? 1, parts, phase: 2 };
  }
  return { name: 'THE CHANNEL', hp: Math.max(0, f.left), hpMax: f.total, phase: 3 };
}
