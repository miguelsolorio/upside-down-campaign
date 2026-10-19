// Chapter 5's first two stages as the game draws them (docs/level-14.md, docs/level-15.md): the sim's states mapped to the trooper's and the
// Commander's poses, the twin Demogorgons (the red second one, the fall and the climb back), the army's props with the boom gate and the tower's cone,
// the fall effect, the lockdown and the Abyss on the map, and the sheet pages. Pure pixel work, so Node runs it on the software canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCanvas, count, cols, ctxOf, painted, rows, same, screen } from './canvas-helpers.ts';
import type { ActorView, FxView, PropKind, PropState, PropView } from '../src/core/types.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { ORDER, LAND, POS } from '../src/gfx/map_geo.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';
import { Px } from '../src/gfx/px.ts';

// The software canvas has no alpha, clip or clearRect: give it the few the cone and the sheet pages ask for, before the gfx modules load.
const proto = Object.getPrototypeOf(new FakeCanvas().getContext()) as Record<string, unknown> & { raw(x: number, y: number, v: number): void };
const put0 = proto.put as (this: unknown, x: number, y: number, v: number) => void;
proto.globalAlpha = 1;
proto.beginPath = (): void => {};
proto.rect = (): void => {};
proto.clip = (): void => {};
proto.clearRect = function (this: typeof proto, x: number, y: number, w: number, h: number): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.raw(Math.round(x + i), Math.round(y + j), 0); };
proto.put = function (this: { globalAlpha: number; sc: number; tx: number; ty: number; canvas: FakeCanvas }, x: number, y: number, v: number): void {
  const a = this.globalAlpha;
  if (a >= 1) { put0.call(this, x, y, v); return; }
  const X = Math.round(x * this.sc + this.tx), Y = Math.round(y * this.sc + this.ty), c = this.canvas;
  if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) return;
  const d = c.px[Y * c.w + X] as number;
  if (!d) return;
  const mix = (s: number): number => Math.round(((d >> s) & 255) * (1 - a) + ((v >> s) & 255) * a);
  c.px[Y * c.w + X] = ((255 << 24) | (mix(16) << 16) | (mix(8) << 8) | mix(0)) >>> 0;
};

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');
const { drawProp } = await import('../src/gfx/props.ts');
const { drawFx } = await import('../src/gfx/fx.ts');
const { commanderSlot, trooperSlot } = await import('../src/gfx/actor_troops.ts');
const { twinFrame, FALL_DROP } = await import('../src/gfx/actor_twin.ts');
const { coneStep, drawTowerCone, isBoom, towerPool } = await import('../src/gfx/props_army.ts');
const { L1415_PAGES } = await import('../src/gfx/sheet_l1415.ts');
const { L1415B_PAGES } = await import('../src/gfx/sheet_l1415b.ts');

