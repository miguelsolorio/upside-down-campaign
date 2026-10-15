// Stage 2.3, the Gate: the beats and what each one does, the 12 scripts and their voices, and the bot's route. The map, the budget and
// the defense are in stage23.test.ts, and the real sim and the whole headless runs are in stage23-play.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { L6_SCRIPTS } from '../src/story/scripts_l6.ts';
import { STAGE_23 as S } from '../src/world/stages/stage23.ts';
import { routeFrom } from '../src/world/options.ts';
import { createDirector, musicAfter } from '../src/world/triggers.ts';
import type { DirectorEnv } from '../src/world/triggers.ts';
import type { TileRect } from '../src/world/types.ts';
import type { Sim } from '../src/core/types.ts';
import { propTiles, rectTiles, stageKit, tileOf } from './stage-helpers.ts';
import type { Prop } from './stage-helpers.ts';

const kit = stageKit(S);
const { grid, idx, props, flood, startTx, startTy } = kit;
const prop = (id: string): Prop => props.find((p) => p.id === id) as Prop;
const solid = (x: number, y: number): boolean => grid.solid[idx(x, y)] === 1;
const when = (id: string): unknown => S.beats.find((b) => b.id === id)?.when;
const rectOf = (id: string): TileRect => (when(id) as { rect: TileRect }).rect;
const steps = (id: string): unknown[] => S.beats.find((b) => b.id === id)?.steps ?? [];
const BEAT_IDS = ['start', 'crack_hint', 'crack_open', 'storage', 'gap_hint', 'gap_crossed', 'den', 'alpha', 'alpha_down', 'gate', 'defend', 'level_clear'];
const SCRIPT_IDS = ['l6_start', 'l6_crack_hint', 'l6_crack_done', 'l6_storage', 'l6_gap_hint', 'l6_gap_done', 'l6_den', 'l6_alpha', 'l6_alpha_down', 'l6_gate', 'l6_defend', 'l6_clear'];
const open = new Set(['crack1', 'gap1']);

// ---------------------------------------------------------------- beats
test('stage 2.3: every beat has a trigger and a real script, in the spec\'s order, and the steps are the spec\'s', () => {
  assert.deepEqual(S.beats.map((b) => b.id), BEAT_IDS, 'the beats are the spec\'s, in route order');
  const groups = new Set(kit.enemies.map((e) => e.group));
  const ids = S.beats.map((b) => b.id);
  const reach = flood(open);
  for (const b of S.beats) {
    for (const st of b.steps) {
      if (st.t === 'say') assert.ok(SCRIPT_IDS.includes(st.script) && SCRIPTS[st.script], `${b.id} plays ${st.script}`);
      if (st.t === 'wake') assert.ok(groups.has(st.group), `${b.id} wakes ${st.group}`);
      if (st.t === 'open' || st.t === 'close') assert.ok(props.some((p) => p.id === st.prop), `${b.id} ${st.t}s ${st.prop}`);
    }
    const w = b.when;
    if ('rect' in w) {
      assert.ok(rectTiles(w.rect).some(([x, y]) => at(reach, x, y) === 1), `${b.id} rect is reachable`);
      if (w.needs) assert.ok(ids.includes(w.needs), `${b.id} needs ${w.needs}`);
    } else if ('cleared' in w) assert.ok(groups.has(w.cleared), `${b.id} waits on ${w.cleared}`);
    else if ('after' in w) assert.ok(ids.includes(w.after), `${b.id} follows ${w.after}`);
    else if (w.event === 'pinned') assert.fail('no pinned boss in this stage');
    else if (w.event === 'defended') assert.ok(S.defense, 'the defended beat needs a defense');
    else assert.ok(props.some((p) => p.id === w.prop), `${b.id} watches ${w.prop}`);
  }
  const said = new Set(S.beats.flatMap((b) => b.steps.flatMap((st) => (st.t === 'say' ? [st.script] : []))));
  assert.deepEqual([...said].sort(), [...SCRIPT_IDS].sort(), 'every script is played by some beat, and no other is');
  assert.deepEqual(when('crack_open'), { event: 'propCleared', prop: 'crack1' });
  assert.deepEqual(when('gap_crossed'), { event: 'propCleared', prop: 'gap1' });
  assert.deepEqual(when('alpha_down'), { cleared: 'boss' });
  assert.deepEqual(when('level_clear'), { event: 'defended' });
  assert.equal((when('alpha') as { needs: string }).needs, 'den');
  assert.equal((when('gate') as { needs: string }).needs, 'alpha_down');
  assert.equal((when('defend') as { needs: string }).needs, 'gate');
  assert.deepEqual(steps('alpha'), [
    { t: 'close', prop: 'seal1' }, { t: 'close', prop: 'seal2' }, { t: 'music', track: 'clock' }, { t: 'say', script: 'l6_alpha' }, { t: 'wake', group: 'boss' },
  ]);
  assert.deepEqual(steps('alpha_down'), [{ t: 'open', prop: 'seal1' }, { t: 'open', prop: 'seal2' }, { t: 'say', script: 'l6_alpha_down' }]);
  assert.deepEqual(steps('defend'), [{ t: 'say', script: 'l6_defend' }, { t: 'defend' }]);
  assert.deepEqual(steps('level_clear'), [{ t: 'say', script: 'l6_clear' }, { t: 'finish' }]);
  for (const id of ['start', 'crack_hint', 'crack_open', 'storage', 'gap_hint', 'gap_crossed', 'den', 'gate']) {
    assert.equal(steps(id).length, 1, `${id} is a script and nothing else`);
  }
  assert.ok(S.beats.every((b) => b.steps.every((st) => st.t !== 'scare' && st.t !== 'alarm' && st.t !== 'waves' && st.t !== 'recruit')), 'no scare, alarm, ambush waves or recruit');
});

