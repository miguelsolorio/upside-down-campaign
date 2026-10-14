// Security cameras in the real sim: the sweep, the cone, the line of sight, the spotted event, the alert, and what a
// shot does. Plus the three furniture props, which are plain solid blocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camHeading, CAM_ALERT } from '../src/combat/cameras.ts';
import { arena, idle, inp, makeWhite, ofType, run, sfxIds, tc, tf } from './sim-helpers.ts';
import type { CamDef, PropView, SimEvent, SimSpawn } from '../src/core/types.ts';

const RAD = Math.PI / 180;
const STARE: CamDef = { from: 90, to: 90, period: 240, range: 120, half: 25 };

const cam = (id: string, tx: number, ty: number, def: CamDef = STARE, extra: Partial<Extract<SimSpawn, { kind: 'prop' }>> = {}): SimSpawn =>
  ({ kind: 'prop', id, prop: 'camera', tx, ty, hitBy: 'shoot', cam: def, ...extra });

/** A camera at tile (12, 2) looking down and Mike straight below it, 96 px away. */
function rig(over: Parameters<typeof makeWhite>[0] = {}, def: CamDef = STARE) {
  return makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(12), y: tf(8) }, spawns: [cam('cam1', 12, 2, def)], ...over });
}
const spots = (ev: SimEvent[]): number => ofType(ev, 'spotted').length;
const camView = (sim: { view(): { props: PropView[] } }, id = 'cam1'): PropView => sim.view().props.find((p) => p.id === id) as PropView;

test('camera: the head sweeps smoothly from one heading to the other and back, over `period` frames', () => {
  const def: CamDef = { from: 20, to: 160, period: 240, range: 100, half: 20 };
  const { sim } = rig({ start: { x: tc(3), y: tf(12) } }, def);
  const angles: number[] = [(camView(sim).cam as NonNullable<PropView['cam']>).angle];
  for (let k = 1; k <= 480; k++) {
    sim.step(idle());
    angles.push((camView(sim).cam as NonNullable<PropView['cam']>).angle);
  }
  assert.ok(Math.abs((angles[0] as number) - 20 * RAD) < 1e-9, 'it starts at `from`');
  assert.ok(Math.abs((angles[120] as number) - 160 * RAD) < 1e-9, 'half a period later it is at `to`');
  assert.ok(Math.abs((angles[240] as number) - 20 * RAD) < 1e-9, 'a full period later it is back');
  assert.ok(Math.abs((angles[360] as number) - 160 * RAD) < 1e-9, 'and it keeps going');
  let maxStep = 0;
  for (let i = 1; i <= 120; i++) {
    const d = (angles[i] as number) - (angles[i - 1] as number);
    assert.ok(d > 0, `still turning forward at frame ${i}`);
    maxStep = Math.max(maxStep, d);
  }
  assert.ok(maxStep < 0.04, `no jumps: the largest step is ${maxStep.toFixed(4)} rad`);
  const early = (angles[3] as number) - (angles[0] as number), middle = (angles[63] as number) - (angles[60] as number);
  assert.ok(early < middle / 4, 'it eases out of the ends');
  const v = camView(sim).cam as NonNullable<PropView['cam']>;
  assert.deepEqual([v.range, v.live], [100, true]);
  assert.ok(Math.abs(v.half - 20 * RAD) < 1e-9, 'half is in radians, like angle');
});

test('camera: the view carries the live cone every tick, and a camera that was not given a cone has none', () => {
  const { sim } = rig({ start: { x: tc(3), y: tf(12) }, spawns: [cam('cam1', 12, 2, { from: 0, to: 90, period: 100, range: 90, half: 15 }), { kind: 'prop', id: 'c', prop: 'crate', tx: 6, ty: 6 }] });
  const seen = new Set<number>();
  for (let k = 0; k < 20; k++) {
    sim.step(idle());
    seen.add((camView(sim).cam as NonNullable<PropView['cam']>).angle);
  }
  assert.equal(seen.size, 20, 'a new heading each tick');
  assert.equal(camView(sim, 'c').cam, undefined);
});

