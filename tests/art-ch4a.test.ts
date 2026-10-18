// The art of stage 4.1, Kamchatka (docs/level-10.md): Hopper in the Telogreika and how his look follows the chapter, the two guards (the rifle
// guard and the camp guard with his block), the camp's and the pit's tiles by day and by night, the Kamchatka inset on the map and the sheet
// pages. Pure pixel work, so Node runs it: sprites and tiles are Px buffers and role buffers, and the draw code uses the software canvas
// from canvas-helpers.ts, so import that first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, ctxOf, painted, same, screen } from './canvas-helpers.ts';
import { EM_DASH } from '../src/core/text.ts';
import { TILES } from '../src/core/tiles.ts';
import type { TileName } from '../src/core/tiles.ts';
import type { ActorView, CharId, Expr } from '../src/core/types.ts';
import type { NodeState } from '../src/core/mapdata.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import type { Px } from '../src/gfx/px.ts';
import { ANIM_ORDER, POSES, composeFrame } from '../src/gfx/actor_pose.ts';
import { HOPPER4, HOPPER4_PORTRAIT } from '../src/gfx/data/hopper4.ts';
import { KBATON, KBATON_LOW, KGUARD } from '../src/gfx/data/kguard.ts';
import type { CharSpec } from '../src/gfx/data/types.ts';
import { HOPPER4_OPTS } from '../src/gfx/var/hopper4_opts.ts';
import { KGUARD_OPTS } from '../src/gfx/var/kguard_opts.ts';
import { fills, paintRoles, unmapped } from '../src/gfx/var/kit.ts';
import { keyOf } from '../src/gfx/actor_look.ts';
import { hopperInPrison, setLookStage } from '../src/gfx/looks.ts';
import { campBarrel, campTile, CAMP_TILES } from '../src/gfx/tile_camp.ts';
import { PIT_TILES, lanternAt, pitTile } from '../src/gfx/tile_pit.ts';
import type { Near, TileCtx } from '../src/gfx/tile_ground.ts';
import { nightTile } from '../src/gfx/night.ts';
import { objectTile } from '../src/gfx/tile_objects.ts';
import { INSET, kamchatka } from '../src/gfx/map_inset.ts';
import { paintLand, plateRect } from '../src/gfx/map_land.ts';
import { LEGS, ORDER, POS } from '../src/gfx/map_geo.ts';