const at = (r: Uint8Array, x: number, y: number): number => r[idx(x, y)] as number;

test('stage 2.3: the rect beats sit where the spec puts them, behind the right gates', () => {
  const through = (gates: string[], id: string): boolean => rectTiles(rectOf(id)).some(([x, y]) => at(flood(new Set(gates)), x, y) === 1);
  for (const id of ['start', 'crack_hint']) assert.ok(through([], id), `${id} is reachable at the start`);
  for (const id of ['storage', 'den', 'alpha', 'gate', 'defend']) {
    assert.ok(through(['crack1'], id), `${id} is reachable once crack1 is broken`);
    assert.ok(!through([], id), `and not before`);
  }
  assert.ok(through(['crack1'], 'gap_hint'), 'the gap hint is reachable on the route, on this side of gap1');
  const start = rectOf('start');
  assert.ok(start.tx <= startTx && startTx < start.tx + start.w && start.ty <= startTy && startTy < start.ty + start.h, 'the start beat covers the start');
  const crack = prop('crack1'), gap = prop('gap1');
  const ch = rectOf('crack_hint');
  assert.ok(ch.tx + ch.w <= crack.tx, 'the crack hint stands on the corridor side of crack1');
  assert.ok(ch.ty <= crack.ty && crack.ty < ch.ty + ch.h, 'in line with it');
  const gh = rectOf('gap_hint');
  assert.ok(gh.tx + gh.w <= gap.tx && gh.ty <= gap.ty && gap.ty < gh.ty + gh.h, 'the gap hint stands on the near side of gap1');
  // The Alpha's trigger is deep: nobody who sets it off is standing in a doorway the seals are about to fill.
  const sealTiles = [...propTiles(prop('seal1')), ...propTiles(prop('seal2'))];
  for (const [x, y] of rectTiles(rectOf('alpha'))) {
    assert.ok(!solid(x, y), 'the trigger is on floor');
    for (const [sx, sy] of sealTiles) assert.ok(Math.hypot(x - sx, y - sy) >= 3, `${x},${y} is within three tiles of a seal at ${sx},${sy}`);
  }
  const den = rectTiles(rectOf('den'));
  assert.ok(den.every(([x, y]) => y >= 19 && y <= 20 && x < prop('seal1').tx + 5), 'the den beat is in the hall outside the south doors');
  const gate = rectOf('gate'), rift = prop('rift');
  assert.ok(gate.tx + gate.w <= 34 && gate.tx >= 32, 'the gate beat is the chamber\'s doorway');
  const defend = rectOf('defend');
  assert.ok(defend.ty > rift.ty + 3 && defend.tx <= rift.tx && defend.tx + defend.w > rift.tx + 3, 'the defend trigger is in front of the rift');
  const p = prop('lights_gate');
  assert.ok(Math.hypot(p.tx + 1 - (gate.tx + 1), p.ty - (gate.ty + 1)) <= 6, 'lights_gate is a few tiles behind the doorway, so the script can send the party back to it');
});