test('camera: it spots the hero inside the cone, within range, with a clear line', () => {
  const near = rig();
  assert.equal(spots(run(near.sim, 3)), 1, 'straight below, 96 px away');
  const far = rig({ start: { x: tc(12), y: tf(8) + 40 } });
  assert.equal(spots(run(far.sim, 60)), 0, 'out of range');
  for (const [dx, seen] of [[35, true], [-35, true], [60, false], [-60, false]] as const) {
    const r = rig({ start: { x: tc(12) + dx, y: tf(8) } });
    assert.equal(spots(run(r.sim, 5)) === 1, seen, `${dx} px to the side`);
  }
});

test('camera: a wall or a solid prop between it and the hero blocks the view, a non-solid prop does not', () => {
  const wall = rig({ grid: arena(24, 16, { '12,5': 'T' }) });
  assert.equal(spots(run(wall.sim, 60)), 0, 'a wall tile in the way');
  const crate = rig({ spawns: [cam('cam1', 12, 2), { kind: 'prop', id: 'c', prop: 'crate', tx: 12, ty: 5 }] });
  assert.equal(spots(run(crate.sim, 60)), 0, 'a crate in the way');
  const sign = rig({ spawns: [cam('cam1', 12, 2), { kind: 'prop', id: 's', prop: 'sign', tx: 12, ty: 5, solid: false }] });
  assert.equal(spots(run(sign.sim, 5)), 1, 'a sign you can walk through is not in the way');
  const opened = rig({ spawns: [cam('cam1', 12, 2), { kind: 'prop', id: 'c', prop: 'crate', tx: 12, ty: 5 }], openProps: ['c'] });
  assert.equal(spots(run(opened.sim, 5)), 1, 'a cleared crate is not either');
  const beside = rig({ grid: arena(24, 16, { '11,5': 'T', '13,5': 'T' }) });
  assert.equal(spots(run(beside.sim, 5)), 1, 'walls beside the line do not matter');
});

test('camera: bolted into a wall it still sees out of it', () => {
  const r = rig({ grid: arena(24, 16, { '12,2': 'T', '11,2': 'T', '13,2': 'T' }) });
  assert.equal(spots(run(r.sim, 5)), 1);
});

test('camera: only the sweep decides when: it spots the hero as the cone passes over them', () => {
  const def: CamDef = { from: 20, to: 160, period: 240, range: 130, half: 10 };
  // The hero is down and to the right: 45 degrees from the camera's middle.
  const { sim } = rig({ start: { x: tc(12) + 80, y: tf(2) + 80 - 3 } }, def);
  const camX = 12 * 16 + 8, camY = 2 * 16 + 8;
  const bearing = Math.atan2(sim.heroPos().y - 4 - camY, sim.heroPos().x - camX);
  let first = -1;
  for (let k = 1; k <= 200 && first < 0; k++) {
    if (spots(sim.step(idle())) > 0) first = k;
  }
  assert.ok(first > 0, 'it spotted the hero');
  const heading = camHeading(def, first);
  assert.ok(Math.abs(heading - bearing) <= 10 * RAD + 0.03, `heading ${(heading / RAD).toFixed(1)} deg against a bearing of ${(bearing / RAD).toFixed(1)}`);
  assert.ok(heading < bearing, 'and it caught the hero on the way in, not after');
});