// The modules below load after the canvas exists, because the draw code builds its bitmaps through `document`.
const { drawActor } = await import('../src/gfx/actors.ts');
const { drawPortrait } = await import('../src/gfx/ui.ts');
const { bakeStage, drawStage, samplePx } = await import('../src/gfx/tiles.ts');
const { BLOCK, L10_PAGES, PIT, YARD } = await import('../src/gfx/sheet_l10.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const src = (f: string): string => readFileSync(`${ROOT}${f}`, 'utf8');

// ---------------------------------------------------------------- sprites
const EVERY = ANIM_ORDER.flatMap((anim) => POSES[anim].map((_, f) => ({ anim, f })));
const VIEWS = ['down', 'up', 'side'] as const;
const looksOf = (spec: CharSpec): { colors: number; bad: string[] } => {
  const px: Px[] = [], bad = new Set<string>();
  for (const view of VIEWS) for (const { anim, f } of EVERY) {
    const buf = composeFrame(spec, view, anim, f);
    for (const b of unmapped(buf, spec.pal)) bad.add(b);
    px.push(paintRoles(buf, 16, spec.pal));
  }
  return { colors: fills(...px), bad: [...bad] };
};

test('the Telogreika Hopper and the two guards keep to five fill colors and the ink outline, in every frame of every facing, and paint every role', () => {
  for (const [name, spec] of [['Telogreika', HOPPER4], ['rifle guard', KGUARD], ['camp guard guarding', KBATON], ['camp guard lowered', KBATON_LOW]] as [string, CharSpec][]) {
    const { colors, bad } = looksOf(spec);
    assert.ok(colors <= 5, `${name} uses ${colors} fill colors`);
    assert.deepEqual(bad, [], `${name} has unpainted roles`);
  }
});

test('the game\'s data is the owner\'s picks as drawn: Telogreika, Greatcoat and the Camp guard', () => {
  const pick = HOPPER4_OPTS[0]!;
  assert.equal(pick.slug, 'telogreika');
  assert.deepEqual(HOPPER4, pick.spec);
  assert.deepEqual(HOPPER4_PORTRAIT, pick.portrait);
  assert.equal(KGUARD_OPTS[0]!.slug, 'greatcoat');
  assert.deepEqual(KGUARD, KGUARD_OPTS[0]!.spec);
  assert.equal(KGUARD_OPTS[3]!.slug, 'camp');
  assert.deepEqual(KBATON_LOW, { ...KGUARD_OPTS[3]!.spec, id: 'kbaton' });
  assert.equal(HOPPER4.id, 'hopper');
  assert.equal(KGUARD.id, 'kguard');
  assert.equal(KBATON.id, 'kbaton');
});

test('the camp guard\'s block is the baton across his body and his lowered stance is the pick, and the wind-up and the swing are the same in both', () => {
  for (const view of VIEWS) {
    const frame = (spec: CharSpec, anim: 'idle' | 'attack', f: number): string => composeFrame(spec, view, anim, f).join();
    assert.notEqual(frame(KBATON, 'idle', 0), frame(KBATON_LOW, 'idle', 0), `${view}: the block is not the lowered stance`);
    assert.notEqual(frame(KBATON, 'idle', 0), frame(KBATON, 'attack', 0), `${view}: he does not block while he swings`);
    for (const f of [0, 1]) assert.equal(frame(KBATON, 'attack', f), frame(KBATON_LOW, 'attack', f), `${view}: the attack ${f} is the same in both`);
  }
});

// ---------------------------------------------------------------- the look follows the chapter
const sprite = (v: ActorView, w = 24, h = 24): FakeCanvas => { const c = screen(w, h); drawActor(ctxOf(c), v); return c; };
const view = (id: string, over: Partial<ActorView> = {}): ActorView => ({
  kind: 'hero', id: id as ActorView['id'], x: 12, y: 20, dir: 'down', anim: 'idle', t: 0, flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null, ...over,
});
const face = (who: CharId, expr: Expr, prison?: boolean): FakeCanvas => { const c = screen(24, 24); drawPortrait(ctxOf(c), who, expr, 0, 0, false, prison); return c; };

test('Hopper\'s look follows setLookStage: the Uniform through chapter 3, the Telogreika from chapter 4, sprite and portrait, and switching back never serves a stale cache', () => {
  try {
    setLookStage('3.3');
    assert.equal(hopperInPrison(), false);
    assert.equal(keyOf('hopper', undefined, false, 'hero'), 'hopper');
    const uniformSprite = sprite(view('hopper')), uniformFace = face('hopper', 'neutral');
    setLookStage('4.1');
    assert.equal(hopperInPrison(), true);
    assert.equal(keyOf('hopper', undefined, false, 'hero'), 'hopper:prison');
    const prisonSprite = sprite(view('hopper')), prisonFace = face('hopper', 'neutral');
    assert.ok(!same(uniformSprite, prisonSprite), 'the sprite changes');
    assert.ok(!same(uniformFace, prisonFace), 'the portrait changes');
    assert.ok(painted(prisonSprite) > 100 && painted(prisonFace) === 24 * 24);
    setLookStage('1.2');
    assert.ok(same(sprite(view('hopper')), uniformSprite) && same(face('hopper', 'neutral'), uniformFace), 'back to the Uniform');
    setLookStage('4.2');
    assert.ok(same(sprite(view('hopper')), prisonSprite) && same(face('hopper', 'neutral'), prisonFace), 'and the Telogreika again');
    assert.ok(same(face('hopper', 'neutral', false), uniformFace) && same(face('hopper', 'neutral', true), prisonFace), 'the sheet can ask for either look');
    for (const e of ['happy', 'worried', 'determined', 'hurt', 'shocked'] as Expr[]) assert.ok(!same(face('hopper', e, false), face('hopper', e, true)), `${e} differs`);
    // Nobody else changes with the chapter, and his hero bar and the map token use the same key.
    const mike = sprite(view('mike'));
    setLookStage('1.1');
    assert.ok(same(sprite(view('mike')), mike));
    assert.equal(keyOf('mike', undefined, false, 'hero'), 'mike');
  } finally { setLookStage('1.1'); }
});

test('the guards are drawn as themselves: the rifle guard is not the 3.2 soldier, the camp guard is not the riot guard, the pit Demogorgon is the 1.3 sprite, and a camp guard shows his block while he guards', () => {
  const w = 40, h = 36;
  const enemy = (id: string, over: Partial<ActorView> = {}): FakeCanvas => sprite(view(id, { kind: 'enemy', x: 20, y: 28, ...over }), w, h);
  assert.ok(!same(enemy('kguard'), enemy('soldier')), 'the rifle guard has his own coat');
  assert.ok(!same(enemy('kbaton'), enemy('guard')), 'the camp guard has his own look');
  assert.ok(painted(enemy('kguard')) > 80 && painted(enemy('kbaton')) > 80);
  assert.ok(same(enemy('pitdemo'), enemy('demogorgon')) && painted(enemy('pitdemo')) > 200, 'the pit Demogorgon is the 1.3 sprite as it is');
  assert.ok(same(enemy('pitdemo', { pose: 'charge', petals: true }), enemy('demogorgon', { pose: 'charge', petals: true })), 'in every pose');
  assert.ok(!same(enemy('kbaton', { guarding: true }), enemy('kbaton', { guarding: false })), 'a camp guard who is down shows it');
  assert.ok(same(enemy('kbaton', { guarding: true }), enemy('kbaton')), 'and one that nothing has said is down is on guard');
  assert.ok(same(enemy('kbaton', { guarding: false, anim: 'attack', alert: true }), enemy('kbaton', { guarding: true, anim: 'attack', alert: true })), 'the wind-up is the same either way');
  assert.ok(!same(enemy('kguard', { anim: 'attack', alert: true }), enemy('kguard', { anim: 'attack' })), 'the rifle guard aims under the "!" and fires after it, like the soldier');
  assert.ok(painted(enemy('kguard', { anim: 'ko' })) > 40);
  // Nobody borrows a sprite any more (Eddie and the ghoul have their own frames, tests/art-ch4b.test.ts); the pit's Demogorgon is an alias for good.
  const actors = src('src/gfx/actors.ts');
  assert.doesNotMatch(actors, /STAND_IN/, 'no stand-in map is left');
  assert.match(actors, /const ALIAS[^\n]*pitdemo: 'demogorgon'/);
  assert.match(actors, /an alias for good, not a stand-in/);
});

// ---------------------------------------------------------------- tiles
const around = (n: TileName): Near => ({ n, e: n, s: n, w: n });
const NAMES = [...CAMP_TILES, ...PIT_TILES];
const opaque = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const rgb = (v: number): [number, number, number] => [v & 255, (v >> 8) & 255, (v >> 16) & 255];
const lum = (v: number): number => { const [r, g, b] = rgb(v); return 0.299 * r + 0.587 * g + 0.114 * b; };
const avg = (p: Px): [number, number, number] => { const s = [0, 0, 0]; for (const v of p.d) rgb(v).forEach((c, i) => { s[i]! += c; }); return s.map((c) => c / p.d.length) as [number, number, number]; };
const count = (p: Px, ...names: ColorName[]): number => p.d.filter((v) => names.some((n) => px32(n) === v)).length;
const paint = (n: TileName, tx: number, ty: number, near: Near = around(n), blk?: TileCtx['blk']): { c: TileCtx; day: Px; night: Px } => {
  const c: TileCtx = { tx, ty, near, ...(blk ? { blk } : {}) };
  const day = (objectTile(n, c) ?? samplePx(n, 0)) as Px;
  return { c, day, night: nightTile(day, n, c) };
};
/** The neighbors a tile of the stage has in different places: in a run, beside the floor, beside a wall, beside snow. */
const NEARS: Near[] = [
  ...(['snow', 'campfloor', 'campwall', 'campcap', 'pitfloor', 'pitwall', 'pitcap'] as TileName[]).map(around),
  { n: 'campcap', e: 'celldoor', s: 'campfloor', w: 'campwall' }, { n: 'snow', e: 'wire', s: 'wire', w: 'snow' }, { n: 'wire', e: 'snow', s: 'wire', w: 'snow' },
  { n: 'campwall', e: 'snowpath', s: 'campfloor', w: 'campfloor' }, { n: 'pitcap', e: 'pitbar', s: 'pitfloor', w: 'pitwall' }, { n: 'pitwall', e: 'pitcap', s: 'pitfloor', w: 'pitcap' },
];

test('the fifteen 4.1 tiles are painted in place of the flat stand-ins: more than a fill and a frame, fully opaque by day and by night', () => {
  assert.deepEqual(NAMES.length, 15);
  const names = new Set(Object.values(TILES).map((t) => t.name));
  for (const n of NAMES) {
    assert.ok(names.has(n), n);
    for (let i = 0; i < NEARS.length * 2; i++) {
      const { day, night } = paint(n, 3 + i * 5, 2 + i * 3, NEARS[i % NEARS.length]);
      assert.ok(day.w === 16 && day.h === 16, `${n} is 16 by 16`);
      assert.ok(opaque(day), `${n} is opaque by day (${i})`);
      assert.ok(opaque(night), `${n} is opaque by night (${i})`);
      assert.ok(new Set(day.d).size >= 3, `${n} is a drawing, not a fill and a frame: ${new Set(day.d).size} colors`);
    }
  }
  for (let p = 0; p < 4; p++) { const b = campBarrel({ tx: 4, ty: 6, near: around('snow') }, p); assert.ok(opaque(b) && opaque(nightTile(b, 'barrel', { tx: 4, ty: 6, near: around('snow') }))); }
  assert.doesNotMatch(src('src/gfx/tile_ch4.ts'), /snow:|barrel:|pitcap:|pitbar:|campwall:/, 'the flat stand-ins for 4.1 are gone');
  assert.ok(campTile('snow', { tx: 1, ty: 1, near: around('snow') }) && pitTile('pitfloor', { tx: 1, ty: 1, near: around('pitfloor') }));
  assert.equal(campTile('creelwall', { tx: 1, ty: 1, near: around('creelwall') }), null, 'the 4.2 tiles are left to tile_ch4.ts');
});

test('the snow stays blue and readable at night: blue over red, not near black, with ridges and glints, and the path, the wall and the floor read apart from it', () => {
  const snow = paint('snow', 7, 7).night, [r, g, b] = avg(snow);
  assert.ok(b > r + 25 && b > g + 10, `blue: ${[r, g, b].map(Math.round)}`);
  assert.ok((r + g + b) / 3 >= 55, 'not near black');
  assert.ok(new Set(snow.d).size >= 3, 'ridges, glints and shade');
  const L = (p: Px): number => p.d.reduce((s, v) => s + lum(v), 0) / p.d.length;
  const path = paint('snowpath', 7, 7, { n: 'snow', e: 'snowpath', s: 'snow', w: 'snowpath' }).night;
  assert.ok(L(snow) - L(path) >= 5, 'the trodden path is darker than the snow');
  assert.ok(L(paint('campwall', 7, 7, { n: 'campcap', e: 'campwall', s: 'campfloor', w: 'campwall' }).night) > L(paint('campfloor', 7, 7).night) + 10, 'the wall face is lighter than the floor');
  assert.ok(L(paint('drift', 7, 7).night) > L(snow) - 40 && count(paint('drift', 7, 7).night, 'night') === 0, 'a drift is a lit mound of the same snow');
  assert.ok(count(paint('wire', 7, 7).night, 'black') >= 20, 'the wire is black on it');
});

test('the floodlight\'s amber and the drum\'s fire lead the eye: they stay bright and warm at night, and each drum and lantern throws a pool of light', () => {
  const fire = (p: Px): number => p.d.filter((v) => { const [r, g, b] = rgb(v); return lum(v) >= 140 && r > b + 60; }).length;
  const barrel = paint('barrel', 7, 7);
  assert.ok(fire(barrel.night) >= 14, `fire at night: ${fire(barrel.night)} px`);
  assert.ok(fire(barrel.night) >= fire(barrel.day) - 2, 'the night pass leaves the fire alone');
  assert.equal(fire(paint('snow', 7, 7).night) + fire(paint('campwall', 7, 7).night) + fire(paint('pitfloor', 7, 7).night), 0, 'and nothing else on the ground is as bright and warm');
  const phases = [0, 1, 2, 3].map((p) => campBarrel({ tx: 7, ty: 7, near: around('snow') }, p).d.join());
  assert.equal(new Set(phases).size, 4, 'the fire changes at each of its four steps');
  const lit = (rows: string[]): number => (bakeStage(rows, true).windows.length);
  assert.equal(lit(YARD), 2, 'the two drums in the yard');
  assert.equal(lit(BLOCK), 1, 'and the drum in the block');
  assert.equal(lit(PIT), 2, 'and two lanterns in the pit');
  assert.equal(bakeStage(YARD, false).windows.length, 0, 'by day there is no pool');
  // The barrel animates in a baked stage: its tile is drawn over at the second step of the pulse.
  const stage = bakeStage(['ËËËËËËËË', 'ËÈÈÒÈÈÈË', 'ËÈÈÈÈÈÈË', 'ËËËËËËËË'], true);
  const at = (t: number): FakeCanvas => { const c = screen(256, 224); drawStage(ctxOf(c), stage, 0, 0, t); return c; };
  const crop = (c: FakeCanvas): string => { const out: number[] = []; for (let y = 16; y < 32; y++) for (let x = 48; x < 64; x++) out.push(c.px[(y + 0) * c.w + x] as number); return out.join(); };
  assert.notEqual(crop(at(0)), crop(at(16)), 'the fire moves');
});

test('the wire and the walls read their neighbors: a fence runs across or down, a cell door is two tiles, a cap has its lip over a face, a drift is one dome, snow takes the wall\'s shadow', () => {
  const wire = (near: Near): string => paint('wire', 5, 5, near).day.d.join();
  assert.notEqual(wire({ n: 'snow', e: 'wire', s: 'snow', w: 'wire' }), wire({ n: 'wire', e: 'snow', s: 'wire', w: 'snow' }), 'across and down are different pictures');
  assert.notEqual(wire({ n: 'snow', e: 'wire', s: 'wire', w: 'snow' }), wire({ n: 'snow', e: 'wire', s: 'snow', w: 'wire' }), 'a corner has both');
  const door = (near: Near): string => paint('celldoor', 5, 5, near).day.d.join();
  const L = door({ n: 'campcap', e: 'celldoor', s: 'campfloor', w: 'campwall' }), R = door({ n: 'campcap', e: 'campwall', s: 'campfloor', w: 'celldoor' }), one = door({ n: 'campcap', e: 'campwall', s: 'campfloor', w: 'campwall' });
  assert.ok(new Set([L, R, one]).size === 3, 'the left half, the right half and a lone door differ');
  const cap = (s: TileName): Px => paint('campcap', 5, 5, { n: 'campcap', e: 'campcap', s, w: 'campcap' }).day;
  assert.ok(count(cap('campwall'), 'mist') > count(cap('campcap'), 'mist'), 'a bright lip where a face drops below');
  const pcap = (s: TileName): Px => paint('pitcap', 5, 5, { n: 'pitcap', e: 'pitcap', s, w: 'pitcap' }).day;
  assert.ok(count(pcap('pitwall'), 'grey3') > count(pcap('pitcap'), 'grey3'), 'and the pit\'s rim has its lip');
  const wall = (n: TileName): string => paint('pitwall', 6, 6, { n, e: 'pitwall', s: 'pitfloor', w: 'pitwall' }).day.d.join();
  assert.notEqual(wall('pitcap'), wall('pitwall'), 'the upper face is not the lower one');
  const snow = (n: TileName): Px => paint('snow', 5, 5, { n, e: 'snow', s: 'snow', w: 'snow' }).day;
  assert.ok(count(snow('campwall'), 'shadow') > count(snow('snow'), 'shadow'), 'snow under a wall is in its shadow');
  const run = [0, 1, 2].map((ox) => paint('drift', 5 + ox, 5, around('drift'), { ox, oy: 0, w: 3, h: 1 }).day.d.join());
  assert.ok(new Set(run).size === 3 && !run.includes(paint('drift', 5, 5).day.d.join()), 'three banks side by side are one long drift');
  const floor = (w: TileName): number => count(paint('campfloor', 5, 5, { n: 'campfloor', e: 'campfloor', s: 'campfloor', w }).day, 'dusk', 'shadow');
  assert.ok(floor('snowpath') > floor('campfloor'), 'slush is blown in over a sill');
  const mixed = paint('barrel', 4, 4, { n: 'campfloor', e: 'campfloor', s: 'grate', w: 'campfloor' }).day, yard = paint('barrel', 4, 4).day;
  assert.notEqual(mixed.d.join(), yard.d.join(), 'a drum stands on the ground its neighbors show');
});

test('floors and walls do not look stamped, and the pit floor carries its stains, bones, drain and chain by position without turning into clutter', () => {
  const kinds = (n: TileName): number => { const seen = new Set<string>(); for (let tx = 0; tx < 8; tx++) for (let ty = 0; ty < 8; ty++) seen.add(paint(n, tx, ty, n === 'campfloor' || n === 'snow' || n === 'pitfloor' ? around(n) : NEARS[0]).day.d.join()); return seen.size; };
  for (const n of ['snow', 'snowpath', 'campfloor', 'pitfloor', 'pitwall', 'campcap'] as TileName[]) assert.ok(kinds(n) >= 4, `${n}: ${kinds(n)} different tiles in 64`);
  let stain = 0, bones = 0, drain = 0, chain = 0, total = 0;
  for (let tx = 0; tx < 40; tx++) for (let ty = 0; ty < 40; ty++) {
    const p = paint('pitfloor', tx, ty).day;
    total++;
    if (count(p, 'blood0') >= 15) stain++;
    else if (count(p, 'bone') >= 10) bones++;
    else if (count(p, 'ink') >= 40) drain++;
    else if (count(p, 'ink') >= 4 && count(p, 'grey2', 'grey3') >= 20) chain++;
  }
  assert.ok(stain >= 20 && bones >= 20 && drain >= 5 && chain >= 5, `${stain} stains, ${bones} bones, ${drain} drains, ${chain} chains in ${total}`);
  assert.ok((stain + bones + drain + chain) / total <= 0.2, 'the floor is mostly bare dirt');
  const hung = (tx: number): boolean => lanternAt(pitTile('pitwall', { tx, ty: 3, near: { n: 'pitcap', e: 'pitwall', s: 'pitfloor', w: 'pitwall' } }) as Px);
  const lanterns = Array.from({ length: 18 }, (_, i) => i).filter(hung);
  assert.ok(lanterns.length >= 2 && lanterns.length <= 4 && lanterns.every((x, i) => i === 0 || x - (lanterns[i - 1] as number) >= 4), `lanterns at ${lanterns}`);
  assert.ok(!lanternAt(pitTile('pitwall', { tx: 3, ty: 3, near: { n: 'pitwall', e: 'pitwall', s: 'pitfloor', w: 'pitwall' } }) as Px), 'none on the lower face');
  assert.ok(!lanternAt(pitTile('pitwall', { tx: 3, ty: 3, near: { n: 'pitcap', e: 'pitbar', s: 'pitfloor', w: 'pitwall' } }) as Px), 'none beside the barricade');
});

test('whole rooms bake fully painted by day and by night: the yard, the block and the pit', () => {
  for (const [name, rows] of [['yard', YARD], ['block', BLOCK], ['pit', PIT]] as [string, string[]][]) {
    assert.equal(rows.length, 12, name);
    for (const r of rows) assert.equal([...r].length, 16, `${name} rows are 16 wide`);
    for (const night of [false, true]) {
      const b = bakeStage(rows, night) as unknown as { canvas: FakeCanvas };
      assert.equal(b.canvas.w, 256);
      assert.ok(b.canvas.px.every((v) => v >>> 24 === 255), `${name} ${night ? 'by night' : 'by day'} has no see-through pixel`);
    }
  }
});

// ---------------------------------------------------------------- the map
const states = (s41: NodeState, s42: NodeState): Record<string, NodeState> => Object.fromEntries(ORDER.map((id) => [id, id === '4.1' ? s41 : id === '4.2' ? s42 : 'cleared']));
const inRect = (x: number, y: number): boolean => x >= INSET.x && y >= INSET.y && x < INSET.x + INSET.w && y < INSET.y + INSET.h;

test('Kamchatka is a framed inset in the top left corner of Hawkins, with its plate and its node, in color when open and in greys when locked', () => {
  const inset = kamchatka();
  assert.equal(inset.w, INSET.w);
  assert.equal(inset.h, INSET.h);
  assert.ok(opaque(inset), 'a picture with a frame, no holes');
  assert.ok(count(inset, 'amber', 'yellow') >= 25, 'the floodlight\'s amber');
  assert.ok(count(inset, 'slate', 'dusk', 'shadow', 'night') >= 400, 'blue night snow and sky');
  assert.ok(count(inset, 'ink') >= 100 && count(inset, 'mist') >= 100, 'ink and pale frame, the wire and the block');
  const open = paintLand(states('open', 'locked')), shut = paintLand(states('locked', 'locked'));
  const inBox = (px: Px, names: ColorName[]): number => { let n = 0; for (let y = INSET.y; y < INSET.y + INSET.h; y++) for (let x = INSET.x; x < INSET.x + INSET.w; x++) if (names.some((c) => px32(c) === px.get(x, y))) n++; return n; };
  assert.ok(inBox(open.px, ['amber', 'yellow']) >= 25 && inBox(shut.px, ['amber', 'yellow', 'slate', 'dusk', 'night']) === 0, 'greys while locked');
  assert.ok(opaque(open.px));
  assert.equal(open.inset.w, INSET.w, 'the map draws the inset again over the drifting clouds');
  const plate = open.plates.find((p) => p.name === 'KAMCHATKA');
  assert.ok(plate && plate.state === 'open' && plate.point === 'up' && plate.night === true, 'a KAMCHATKA plate under it');
  assert.equal(shut.plates.find((p) => p.name === 'KAMCHATKA')?.state, 'locked');
  const box = (p: { cx: number; y: number; name: string }): [number, number, number, number] => { const w = p.name.length * 4 + 5, x = Math.round(p.cx - w / 2); return [x, p.y, x + w, p.y + 9]; };
  const pr = box(plate!);
  assert.ok(pr[1] >= INSET.y + INSET.h - 4 && plate!.cx >= INSET.x && plate!.cx <= INSET.x + INSET.w, 'hung under the inset');
  for (const o of open.plates) if (o !== plate) { const r = box(o); assert.ok(pr[2] <= r[0] || r[2] <= pr[0] || pr[3] <= r[1] || r[3] <= pr[1], `clear of ${o.name}`); }
  const n = POS['4.1'] as { x: number; y: number };
  assert.ok(inRect(n.x, n.y) || inRect(n.x, n.y - 3), 'node 4.1 is on the inset');
  assert.ok(INSET.x + INSET.w <= 70 && INSET.y >= 10 && INSET.y + INSET.h <= 36, 'in the corner, over the sky above the woods');
});

test('the legs to Kamchatka and back to the Creel House are long dashes in every state, so a hop across the world is never mistaken for a walk', () => {
  type Leg = (typeof LEGS)[number];
  /** The runs of route color along a leg outside the inset, and how much of the leg is route color. */
  const runs = (px: Px, leg: Leg, colors: ColorName[]): { runs: number; on: number } => {
    const route = colors.map((c) => px32(c));
    let n = 0, on = 0, seen = 0, prev = false;
    for (const [fx, fy] of leg.pts) {
      const x = Math.round(fx), y = Math.round(fy);
      if (inRect(x, y)) continue;
      const is = route.includes(px.get(x, y));
      seen++;
      if (is) on++;
      if (is && !prev) n++;
      prev = is;
    }
    return { runs: n, on: seen ? on / seen : 1 };
  };
  const there = LEGS[ORDER.indexOf('3.3')] as Leg, back = LEGS[ORDER.indexOf('4.1')] as Leg;
  for (const [state, colors] of [['cleared', ['yellow', 'orange']], ['open', ['white']]] as [NodeState, ColorName[]][]) {
    const px = paintLand(states(state, state)).px;
    for (const leg of [there, back]) {
      const r = runs(px, leg, colors);
      assert.ok(r.runs >= 4 && r.on > 0.4 && r.on < 0.85, `${state}: a flight is dashed, ${r.runs} dashes covering ${r.on.toFixed(2)}`);
    }
  }
  const dotted = runs(paintLand(states('locked', 'locked')).px, back, ['grey2']);
  assert.ok(dotted.runs >= 5 && dotted.on < 0.6, `a locked flight is dotted: ${dotted.runs} dots`);
  assert.ok(there.len > 55 && back.len > 120, 'a long way in one hop');
});

// ---------------------------------------------------------------- the sheet
test('the sheet has Hopper in both looks, the guards, the camp and the pit, each page painting on every sub page and in the list', () => {
  assert.deepEqual(L10_PAGES.map((p) => p.title), ['HOPPER IN KAMCHATKA', 'KAMCHATKA GUARDS', 'KAMCHATKA CAMP', 'THE PIT']);
  assert.deepEqual(L10_PAGES.map((p) => p.subs), [5, 3, 3, 2]);
  const was = hopperInPrison();
  for (const page of L10_PAGES) {
    for (let sub = 0; sub < page.subs; sub++) {
      for (const t of [0, 45, 300]) {
        const c = screen(256, 224);
        page.draw(ctxOf(c), t, sub);
        assert.ok(painted(c) > 5000, `${page.title} ${sub} at ${t}`);
      }
    }
  }
  assert.equal(hopperInPrison(), was, 'a page puts the look back after it draws');
  assert.match(src('src/gfx/sheet.ts'), /\.\.\.L10_PAGES/);
});

test('the new files stay under 500 lines with no em dashes', () => {
  for (const f of [
    'src/gfx/actor_look.ts', 'src/gfx/actors.ts', 'src/gfx/data/hopper4.ts', 'src/gfx/data/kguard.ts', 'src/gfx/tile_camp.ts', 'src/gfx/tile_pit.ts', 'src/gfx/tile_ch4.ts', 'src/gfx/tiles.ts',
    'src/gfx/night.ts', 'src/gfx/ui.ts', 'src/gfx/map_inset.ts', 'src/gfx/map_land.ts', 'src/gfx/map_geo.ts', 'src/gfx/map.ts', 'src/gfx/sheet_l10.ts', 'src/gfx/sheet.ts', 'tests/art-ch4a.test.ts',
  ]) {
    const text = src(f);
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
});