const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
const view = (id: string, over: Partial<ActorView> = {}): ActorView => ({
  kind: 'enemy', id: id as ActorView['id'], x: 32, y: 56, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const draw = (v: ActorView, w = 64, h = 96): FakeCanvas => { const c = screen(w, h); drawActor(ctxOf(c), v); return c; };
const prop = (kind: PropKind, x: number, y: number, w: number, h: number, state: PropState = 'closed', t = 0): PropView => ({ id: kind, kind, x, y, w, h, state, t });
const drawP = (p: PropView, night = false): FakeCanvas => { const c = screen(160, 120); drawProp(ctxOf(c), p, night); return c; };

// ---------------------------------------------------------------- the foes
test('the trooper\'s pose follows what the sim says: the burst, the flank, the shield up, down and broken, hurt and down', () => {
  const base = { anim: 'idle', t: 0, pose: undefined, alert: false, guarding: undefined, broken: undefined, cracked: undefined } as const;
  assert.deepEqual(trooperSlot({ ...base }), ['shield', 0], 'standing, the shield is up');
  assert.deepEqual(trooperSlot({ ...base, guarding: false }), ['aim', 0], 'standing with it down he holds the rifle ready');
  assert.deepEqual(trooperSlot({ ...base, broken: true }), ['idle', 0], 'a broken shield is a trooper standing without one');
  assert.deepEqual(trooperSlot({ ...base, anim: 'walk', t: 0 }), ['walk', 0]);
  assert.deepEqual(trooperSlot({ ...base, anim: 'walk', t: 7 }), ['walk', 1]);
  assert.deepEqual(trooperSlot({ ...base, anim: 'walk', pose: 'flank', t: 7 }), ['flank', 1]);
  assert.deepEqual(trooperSlot({ ...base, anim: 'attack', alert: true }), ['aim', 0], 'under the "!" he aims');
  assert.deepEqual(trooperSlot({ ...base, anim: 'attack', t: 0 }), ['burst', 0]);
  assert.deepEqual(trooperSlot({ ...base, anim: 'attack', t: 3 }), ['burst', 1], 'the muzzle flash flickers');
  assert.deepEqual(trooperSlot({ ...base, anim: 'hurt' }), ['hurt', 0]);
  assert.deepEqual(trooperSlot({ ...base, anim: 'ko', pose: 'flank' }), ['ko', 0]);
});

test('the Commander\'s pose follows the sim: plant, charge and stun by their pose, his blow is the lunge, and cracked changes the shield only', () => {
  const base = { anim: 'idle', t: 0, pose: undefined, alert: false, guarding: undefined, broken: undefined, cracked: undefined } as const;
  assert.deepEqual(commanderSlot({ ...base }), ['idle', 0]);
  assert.deepEqual(commanderSlot({ ...base, anim: 'walk', t: 7 }), ['walk', 1]);
  assert.deepEqual(commanderSlot({ ...base, pose: 'plant', t: 8 }), ['plant', 1]);
  assert.deepEqual(commanderSlot({ ...base, anim: 'walk', pose: 'charge', t: 4 }), ['charge', 1]);
  assert.deepEqual(commanderSlot({ ...base, pose: 'stun', t: 16 }), ['stun', 1]);
  assert.deepEqual(commanderSlot({ ...base, anim: 'attack' }), ['charge', 1]);
  assert.deepEqual(commanderSlot({ ...base, pose: 'stun', anim: 'hurt' }), ['stun', 0], 'a stunned Commander stays stunned when he is hit');
  assert.deepEqual(commanderSlot({ ...base, anim: 'ko', pose: 'stun' }), ['ko', 0]);
  const whole = draw(view('commander', { anim: 'idle' })), cracked = draw(view('commander', { anim: 'idle', cracked: true }));
  assert.ok(!same(whole, cracked), 'the cracked shield is drawn');
  assert.ok(count(cracked, 'mist') > 0 && count(whole, 'mist') === 0, 'dull edge, only when cracked');
});

test('every state of the trooper and the Commander draws on the ground, facing four ways, with its own picture', () => {
  const trooper: Partial<ActorView>[] = [
    { anim: 'idle', guarding: true }, { anim: 'walk' }, { anim: 'walk', t: 7 }, { anim: 'attack', alert: true }, { anim: 'attack', t: 0 }, { anim: 'attack', t: 3 },
    { anim: 'walk', pose: 'flank' }, { anim: 'idle', guarding: false }, { anim: 'hurt' }, { anim: 'ko' },
  ];
  const commander: Partial<ActorView>[] = [
    { anim: 'idle' }, { anim: 'walk' }, { anim: 'idle', pose: 'plant' }, { anim: 'idle', pose: 'plant', t: 8 }, { anim: 'walk', pose: 'charge' },
    { anim: 'idle', pose: 'stun' }, { anim: 'hurt' }, { anim: 'ko' },
  ];
  for (const [id, states, cell] of [['trooper', trooper, 16], ['commander', commander, 24]] as [string, Partial<ActorView>[], number][]) {
    for (const dir of ['down', 'up', 'left', 'right'] as const) {
      const shots = states.map((s) => draw(view(id, { dir, ...s })));
      for (const c of shots) {
        assert.ok(painted(c) > 40, `${id} ${dir} paints`);
        const [y0, y1] = rows(c), [x0, x1] = cols(c);
        assert.ok(y1 <= 56 && y1 >= 52, `${id} ${dir}: his feet are on the ground, ${y1}`);
        assert.ok(x1 - x0 < cell + 8, `${id} ${dir} stays inside his cell`);
        assert.ok(y0 > 56 - cell - 12, `${id} ${dir}: ${y0}`);
      }
      assert.ok(new Set(shots.map((c) => Array.from(c.px).join())).size >= states.length - 2, `${id} ${dir}: the poses differ`);
    }
  }
});

test('a broken shield is gone from every trooper pose, and a whole one is clear glass in front', () => {
  for (const s of [{ anim: 'idle' }, { anim: 'walk' }, { anim: 'attack' }, { anim: 'walk', pose: 'flank' }] as Partial<ActorView>[]) {
    const whole = draw(view('trooper', { dir: 'left', guarding: true, ...s })), broken = draw(view('trooper', { dir: 'left', guarding: false, broken: true, ...s }));
    assert.ok(count(whole, 'sky') > 0 || count(whole, 'cyan') > 0, `a shield in ${JSON.stringify(s)}`);
    assert.equal(count(broken, 'sky', 'cyan'), 0, `no shield in ${JSON.stringify(s)}`);
    assert.ok(painted(broken) < painted(whole));
  }
});

test('the flash, the tint and the bar go over the new foes as over the others, and the "!" shows over their heads', () => {
  for (const id of ['trooper', 'commander', 'twin']) {
    const plain = draw(view(id)), flash = draw(view(id, { flash: 1 })), tint = draw(view(id, { tint: 'yellow' }));
    assert.ok(count(flash, 'white') > 20 && count(plain, 'white') < count(flash, 'white'), `${id} flashes`);
    assert.ok(count(tint, 'yellow') > 5, `${id} tints`);
    const bar = draw(view(id, { bar: { hp: 3, hpMax: 5 } })), alert = draw(view(id, { alert: true }));
    assert.ok(count(bar, 'hot') > 0 && count(bar, 'hot') > count(plain, 'hot'), `${id} has a bar`);
    assert.ok(count(alert, 'hot') > count(plain, 'hot'), `${id} has the "!"`);
    assert.equal(painted(draw(view(id, { blink: true, alert: false }))), 0, `${id} blinks out`);
  }
});

test('the Lab agent is the 1.2 agent and the foe Demogorgon is the 1.3 one', () => {
  assert.ok(same(draw(view('agent5')), draw(view('agent'))));
  assert.ok(same(draw(view('demofoe', { pose: 'charge', dir: 'left' })), draw(view('demogorgon', { pose: 'charge', dir: 'left' }))));
});

// ---------------------------------------------------------------- the twins
test('the first twin is the grey Demogorgon and the second wears red, in every pose', () => {
  const states: Partial<ActorView>[] = [{ anim: 'idle' }, { anim: 'walk' }, { anim: 'attack' }, { anim: 'walk', pose: 'charge' }, { anim: 'idle', pose: 'stun' }, { anim: 'hurt' }, { anim: 'ko' }, { anim: 'idle', petals: true }];
  for (const s of states) {
    const a = draw(view('twin', s)), b = draw(view('twin', { ...s, second: true }));
    assert.ok(same(a, draw(view('demogorgon', s))), `the first twin is the Demogorgon: ${JSON.stringify(s)}`);
    assert.ok(count(b, 'red', 'blood1') > 25 && count(a, 'blood1') === 0, `the second is red: ${JSON.stringify(s)}`);
    assert.ok(!same(a, b));
    assert.equal(count(b, 'grey2', 'grey3'), 0, 'no grey skin left on the red one');
  }
});

test('a twin falls into the void, shrinking and dropping and going dark, and climbs back up out of the edge', () => {
  const at = (pose: 'fall' | 'climb', k: number, second = false): FakeCanvas => draw(view('twin', { pose, k, second, y: 40 }), 64, 110);
  for (const second of [false, true]) {
    const falls = [0, 0.3, 0.6, 0.99].map((k) => at('fall', k, second));
    for (let i = 1; i < falls.length; i++) assert.ok(painted(falls[i] as FakeCanvas) < painted(falls[i - 1] as FakeCanvas), `a fall at k ${i} is smaller`);
    assert.ok(rows(falls[3] as FakeCanvas)[1] > rows(falls[0] as FakeCanvas)[1] + FALL_DROP - 8, 'and lower on the screen');
    assert.equal(count(falls[0] as FakeCanvas, 'blood0'), 0);
    assert.ok(count(falls[3] as FakeCanvas, 'blood0') > 0, 'darkening into the void');
    const climbs = [1, 0.7, 0.4, 0.1, 0].map((k) => at('climb', k, second));
    for (let i = 1; i < climbs.length; i++) assert.ok(painted(climbs[i] as FakeCanvas) > painted(climbs[i - 1] as FakeCanvas), `a climb at ${i} shows more of him`);
    for (const c of climbs) assert.ok(rows(c)[1] <= 40, 'nothing of him below the edge he climbs over');
    assert.ok(painted(climbs[0] as FakeCanvas) > 0, 'the claws are over the edge at the start');
    assert.ok(same(climbs[4] as FakeCanvas, draw(view('twin', { second, y: 40 }), 64, 110)), 'at the end he stands as he always does');
  }
  assert.equal(painted(draw(view('twin', { pose: 'fall', k: 1 }), 64, 110)), 0, 'out of sight below the edge at k 1');
  const f = twinFrame(view('twin', { pose: 'fall', k: 0.5 })), standing = twinFrame(view('twin'));
  assert.ok(!f.grounded && f.dy > 0 && standing.grounded && standing.dy === 0, 'no shadow or bar while he is in the air');
  assert.equal(painted(draw(view('twin', { pose: 'fall', k: 0.5, bar: { hp: 3, hpMax: 5 }, alert: true }))), painted(draw(view('twin', { pose: 'fall', k: 0.5 }))), 'no bar or "!" over a falling twin');
});

test('the fall effect plays at the edge for its whole life and is gone at the end', () => {
  const at = (t: number): FakeCanvas => { const c = screen(64, 80); const f: FxView = { kind: 'fall', x: 32, y: 10, dir: 'down', angle: 0, t, life: 48, w: 24, h: 24 }; drawFx(ctxOf(c), f); return c; };
  for (const t of [0, 3, 8, 14, 22, 32, 40]) assert.ok(painted(at(t)) > 3, `t ${t}`);
  assert.equal(painted(at(48)), 0, 'nothing left at the end');
  assert.ok(!same(at(8), at(22)));
  assert.ok(rows(at(30))[1] > rows(at(8))[1], 'it falls away');
  const [x0, x1] = cols(at(14));
  assert.ok(x0 >= 32 - 12 - 4 && x1 <= 32 + 12 + 4, 'and stays about the edge it went over');
});

// ---------------------------------------------------------------- the props
test('every army prop draws on the bottom of its footprint, centered, and the night repaints it', () => {
  const sizes: [PropKind, number, number, number, number][] = [
    ['truck', 64, 32, 64, 32], ['tent', 48, 36, 48, 36], ['booth', 32, 32, 32, 32], ['curfew', 16, 16, 26, 32], ['tower', 16, 16, 16, 56],
    ['sandbags', 32, 16, 32, 16], ['barricade', 32, 16, 32, 16], ['barrier', 32, 16, 32, 16],
  ];
  for (const [kind, w, h, aw, ah] of sizes) {
    const c = drawP(prop(kind, 40, 60, w, h)), [x0, x1] = cols(c), [y0, y1] = rows(c);
    assert.ok(painted(c) > aw * ah * 0.1, `${kind} paints`);
    assert.ok(y1 <= 60 + h && y1 >= 60 + h - 2, `${kind} stands on its footprint's bottom: ${y1}`);
    assert.ok(y0 >= 60 + h - ah - 1, `${kind} is no taller than its art: ${y0}`);
    assert.ok(Math.abs((x0 + x1) / 2 - (40 + w / 2)) <= 2, `${kind} is centered on its footprint`);
    assert.ok(!same(c, drawP(prop(kind, 40, 60, w, h), true)), `${kind} at night`);
  }
  const lit = drawP(prop('tower', 40, 60, 16, 16)), dark = drawP(prop('tower', 40, 60, 16, 16, 'off'));
  assert.ok(count(lit, 'white') > count(dark, 'white'), 'the lamps are lit unless the tower is off');
  assert.ok(!same(drawP(prop('truck', 40, 60, 64, 32)), drawP(prop('truck', 40, 60, 64, 32, 'open'))), 'a truck faces left when open');
  assert.equal(painted(drawP(prop('truck', 40, 60, 64, 32))), painted(drawP(prop('truck', 40, 60, 64, 32, 'open'))));
  const span = (c: FakeCanvas): number => rows(c)[1] - rows(c)[0];
  assert.ok(span(drawP(prop('sandbags', 40, 60, 32, 24))) > span(drawP(prop('sandbags', 40, 60, 32, 16))) + 4, 'sandbags stack to their height');
  assert.ok(cols(drawP(prop('barricade', 40, 60, 48, 16)))[1] - cols(drawP(prop('barricade', 40, 60, 32, 16)))[1] >= 14, 'a barricade is as wide as its footprint');
});

test('a crack 40 px or more on its long side is the boom gate, and the others are the cracked wall they were', () => {
  assert.ok(isBoom(prop('crack', 0, 0, 24, 48)) && isBoom(prop('crack', 0, 0, 48, 24)) && !isBoom(prop('crack', 0, 0, 32, 16)) && !isBoom(prop('crack', 0, 0, 16, 32)) && !isBoom(prop('gap', 0, 0, 16, 48)));
  const wall = drawP(prop('crack', 40, 40, 32, 16)), wallOpen = drawP(prop('crack', 40, 40, 32, 16, 'open'));
  assert.ok(count(wall, 'hot', 'orange') > 5, 'the wall has its seam of light');
  assert.equal(count(wallOpen, 'hot'), 0, 'and rubble when it is open');
  const shut = drawP(prop('crack', 40, 30, 24, 48)), up = drawP(prop('crack', 40, 30, 24, 48, 'open'));
  assert.ok(count(shut, 'hot', 'orange') <= 2, 'the boom has no seam of light, only its lamp');
  assert.ok(count(shut, 'red') > 20 && count(shut, 'bone') > 20, 'a striped arm');
  assert.ok(!same(shut, up) && painted(up) < painted(shut), 'swung up when smashed');
  const [y0, y1] = rows(shut);
  assert.ok(y1 - y0 >= 44, `the vertical arm runs across 48 px: ${y0} to ${y1}`);
  const flat = drawP(prop('crack', 40, 30, 48, 24)), [fx0, fx1] = cols(flat);
  assert.ok(fx1 - fx0 >= 44, 'a flat one runs along its width');
  assert.ok(Math.abs(rows(shut)[0] - 30) <= 3, 'the vertical one is centered on its footprint');
});

test('a lit tower\'s cone lifts the ground it falls on toward white, hard edged, and a dark tower leaves the ground alone', () => {
  const ground = (): FakeCanvas => { const c = screen(160, 160); const g = ctxOf(c); g.fillStyle = '#1f7038'; g.fillRect(0, 0, 160, 160); return c; };
  const tower = prop('tower', 72, 60, 16, 16);
  const g = ground(); drawTowerCone(ctxOf(g), tower, 0, 0, true);
  const before = ground(), lifted = g.px.reduce((n, v, i) => n + (v !== before.px[i] ? 1 : 0), 0);
  assert.ok(lifted > 1500, `the cone covers its ground: ${lifted}`);
  let up = 0, down = 0, white = 0;
  g.px.forEach((v, i) => { if (v !== before.px[i]) { if (lum(v) > lum(before.px[i] as number)) up++; else down++; if (v === px32('white')) white++; } });
  assert.equal(down, 0, 'only ever lighter');
  assert.equal(up, lifted);
  assert.equal(white, 0, 'a lift, never a flat white fill');
  const strong = g.px.reduce((n, v, i) => n + (v !== before.px[i] && lum(v) > 200 ? 1 : 0), 0);
  assert.ok(strong > 300 && strong < lifted - 300, 'a bright core inside a paler cone');
  const dark = ground(); drawTowerCone(ctxOf(dark), prop('tower', 72, 60, 16, 16, 'off'), 0, 0, true);
  assert.ok(same(dark, before), 'a dark tower casts no cone');
  const off = ground(); drawTowerCone(ctxOf(off), tower, 400, 400, true);
  assert.ok(same(off, before), 'a cone off the screen is skipped');
  const other = ground(); drawTowerCone(ctxOf(other), prop('truck', 72, 60, 64, 32), 0, 0, true);
  assert.ok(same(other, before), 'only a tower has one');
  assert.ok(towerPool(tower).y > 60 + 16, 'the pool of light lies below the tower');
  for (let t = 0; t < 2000; t += 37) assert.ok(Math.abs(coneStep({ x: 72, y: 60, t }, false)) <= 3);
  assert.equal(coneStep({ x: 72, y: 60, t: 123 }, true), 0, 'a calm cone holds still');
  assert.ok(new Set(Array.from({ length: 80 }, (_, i) => coneStep({ x: 72, y: 60, t: i * 12 }, false))).size >= 5, 'a moving cone sweeps over its steps');
});

// ---------------------------------------------------------------- the map
const STATES = (open: string): Record<string, 'cleared' | 'open' | 'locked'> => {
  const st: Record<string, 'cleared' | 'open' | 'locked'> = {};
  let past = true;
  for (const id of ORDER) { st[id] = past ? (id === open ? 'open' : 'cleared') : 'locked'; if (id === open) past = false; }
  return st;
};
const region = (px: Px, cx: number, top: number, w: number, h: number, ...names: Parameters<typeof px32>[0][]): number => {
  let n = 0;
  const want = new Set(names.map((c) => px32(c)));
  for (let y = top; y < top + h; y++) for (let x = cx - (w >> 1); x < cx + (w >> 1); x++) if (want.has(px.get(x, y))) n++;
  return n;
};

test('the lockdown\'s floodlight and the Abyss\'s island hang under their nodes, in color when their stage is open and in greys when it is locked', () => {
  for (const [id, name, at, lit] of [['5.1', 'LOCKDOWN', LAND.lockdown, ['white']], ['5.2', 'ABYSS', LAND.abyss, ['amber', 'yellow']]] as const) {
    const node = POS[id] as { x: number; y: number }, open = paintLand(STATES(id)), shut = paintLand(STATES('1.1'));
    assert.equal(at.x, node.x, `${id}'s landmark is under its node`);
    assert.ok(at.top >= node.y + 6 && at.top <= node.y + 16, `${id}'s landmark starts just under its node`);
    assert.ok(region(open.px, at.x, at.top, 40, 30, ...lit) > 3, `${id} is lit when open`);
    assert.equal(region(shut.px, at.x, at.top, 40, 30, ...lit), 0, `${id} is grey when locked`);
    const plate = open.plates.find((p) => p.name === name);
    assert.ok(plate && plate.point === 'up' && plate.ud, `${name}'s plate hangs under it, pointing up`);
    assert.ok(plate && plate.y > at.top + 20 && plate.cx === at.x);
  }
  const rects = paintLand(STATES('5.1')).plates.map((p) => ({ name: p.name, ...plateRect(p) }));
  for (const a of rects.filter((r) => r.name === 'LOCKDOWN' || r.name === 'ABYSS')) {
    for (const b of rects) if (b !== a) assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${a.name} and ${b.name} overlap`);
  }
  const lock = rects.find((r) => r.name === 'LOCKDOWN'), gate = rects.find((r) => r.name === 'GATE');
  assert.ok(lock && gate && lock.x1 <= gate.x0, 'the lockdown\'s plate clears the gate\'s');
});

// ---------------------------------------------------------------- the sheet pages
test('the sheet pages for 5.1 and 5.2 draw every view, and animate', () => {
  assert.deepEqual([...L1415_PAGES, ...L1415B_PAGES].map((p) => p.title), ['LOCKDOWN FOES', 'LOCKDOWN PROPS', 'THE ABYSS', 'MAP CHAPTER 5']);
  for (const p of [...L1415_PAGES, ...L1415B_PAGES]) {
    for (let sub = 0; sub < p.subs; sub++) {
      const shots = [0, 37].map((t) => { const c = screen(256, 224); p.draw(ctxOf(c), t, sub); return c; });
      assert.ok(painted(shots[0] as FakeCanvas) > 5000, `${p.title} ${sub} paints`);
    }
  }
});
