// What a stage leaves behind (docs/level-9.md), kept out of the play scene so Node can test it: the Key's machine blowing up under the
// mall (the `boom` beat step), Billy's body after a retry, and an npc a beat sent away who must not come back with the next sim.
// Pure functions: no DOM and no audio.
import type { CharId, PropView, SimOptions, SimView, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import type { Beat } from './types.ts';

/** How long the boom shakes the screen, in frames, and how far it throws it at first, in px. The shake dies away over the run. */
export const BOOM_FRAMES = 90;
const BOOM_PX = 5;

/**
 * The view `t` frames after the boom: its shake added to the sim's (`scale` is the shake setting, 0 to 1) and every lit lights prop
 * dark, for good. Only the look changes: the sim's props, and so the save points and the checkpoints, are as they were.
 */
export function boomView(view: SimView, t: number, scale: number): SimView {
  const amp = t < BOOM_FRAMES ? BOOM_PX * scale * (1 - t / BOOM_FRAMES) : 0;
  const dark = (p: PropView): PropView => (p.kind === 'lights' && (p.state === 'open' || p.state === 'lit') ? { ...p, state: 'off' } : p);
  return {
    ...view,
    shake: { x: view.shake.x + Math.round(Math.sin(t * 1.9) * amp), y: view.shake.y + Math.round(Math.cos(t * 2.3) * amp * 0.7) },
    props: view.props.map(dark),
  };
}

/**
 * A freed Billy is in the kill list, so a retry or a load builds no Billy, and he would be missing from the floor. Gives the options an
 * npc `billy` in his place: where he fell (`fell` holds each kill's x and y, px) or, with no record of it (a load), on his spawn tile.
 * The npc has Billy's id and skipSpawns drops npcs by id too, so he is taken out of the spawns instead of staying in the skip list.
 */
export function deadBilly(o: SimOptions, skip: readonly string[], fell: ReadonlyMap<string, Vec2>): SimOptions {
  const spawn = o.spawns.find((s) => s.kind === 'enemy' && s.type === 'billy');
  if (!spawn || spawn.kind !== 'enemy' || !skip.includes(spawn.id)) return o;
  const at = fell.get(spawn.id);
  const tx = at ? Math.floor(at.x / TILE) : spawn.tx, ty = at ? Math.floor((at.y - 4) / TILE) : spawn.ty;
  return {
    ...o,
    spawns: [...o.spawns.filter((s) => s !== spawn), { kind: 'npc', id: spawn.id as CharId, tx, ty, dir: spawn.dir ?? 'down' }],
    skipSpawns: (o.skipSpawns ?? []).filter((id) => id !== spawn.id),
  };
}

/** The npcs a `leave` step of an already fired beat has sent away: they are not spawned again after a retry or a load (Hopper, 3.3). */
export function leavers(beats: readonly Beat[], fired: readonly string[]): CharId[] {
  return beats.filter((b) => fired.includes(b.id)).flatMap((b) => b.steps.flatMap((st) => (st.t === 'leave' ? [st.npc] : [])));
}