/** A scripted stand-in for the sim, so the director's steps can be read off in order. */
function stand(alive: Record<string, number>): { env: DirectorEnv; log: string[] } {
  const log: string[] = [];
  const sim = {
    enemiesAlive: (g?: string) => (g === undefined ? 0 : alive[g] ?? 0),
    spawnGroup: (g: string) => { log.push(`wake ${g}`); },
    closeProp: (id: string) => { log.push(`close ${id}`); },
    defend: () => { log.push('defend'); },
    party: () => [],
  } as unknown as Sim;
  const env: DirectorEnv = {
    sim: () => sim,
    say: (id, done) => { log.push(`say ${id}`); done(); },
    scare: (done) => { log.push('scare'); done(); },
    open: (id) => { log.push(`open ${id}`); },
    music: (track) => { log.push(`music ${track}`); },
    jingle: () => undefined,
    finish: () => { log.push('finish'); },
  };
  return { env, log };
}

test('director: the beats run in route order, the Alpha shuts the seals and its death opens them, and the defense ends the stage', () => {
  const { env, log } = stand({ boss: 1 });
  const d = createDirector(S.beats, S.waves, env);
  const run = (fn: () => void): string[] => { log.length = 0; fn(); return [...log]; };
  const tick = (id: string): void => { const r = rectOf(id); d.tick(r.tx, r.ty); };
  assert.deepEqual(run(() => { d.tick(startTx, startTy); d.tick(startTx, startTy); }), ['say l6_start'], 'a rect beat fires once');
  assert.deepEqual(run(() => tick('crack_hint')), ['say l6_crack_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'crack1' }])), ['say l6_crack_done']);
  assert.deepEqual(run(() => tick('storage')), ['say l6_storage']);
  assert.deepEqual(run(() => tick('gap_hint')), ['say l6_gap_hint']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'gap1' }])), ['say l6_gap_done']);
  assert.deepEqual(run(() => d.events([{ t: 'propCleared', propId: 'seal1' }])), [], 'a seal clearing says nothing');
  assert.deepEqual(run(() => tick('alpha')), [], 'the Alpha waits for the den beat');
  assert.deepEqual(run(() => tick('den')), ['say l6_den']);
  assert.deepEqual(run(() => tick('alpha')), ['close seal1', 'close seal2', 'music clock', 'say l6_alpha', 'wake boss']);
  assert.deepEqual(run(() => tick('gate')), [], 'the gate waits for the Alpha');
  assert.deepEqual(run(() => d.events([{ t: 'groupCleared', group: 'boss' }])), ['open seal1', 'open seal2', 'say l6_alpha_down']);
  assert.deepEqual(run(() => tick('defend')), [], 'the defense waits for the gate beat');
  assert.deepEqual(run(() => tick('gate')), ['say l6_gate']);
  assert.ok(!d.finished());
  assert.deepEqual(run(() => tick('defend')), ['say l6_defend', 'defend']);
  assert.ok(!d.finished(), 'the defense runs on after its start');
  assert.deepEqual(run(() => d.events([{ t: 'defended' }])), ['say l6_clear', 'finish']);
  assert.ok(d.finished());
});

test('director: a retry from lights_gate comes back with the Alpha\'s beats fired, so the defense is next', () => {
  const { env, log } = stand({ boss: 0 });
  const d = createDirector(S.beats, S.waves, env);
  const fired = ['start', 'crack_hint', 'crack_open', 'storage', 'den', 'alpha', 'alpha_down'];
  d.restore({ fired, cleared: ['boss'] });
  log.length = 0;
  const r = rectOf('alpha');
  d.tick(r.tx, r.ty);
  assert.deepEqual(log, [], 'the Alpha does not fire again');
  const g = rectOf('gate');
  d.tick(g.tx, g.ty);
  assert.deepEqual(log, ['say l6_gate']);
  const f = rectOf('defend');
  d.tick(f.tx, f.ty);
  assert.deepEqual(log, ['say l6_gate', 'say l6_defend', 'defend']);
  assert.equal(musicAfter(S.beats, fired, S.music), 'clock', 'and the boss track carries on after the retry');
  assert.equal(musicAfter(S.beats, ['start', 'den'], S.music), 'lab', 'before the Alpha it is the lab track');
  assert.equal(musicAfter(S.beats, [], S.music), S.music);
});