test('camera: alert for 120 frames, one spotted event and one sound per spotting, then back to closed', () => {
  const r = rig();
  const frames: { state: string; ev: SimEvent[] }[] = [];
  for (let k = 0; k < 400; k++) {
    const ev = r.sim.step(idle());
    frames.push({ state: camView(r.sim).state, ev });
  }
  const at = frames.map((f, i) => (spots(f.ev) > 0 ? i + 1 : -1)).filter((i) => i > 0);
  assert.equal(at[0], 1);
  const sounds = frames.map((f, i) => (sfxIds(f.ev).includes('spotted') ? i + 1 : -1)).filter((i) => i > 0);
  assert.deepEqual(sounds, at, 'the sound is with the event');
  let len = 0;
  while (frames[len]?.state === 'alert') len++;
  assert.equal(len, CAM_ALERT, 'alert for 120 frames');
  assert.equal(frames[len]?.state, 'closed');
  assert.equal(CAM_ALERT, 120);
  assert.equal(at[1], 1 + 121, 'a hero who stays in the cone is spotted again once it has gone back to closed');
  assert.ok(frames.slice(0, 120).every((f) => ofType(f.ev, 'spotted').length <= 1));
  assert.deepEqual(ofType(frames[0]!.ev, 'spotted').map((e) => e.propId), ['cam1']);
});

test('camera: a hero who steps out of the cone is spotted once, and the camera returns to closed', () => {
  const r = rig();
  let total = spots(run(r.sim, 2));
  r.sim.dev.teleport(tc(4), tf(12));
  total += spots(run(r.sim, 200));
  assert.equal(total, 1);
  assert.equal(camView(r.sim).state, 'closed');
});

test('camera: a shot lights it, it switches off, and it never spots again', () => {
  const r = makeWhite({ party: [{ id: 'lucas', level: 3 }], start: { x: tc(12), y: tf(8) }, spawns: [cam('cam1', 12, 2)] });
  const events = [...run(r.sim, 3, inp({ my: -0.3 }))];
  assert.equal(r.s.props[0]?.state, 'alert', 'it saw Lucas first');
  events.push(...run(r.sim, 1, inp({ attackPressed: true })));
  events.push(...run(r.sim, 40));
  const v = camView(r.sim);
  assert.equal(v.state, 'lit');
  assert.equal((v.cam as NonNullable<PropView['cam']>).live, false);
  assert.deepEqual(ofType(events, 'targetHit').map((e) => e.propId), ['cam1']);
  assert.ok(sfxIds(events).includes('targetHit'));
  const later = run(r.sim, 600);
  assert.equal(spots(later), 0, 'it never spots again');
  assert.equal(camView(r.sim).state, 'lit');
  const angle = (camView(r.sim).cam as NonNullable<PropView['cam']>).angle;
  run(r.sim, 30);
  assert.equal((camView(r.sim).cam as NonNullable<PropView['cam']>).angle, angle, 'and its head stops turning');
});

test('camera: only a shot lights it: a Push, a spray or a bat swing at it does nothing', () => {
  for (const id of ['eleven', 'dustin', 'mike'] as const) {
    const r = makeWhite({ party: [{ id, level: 3 }], start: { x: tc(12), y: tf(3) + 4 }, spawns: [cam('cam1', 12, 2, { from: 90, to: 90, period: 100, range: 5, half: 5 })] });
    run(r.sim, 2, inp({ my: -0.3 }));
    for (let k = 0; k < 6; k++) run(r.sim, 10, inp({ attackPressed: true, specialPressed: true, my: -0.2 }));
    assert.notEqual(camView(r.sim).state, 'lit', id);
  }
});

test('camera: marked smash, a bat swing, a Push or a candy lure from right under it lights it too', () => {
  for (const id of ['mike', 'eleven', 'dustin'] as const) {
    const r = makeWhite({ party: [{ id, level: 3 }], start: { x: tc(12), y: tf(3) + 4 }, spawns: [cam('cam1', 12, 2, { from: 90, to: 90, period: 100, range: 5, half: 5 }, { smash: true })] });
    run(r.sim, 2, inp({ my: -0.3 }));
    const ev = run(r.sim, 10, inp({ attackPressed: true, my: -0.2 }));
    assert.equal(camView(r.sim).state, 'lit', id);
    assert.deepEqual(ofType(ev, 'targetHit').map((e) => e.propId), ['cam1'], id);
    assert.equal(ofType(ev, 'poked').length, 0, `${id}: the swing that smashed it is not also a try at it`);
  }
});

test('camera: marked smash, a swing from a tile back, one facing away or a special does nothing', () => {
  const smashable = (y: number) => makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(12), y }, spawns: [cam('cam1', 12, 2, { from: 90, to: 90, period: 100, range: 5, half: 5 }, { smash: true })] });
  const back = smashable(tf(4) + 4);
  run(back.sim, 2, inp({ my: -0.3 }));
  run(back.sim, 10, inp({ attackPressed: true, my: -0.2 }));
  assert.notEqual(camView(back.sim).state, 'lit', 'a tile back');
  const away = smashable(tf(3) + 4);
  run(away.sim, 2, inp({ my: 0.3 }));
  run(away.sim, 10, inp({ attackPressed: true, my: 0.2 }));
  assert.notEqual(camView(away.sim).state, 'lit', 'facing away');
  const special = makeWhite({ party: [{ id: 'eleven', level: 3 }], start: { x: tc(12), y: tf(3) + 4 }, spawns: [cam('cam1', 12, 2, { from: 90, to: 90, period: 100, range: 5, half: 5 }, { smash: true })] });
  run(special.sim, 2, inp({ my: -0.3 }));
  run(special.sim, 10, inp({ specialPressed: true, my: -0.2 }));
  assert.notEqual(camView(special.sim).state, 'lit', 'a Mind Blast');
});

test('camera: a retry from a checkpoint after it was shot keeps it lit, and nothing wakes it', () => {
  const r = rig({ openProps: ['cam1'] });
  const v = camView(r.sim);
  assert.equal(v.state, 'lit');
  assert.equal((v.cam as NonNullable<PropView['cam']>).live, false);
  assert.equal(spots(run(r.sim, 300)), 0);
  assert.equal(camView(r.sim).state, 'lit');
});

test('camera: openProp lights it too, once', () => {
  const r = rig({ start: { x: tc(4), y: tf(12) } });
  r.sim.openProp('cam1');
  const ev = run(r.sim, 2);
  assert.equal(camView(r.sim).state, 'lit');
  assert.equal(ofType(ev, 'targetHit').length, 1);
  r.sim.openProp('cam1');
  assert.equal(ofType(run(r.sim, 2), 'targetHit').length, 0);
});

test('camera: it is not solid, so a hero walks through its tile', () => {
  const r = makeWhite({ party: [{ id: 'mike' }], start: { x: tc(6), y: tf(8) }, spawns: [cam('cam1', 8, 8, { from: 0, to: 0, period: 100, range: 4, half: 5 })] });
  run(r.sim, 80, inp({ mx: 1 }));
  assert.ok(r.sim.heroPos().x > tc(10), 'walked straight through');
});

test('furniture: tank, rack and generator are solid blocks, and nothing else', () => {
  for (const prop of ['tank', 'rack', 'generator'] as const) {
    const r = makeWhite({ party: [{ id: 'mike' }], start: { x: tc(6), y: tf(8) }, spawns: [{ kind: 'prop', id: 'f', prop, tx: 8, ty: 8, w: 16, h: 16 }] });
    const ev = run(r.sim, 80, inp({ mx: 1 }));
    assert.ok(r.sim.heroPos().x < tc(8) - 4, `${prop} stops the hero at x ${r.sim.heroPos().x.toFixed(1)}`);
    assert.equal(ev.filter((e) => e.t !== 'sfx').length, 0, 'and it does nothing else');
    assert.equal(r.sim.view().props[0]?.state, 'closed');
    assert.equal(r.sim.view().props[0]?.cam, undefined);
  }
  const free = makeWhite({ party: [{ id: 'mike' }], start: { x: tc(6), y: tf(8) }, spawns: [{ kind: 'prop', id: 'f', prop: 'rack', tx: 8, ty: 8, solid: false }] });
  run(free.sim, 80, inp({ mx: 1 }));
  assert.ok(free.sim.heroPos().x > tc(9), 'unless the spawn says otherwise');
});