// ---------------------------------------------------------------- scripts
test('stage 2.3: the 12 scripts exist, match the level doc, fit the box on a keyboard and a pad, and keep to their voices', () => {
  const doc = readFileSync(new URL('../docs/level-6.md', import.meta.url), 'utf8');
  const listed = [...(/^Scripts:\s*(.+)$/m.exec(doc)?.[1] ?? '').split('. ')[0]?.matchAll(/`([a-z0-9_]+)`/g) ?? []].map((m) => m[1] as string);
  assert.deepEqual([...listed].sort(), [...SCRIPT_IDS].sort(), 'the doc and the test agree on the twelve');
  assert.deepEqual(L6_SCRIPTS.map((s) => s.id), SCRIPT_IDS, 'in route order');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l6_')).sort(), [...SCRIPT_IDS].sort(), 'no stray l6 scripts');
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const s of L6_SCRIPTS) {
        assert.ok(s.lines.length >= 3 && s.lines.length <= 8, `${s.id} has ${s.lines.length} lines`);
        for (const [i, l] of s.lines.entries()) {
          const shown = keyText(l.text);
          assert.ok(shown.length <= 96 && fitsBox(shown), `${device} ${s.id}[${i}] needs ${wrapText(shown).length} rows: ${shown}`);
          assert.ok(!/\{|\}/.test(shown), `${s.id}[${i}] has an unfilled token`);
        }
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
  const all = L6_SCRIPTS.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  const who = (id: string): Set<string> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  const by = (name: string): typeof all => all.filter((l) => l.who === name);
  assert.ok(all.every((l) => !hasEmDash(l.text)), 'no em dashes');
  assert.ok(all.every((l) => !/seamless|robust|leverage|unlock|delve/i.test(l.text)), 'no banned words');
  assert.ok(!all.some((l) => /\{swapTo\d\}/.test(l.text)), 'no line names a swap slot: the party is picked on the map');
  // Eleven and Hopper meet the party at the Gate, and not before.
  const gateAt = SCRIPT_IDS.indexOf('l6_gate');
  for (const l of all) {
    if (SCRIPT_IDS.indexOf(l.id) < gateAt) assert.ok(l.who !== 'eleven' && l.who !== 'hopper' && !/eleven|hopper/i.test(l.text), `${l.id}[${l.i}] jumps the reunion`);
  }
  for (const id of ['l6_gate', 'l6_defend', 'l6_clear']) assert.ok(who(id).has('eleven') && who(id).has('hopper'), `${id} has Eleven and Hopper`);
  assert.deepEqual(by('eleven').map((l) => l.id).filter((id, i, a) => a.indexOf(id) === i), ['l6_gate', 'l6_defend', 'l6_clear'], 'Eleven speaks only at the Gate');
  // Eleven speaks in short sentences now, not single words: three or four words, never a speech.
  for (const l of by('eleven')) {
    for (const sentence of l.text.split(/(?<=[.?!])\s+/)) assert.ok(sentence.split(/\s+/).length <= 6, `${l.id}[${l.i}]: "${sentence}" runs long`);
    assert.ok(l.text.length <= 40, `${l.id}[${l.i}]: ${l.text}`);
  }
  assert.ok(by('eleven').some((l) => l.text.split(/\s+/).length >= 3), 'she speaks in sentences, not one word');
  assert.ok(by('hopper').length >= 5 && by('hopper').every((l) => l.text.length <= 70), 'Hopper is brief');
  assert.ok(by('hopper').some((l) => /Coffee first\. Monsters second\./.test(l.text)), 'gruff and soft underneath');
  // Mike gets the line when they see her again, and it is the first line of the script.
  assert.equal(SCRIPTS.l6_gate?.lines[0]?.who, 'mike');
  assert.match(SCRIPTS.l6_gate?.lines[0]?.text ?? '', /Eleven/);
  assert.equal(SCRIPTS.l6_gate?.lines[1]?.who, 'eleven', 'and she answers him');
  assert.ok(by('steve').some((l) => /behind me/i.test(l.text)), 'Steve says it');
  assert.ok(by('max').length >= 4 && by('max').every((l) => l.text.length <= 70), 'Max has short lines');
  assert.match(text('l6_start'), /\{interact\}/, 'the first script teaches the lights');
  assert.match(text('l6_crack_hint'), /\{attack\}/, 'the nail bat is the basic');
  assert.match(text('l6_gap_hint'), /\{special\}/, 'the dash is the special');
  assert.match(text('l6_gap_hint'), /dash/i);
  assert.ok(who('l6_crack_hint').has('steve') && who('l6_gap_hint').has('max'), 'the hint scripts have their heroes');
  assert.match(text('l6_storage'), /pods?/i);
  assert.match(text('l6_den'), /Alpha/);
  assert.match(text('l6_alpha'), /howl/i, 'the Alpha script teaches the opening');
  assert.match(text('l6_alpha_down'), /Gate/);
  assert.match(text('l6_gate'), /string|lights?/i, 'the gate script sends the party to the lights');
  assert.match(text('l6_gate'), /Forty-five seconds/);
  assert.match(text('l6_defend'), /turn on you|Babysit/i, 'the defense script says how to pull them off her');
  assert.match(text('l6_clear'), /Gate/);
  assert.match(text('l6_clear'), /home/i, 'she is back with the party');
});

// ---------------------------------------------------------------- the bot's route
test('stage 2.3: the waypoints are reachable in order, the crack is broken by flag, the cache is skipped, and the last is in the defend trigger', () => {
  const opened = new Set<string>();
  const flags: string[] = [];
  S.waypoints.forEach((w, i) => {
    const [x, y] = tileOf(w.x, w.y);
    assert.equal(solid(x, y), false, `waypoint ${i} at ${x},${y} is open ground`);
    assert.equal(flood(opened)[idx(x, y)], 1, `waypoint ${i} at ${x},${y} is reachable once what the bot has opened by flag is open`);
    assert.equal(w.dash, undefined, 'no dash: the route never goes over gap1');
    assert.equal(w.wake, undefined, 'and wakes nothing: the Alpha wakes itself');
    if (w.open) { opened.add(w.open); flags.push(`${i}:${w.open}`); }
  });
  assert.equal(flags.length, 1, 'one flag');
  assert.ok(flags[0]?.endsWith(':crack1'), 'it breaks crack1');
  const ci = S.waypoints.findIndex((w) => w.open === 'crack1');
  const crack = prop('crack1');
  const [cx, cy] = tileOf((S.waypoints[ci] as { x: number }).x, (S.waypoints[ci] as { y: number }).y);
  assert.ok(cx < crack.tx && cx >= crack.tx - 3 && cy >= crack.ty && cy < crack.ty + 2, 'the flag waypoint is just short of the crack, in line with it');
  const [nx, ny] = tileOf((S.waypoints[ci + 1] as { x: number }).x, (S.waypoints[ci + 1] as { y: number }).y);
  assert.ok(nx > crack.tx && nx <= crack.tx + 2 && ny >= crack.ty && ny < crack.ty + 2, 'and the next is just past it, in line');
  const cache = rectTiles({ tx: 38, ty: 31, w: 8, h: 6 });
  assert.ok(S.waypoints.every((w) => !cache.some(([x, y]) => [x, y].join() === tileOf(w.x, w.y).join())), 'the route skips the cache');
  const inside = (id: string, w: { x: number; y: number }): boolean => rectTiles(rectOf(id)).some(([x, y]) => [x, y].join() === tileOf(w.x, w.y).join());
  for (const id of ['den', 'alpha', 'gate', 'defend']) assert.ok(S.waypoints.some((w) => inside(id, w)), `a waypoint is inside the ${id} trigger`);
  assert.ok(inside('defend', S.waypoints.at(-1) as { x: number; y: number }), 'the last waypoint is inside the defend trigger');
  const order = ['den', 'alpha', 'gate', 'defend'].map((id) => S.waypoints.findIndex((w) => inside(id, w)));
  assert.deepEqual([...order], [...order].sort((a, b) => a - b), 'the triggers come in order along the route');
  assert.ok(S.waypoints.length >= 25, `${S.waypoints.length} waypoints`);
});

test('stage 2.3: a retry puts the bot back on the route at the waypoint nearest the lights, not at the start', () => {
  const [mouth, den, gate] = S.checkpoints.map((c) => routeFrom(S.waypoints, c));
  assert.equal((mouth as unknown[]).length, S.waypoints.length, 'from lights_mouth it is the whole route');
  for (const [route, c] of [[mouth, S.checkpoints[0]], [den, S.checkpoints[1]], [gate, S.checkpoints[2]]] as const) {
    const first = (route as { x: number; y: number }[])[0] as { x: number; y: number };
    assert.ok(Math.hypot(first.x - (c as { x: number }).x, first.y - (c as { y: number }).y) <= 6 * 16, 'it begins within six tiles of the lights');
    assert.deepEqual((route as unknown[]).at(-1), S.waypoints.at(-1), 'and ends where the whole route does, in the defend trigger');
  }
  assert.ok((den as unknown[]).length < S.waypoints.length && (gate as unknown[]).length < (den as unknown[]).length, 'each later string is a shorter route');
  assert.ok((gate as { open?: string }[]).every((w) => w.open === undefined), 'nothing to break by flag after lights_gate');
  assert.ok((gate as { x: number; y: number }[]).every((w) => {
    const [x, y] = tileOf(w.x, w.y);
    return x >= 27;
  }), 'from lights_gate the route is the stairwell and the chamber');
});
