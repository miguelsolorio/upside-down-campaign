// The chapter 5 art for stages 5.2 and 5.3 (docs/chapter-5.md, src/gfx/ch5/): the Abyss's tiles and backdrop, the heart's tiles, marks and
// glow, the final boss (the spider with Vecna in its chest, Vecna's fast phase, Joyce) and the ending (the basement in 1987 and THE END).
// Every painter runs without throwing into a pixel buffer, paints only palette colors, and draws what it is for: islands that are solid and a
// gap that is clear, a backdrop with no hole in it, a chest that is open or shut, a card that differs from the room. All of it is pure
// pixel work, so Node runs it: the painters that draw on a canvas draw on the software one (canvas-helpers.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FakeCanvas, count, ctxOf, painted, same, screen } from './canvas-helpers.ts';
import { EM_DASH } from '../src/core/text.ts';
import type { ActorView } from '../src/core/types.ts';
import { composeFrame } from '../src/gfx/actor_pose.ts';
import { px32 } from '../src/gfx/canvas.ts';
import { PAL } from '../src/gfx/palette.ts';
import { Px } from '../src/gfx/px.ts';
import type { TileCtx } from '../src/gfx/tile_ground.ts';
import { ABYSS_TILES, abyssTile } from '../src/gfx/ch5/abyss_tiles.ts';
import { drawAbyssBg } from '../src/gfx/ch5/abyss_bg.ts';
import { HEART_TILES, channelMark, drawChannelMark, drawHeartGlow, heartTile } from '../src/gfx/ch5/heart_tiles.ts';
import { heartStep } from '../src/gfx/ch5/heart_marks.ts';
import { CHEST_H, CHEST_W, FAST_H, FAST_W, JOYCE_AXE, JOYCE_H, JOYCE_W, SINK_FRAMES, drawFinaleSpider, drawFinaleVecna, drawJoyce, fastPoseOf, joycePx, vecnaChestPx, vecnaFastPx } from '../src/gfx/ch5/finale_boss.ts';
import { drawEndingRoom, drawTheEnd, endingStill } from '../src/gfx/ch5/finale_end.ts';
import { abyssRows, abyssScene, demoPx, endScene, heartRows, heartScene, heroPx, view } from '../src/gfx/ch5/abyss_scenes.ts';
import { PARTY } from '../src/gfx/ch5/finale_party.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const PALETTE = new Set(Object.keys(PAL).map((k) => px32(k as keyof typeof PAL)));
const nearOf = (n: string, e = n, s = n, w = n): TileCtx['near'] => ({ n, e, s, w }) as unknown as TileCtx['near'];
const at = (tx: number, ty: number, near: TileCtx['near']): TileCtx => ({ tx, ty, near });
const colors = (p: { d: Uint32Array }): number => new Set(Array.from(p.d).filter((v) => v)).size;
const onlyPalette = (d: ArrayLike<number>): boolean => Array.from(d).every((v) => v === 0 || PALETTE.has(v));
const opaque = (p: Px): boolean => p.d.every((v) => v >>> 24 === 255);
const lit = (p: { d: Uint32Array }): number => p.d.filter((v) => v !== 0).length;
const sameD = (a: Px, b: Px): boolean => a.d.length === b.d.length && a.d.every((v, i) => v === b.d[i]);

// ---------------------------------------------------------------- the Abyss
test('every Abyss tile paints a 16 by 16 drawing of palette colors in many places and neighbors, and any other name is left to others', () => {
  assert.equal(abyssTile('grass', at(3, 3, nearOf('grass'))), null);
  const around = ['abyssgap', 'abysscliff', 'abyssunder', 'abyssbridgeh', 'abyssbridgev', 'abysslawn', 'abyssroad', 'abyssporch'];
  for (const name of ABYSS_TILES) {
    for (let i = 0; i < 24; i++) {
      const near = nearOf(around[i % 8] as string, around[(i * 3 + 1) % 8], around[(i * 5 + 2) % 8], around[(i * 7 + 3) % 8]);
      const p = abyssTile(name, at(2 + (i % 7), 3 + ((i * 5) % 9), near), i & 3) as Px;
      assert.ok(p, name);
      assert.equal(p.w, 16);
      assert.equal(p.h, 16);
      assert.ok(onlyPalette(p.d), `${name} paints a color outside the palette`);
      assert.ok(lit(p) > 0, `${name} is empty at ${i}`);
    }
  }
});

test('island floors are solid inside and round off at an open edge; the cliff and the rock under it are drawings; a gap is clear and a bridge shows the void', () => {
  for (const name of ['abysslawn', 'abyssroad', 'abyssline', 'abyssporch', 'abyssclass']) {
    const inside = abyssTile(name, at(7, 5, nearOf(name))) as Px;
    assert.ok(opaque(inside), `${name} is solid inside an island`);
    assert.ok(colors(inside) >= 4, `${name} is a drawing (${colors(inside)} colors)`);
    const alone = abyssTile(name, at(7, 5, nearOf('abyssgap'))) as Px;
    assert.equal(alone.get(0, 0), 0, `${name} has its corner cut off`);
    assert.ok(lit(alone) < 256 && lit(alone) > 150, `${name} alone keeps most of its floor`);
    assert.ok(!sameD(inside, alone));
  }
  for (const name of ['abysscliff', 'abyssunder']) {
    const p = abyssTile(name, at(7, 6, nearOf('abyssgap', 'abyssgap', 'abyssgap', 'abyssgap'))) as Px;
    assert.ok(colors(p) >= 4, `${name} is a drawing`);
    assert.ok(lit(p) > 40 && lit(p) < 256, `${name} ends in rock against the void`);
  }
  const hole = abyssTile('abyssgap', at(7, 5, nearOf('abysslawn'))) as Px;
  const void_ = abyssTile('abyssgap', at(7, 5, nearOf('abyssgap'))) as Px;
  assert.ok(lit(hole) > lit(void_) + 40, 'a hole in an island shows its far wall');
  assert.ok(lit(void_) < 40, 'open void is clear');
  for (const name of ['abyssbridgeh', 'abyssbridgev']) {
    const b = abyssTile(name, at(7, 5, nearOf('abyssgap'))) as Px;
    assert.ok(lit(b) > 100 && lit(b) < 256, `${name} leaves the void showing between its slats`);
    assert.ok(colors(b) >= 6, `${name} is a drawing`);
  }
  const h = abyssTile('abyssbridgeh', at(6, 6, nearOf('abyssgap'))) as Px, v = abyssTile('abyssbridgev', at(6, 6, nearOf('abyssgap'))) as Px;
  let turned = true;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (h.get(x, y) !== v.get(y, x)) turned = false;
  assert.ok(turned, 'the vertical bridge is the horizontal one turned on its side');
});

test('the veins on the island floors pulse with the phase and run on across a pair of tiles', () => {
  let changed = false;
  for (let tx = 4; tx < 12 && !changed; tx++) {
    const a = abyssTile('abysslawn', at(tx, 5, nearOf('abysslawn')), 0) as Px, b = abyssTile('abysslawn', at(tx, 5, nearOf('abysslawn')), 2) as Px;
    if (!sameD(a, b)) changed = true;
  }
  assert.ok(changed, 'a vein moves between phases');
});

test('the Abyss backdrop covers the whole screen, is dark red, moves, and draws cheaply', () => {
  const a = screen(256, 224), b = screen(256, 224);
  drawAbyssBg(ctxOf(a), 0, 0, 0);
  drawAbyssBg(ctxOf(b), 300, 0, 0);
  assert.equal(painted(a), 256 * 224, 'no hole in the void');
  assert.ok(onlyPalette(a.px));
  assert.ok(!same(a, b), 'the spores and the rocks drift');
  assert.ok(count(a, 'black') > 2000, 'the sun is black');
  assert.ok(count(a, 'red', 'hot') > 80, 'and has a red rim');
  assert.ok(count(a, 'blood0', 'blood1') > 12000, 'the void is dark red');
  const c = screen(256, 224);
  drawAbyssBg(ctxOf(c), 0, 200, 150);
  assert.ok(!same(a, c), 'the camera slides it');
});

test('the Abyss scene lays islands, bridges and a hole, and draws with the backdrop behind', () => {
  const rows = abyssRows();
  assert.equal(rows.length, 14);
  assert.ok(rows.every((r) => r.length === 16));
  for (const ch of 'crlgphvku ') if (ch !== 'l' || rows.some((r) => r.includes('l'))) assert.ok(rows.some((r) => r.includes(ch)), ch);
  const c = screen(256, 224);
  abyssScene(ctxOf(c), 40, [heroPx(PARTY.will, 'right'), heroPx(PARTY.eleven), heroPx(PARTY.mike, 'left'), heroPx(PARTY.dustin)], demoPx());
  assert.equal(painted(c), 256 * 224);
  assert.ok(onlyPalette(c.px));
});

// ---------------------------------------------------------------- the heart
test('every heart tile paints a 16 by 16 drawing of palette colors, and the floor and the rim are solid', () => {
  assert.equal(heartTile('abysslawn', at(3, 3, nearOf('heartfloor'))), null);
  for (const name of HEART_TILES) {
    for (let i = 0; i < 24; i++) {
      const n = ['heartfloor', 'heartwall', 'heartrim'];
      const p = heartTile(name, at(2 + (i % 7), 3 + ((i * 5) % 9), nearOf(n[i % 3] as string, n[(i + 1) % 3], n[(i * 2) % 3], n[(i + 2) % 3])), i & 3) as Px;
      assert.ok(p, name);
      assert.equal(p.w, 16);
      assert.ok(onlyPalette(p.d));
      assert.ok(colors(p) >= 2, `${name} is a drawing`);
    }
  }
  assert.ok(opaque(heartTile('heartfloor', at(7, 5, nearOf('heartfloor'))) as Px));
  assert.ok(opaque(heartTile('heartwall', at(7, 5, nearOf('heartwall'))) as Px));
  // The rim turns a corner where the floor does: the pixels it gives up are the floor's.
  const edge = heartTile('heartrim', at(7, 5, nearOf('heartfloor', 'heartfloor', 'heartwall', 'heartwall'))) as Px;
  assert.ok(opaque(edge), 'the rim stays solid where it rounds off, the floor showing in its corner');
});

test('the heart is dark red black, and the beat changes the floor', () => {
  const lum = (v: number): number => 0.299 * (v & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * ((v >> 16) & 255);
  let sum = 0, n = 0;
  for (let ty = 3; ty < 9; ty++) for (let tx = 3; tx < 9; tx++) for (const v of (heartTile('heartfloor', at(tx, ty, nearOf('heartfloor'))) as Px).d) { sum += lum(v); n++; }
  assert.ok(sum / n < 40, `the floor averages ${(sum / n).toFixed(1)}`);
  let moved = false;
  for (let tx = 3; tx < 12 && !moved; tx++) moved = !sameD(heartTile('heartfloor', at(tx, 5, nearOf('heartfloor')), 0) as Px, heartTile('heartfloor', at(tx, 5, nearOf('heartfloor')), 1) as Px);
  assert.ok(moved);
});

test('the channel marks are 32 by 32, one for each hero, dim or lit, and the lit ones glow', () => {
  const seen: Px[] = [];
  for (const who of ['eleven', 'will'] as const) {
    for (const on of [false, true]) {
      for (let p = 0; p < 4; p++) {
        const m = channelMark(who, p, on);
        assert.equal(m.w, 32);
        assert.equal(m.h, 32);
        assert.ok(onlyPalette(m.d));
        assert.ok(colors(m) >= 6, `${who} mark is a drawing`);
      }
      seen.push(channelMark(who, 0, on));
    }
  }
  assert.ok(!sameD(seen[0], seen[1]), 'lit differs from dim');
  assert.ok(!sameD(seen[2], seen[0]), 'Will differs from Eleven');
  assert.ok(!sameD(channelMark('eleven', 0, true), channelMark('eleven', 1, true)), 'the runes turn');
  const c = screen(64, 64);
  drawChannelMark(ctxOf(c), 'will', 32, 32, 20, true);
  assert.ok(painted(c) > 300);
});

test('the glow is a heartbeat of four steps that pulses twice a beat, and paints over the arena', () => {
  const steps = new Set<number>();
  for (let t = 0; t < 120; t++) { const s = heartStep(t); assert.ok(s >= 0 && s <= 3); steps.add(s); }
  assert.deepEqual([...steps].sort(), [0, 1, 2, 3]);
  assert.ok(heartStep(3) > heartStep(10), 'the lub is stronger than the rest');
  assert.ok(heartStep(17) > heartStep(12), 'and the dub follows it');
  const a = screen(256, 224), b = screen(256, 224);
  drawHeartGlow(ctxOf(a), 10, 128, 112);
  drawHeartGlow(ctxOf(b), 3, 128, 112);
  assert.ok(painted(a) > 1000 && painted(b) > painted(a) * 2, 'the beat is thicker than the rest');
  assert.ok(onlyPalette(b.px));
  const none = screen(256, 224);
  drawHeartGlow(ctxOf(none), 3, 128, 112, 0);
  assert.equal(painted(none), 0, 'level 0 is nothing');
});

test('the heart scene lays a round arena and draws it with the boss, the marks and the glow', () => {
  const rows = heartRows();
  assert.equal(rows.length, 14);
  const floor = rows.join('').split('f').length - 1;
  assert.ok(floor > 90 && floor < 140, `${floor} floor tiles`);
  assert.ok(rows[7]?.[8] === 'f' && rows[0]?.[0] === 'w');
  const c = screen(256, 224);
  heartScene(ctxOf(c), 30, true, [heroPx(PARTY.eleven, 'up'), heroPx(PARTY.will, 'up'), heroPx(PARTY.mike, 'up'), heroPx(PARTY.lucas, 'up')]);
  assert.equal(painted(c), 256 * 224);
  assert.ok(onlyPalette(c.px));
});

// ---------------------------------------------------------------- the final boss
const body = (over: Partial<ActorView> = {}): ActorView => view({ id: 'flayer', x: 128, y: 70, ...over });

test('the spider has Vecna in its chest, shut and open, and the chest follows the body', () => {
  for (const open of [false, true]) {
    const p = vecnaChestPx(open, 3);
    assert.equal(p.w, CHEST_W);
    assert.equal(p.h, CHEST_H);
    assert.ok(onlyPalette(p.d));
    assert.ok(colors(p) >= 8, `the ${open ? 'open' : 'shut'} chest is a drawing`);
  }
  assert.ok(!sameD(vecnaChestPx(false, 0), vecnaChestPx(true, 0)));
  assert.ok(!sameD(vecnaChestPx(false, 0), vecnaChestPx(false, 1)), 'the light crawls down the seam');
  const shut = screen(256, 120), open = screen(256, 120), plain = screen(256, 120);
  drawFinaleSpider(ctxOf(shut), body(), false);
  drawFinaleSpider(ctxOf(open), body(), true);
  drawFinaleSpider(ctxOf(plain), body({ pose: 'down' }), true);
  assert.ok(!same(shut, open));
  assert.ok(count(open, 'amber', 'yellow') > count(shut, 'amber', 'yellow') - 40 && count(open, 'white') > count(shut, 'white'), 'Vecna burns in the open chest');
  assert.ok(count(shut, 'amber') > 0, 'light leaks from the shut one');
  assert.ok(painted(plain) > 3000 && count(plain, 'amber') === 0, 'with its head down the body has no chest');
  const petals = screen(256, 120);
  drawFinaleSpider(ctxOf(petals), body({ petals: true }));
  assert.ok(same(petals, open), 'the chest opens on the petals flag by default');
  const rising = screen(256, 120);
  drawFinaleSpider(ctxOf(rising), body({ pose: 'rise', t: 4 }), true);
  assert.ok(painted(rising) < painted(open), 'a body still coming in has less on screen');
  const flash = screen(256, 120);
  drawFinaleSpider(ctxOf(flash), body({ flash: 1 }), true);
  assert.ok(count(flash, 'white') > painted(flash) * 0.9, 'a hit flashes the chest white with the body');
});

test('Vecna in the fast phase has idle, walk, the clock curse and the sink, and sinks a row at a time', () => {
  for (const pose of ['idle', 'walk', 'cast', 'sink'] as const) {
    for (const phase of [0, 3, 7]) {
      const p = vecnaFastPx(pose, phase, 0.4);
      assert.equal(p.w, FAST_W);
      assert.equal(p.h, FAST_H);
      assert.ok(onlyPalette(p.d));
      assert.ok(lit(p) > 200, `${pose} is a drawing`);
    }
  }
  assert.ok(count(screenOf(vecnaFastPx('idle', 0)), 'white') > 0, 'his eyes burn white');
  assert.ok(!sameD(vecnaFastPx('idle', 0), vecnaFastPx('idle', 3)), 'the tendrils writhe');
  assert.ok(lit(vecnaFastPx('cast', 0)) > lit(vecnaFastPx('idle', 0)), 'the curse hangs his clock over a raised hand');
  assert.ok(lit(vecnaFastPx('sink', 0, 0.9)) < lit(vecnaFastPx('sink', 0, 0.1)) * 0.6, 'the deeper he is, the less shows');
  assert.equal(fastPoseOf({ anim: 'ko' }), 'sink');
  assert.equal(fastPoseOf({ anim: 'cast' }), 'cast');
  assert.equal(fastPoseOf({ anim: 'walk' }), 'walk');
  assert.equal(fastPoseOf({ anim: 'idle' }), 'idle');
  assert.ok(SINK_FRAMES > 20);
  const idle = screen(80, 90), sink = screen(80, 90);
  drawFinaleVecna(ctxOf(idle), view({ id: 'vecna', x: 40, y: 80 }));
  drawFinaleVecna(ctxOf(sink), view({ id: 'vecna', x: 40, y: 80, anim: 'ko', t: 48 }));
  assert.ok(painted(idle) > painted(sink) && painted(sink) > 0);
  const hidden = screen(80, 90);
  drawFinaleVecna(ctxOf(hidden), view({ id: 'vecna', x: 40, y: 80, blink: true }));
  assert.equal(painted(hidden), 0, 'a blink skips the frame');
});

/** A software canvas holding a Px, to count colors on it. */
function screenOf(p: Px): FakeCanvas {
  const c = screen(p.w, p.h);
  c.px.set(p.d);
  return c;
}

test('Joyce is a hero spec with an axe at her side, and has a swing in every direction', () => {
  assert.equal(JOYCE_AXE.id, 'joyce');
  for (const view of ['down', 'up', 'side'] as const) {
    for (const [anim, n] of [['idle', 2], ['walk', 4], ['attack', 2], ['cast', 3], ['hurt', 1], ['ko', 1]] as const) {
      for (let f = 0; f < n; f++) {
        const buf = composeFrame(JOYCE_AXE, view, anim, f);
        for (const v of buf) if (v && v !== 107) assert.ok(JOYCE_AXE.pal[String.fromCharCode(v)], `${view} ${anim} ${f} paints role ${String.fromCharCode(v)} with no color`);
      }
    }
  }
  const idle = composeFrame(JOYCE_AXE, 'down', 'idle', 0), bare = composeFrame({ ...JOYCE_AXE, held: {} }, 'down', 'idle', 0);
  assert.ok(idle.some((v, i) => v !== bare[i]), 'the axe stands at her side');
  const sizes = new Set<number>();
  for (const dir of ['down', 'up', 'left', 'right'] as const) {
    for (const pose of ['idle', 'walk', 'raise', 'swing', 'follow'] as const) {
      const p = joycePx(pose, dir, 1);
      assert.equal(p.w, JOYCE_W);
      assert.equal(p.h, JOYCE_H);
      assert.ok(onlyPalette(p.d));
      assert.ok(lit(p) > 60, `${pose} ${dir} is drawn`);
      sizes.add(lit(p));
    }
  }
  assert.ok(sizes.size > 10, 'every pose is its own drawing');
  assert.ok(lit(joycePx('swing', 'right')) > lit(joycePx('idle', 'right')) + 15, 'the swing has the axe out and a smear');
  assert.ok(sameD(joycePx('swing', 'left'), mirrored(joycePx('swing', 'right'))), 'left is right mirrored');
  const c = screen(60, 60);
  drawJoyce(ctxOf(c), view({ id: 'joyce', kind: 'npc', x: 30, y: 50, anim: 'attack', t: 10, dir: 'right' }));
  assert.ok(painted(c) > 60);
});

function mirrored(p: Px): Px {
  const out = new Px(p.w, p.h);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) out.d[y * p.w + x] = p.d[y * p.w + (p.w - 1 - x)] as number;
  return out;
}

// ---------------------------------------------------------------- the ending
test('the basement in 1987 is a whole room with the party at the table, and THE END dims it and puts a title over it', () => {
  const room = screen(256, 224), card = screen(256, 224), wide = screen(320, 224);
  drawEndingRoom(ctxOf(room), 256, 0);
  drawTheEnd(ctxOf(card), 256, 0, 8, 1);
  drawEndingRoom(ctxOf(wide), 320, 32);
  assert.equal(painted(room), 256 * 224, 'the room runs edge to edge');
  assert.equal(painted(wide), 320 * 224, 'and on a wider screen');
  assert.ok(onlyPalette(room.px) && onlyPalette(card.px));
  assert.ok(count(room, 'blood1', 'red') > 300, 'the campaign book, the pennant and the guitar are red');
  assert.ok(count(room, 'white') > 20, 'the die is white');
  assert.ok(!same(room, card));
  assert.ok(count(card, 'ink', 'black') > count(room, 'ink', 'black') + 8000, 'the card dims the room');
  assert.ok(count(card, 'white') > 300, 'THE END is in the big type');
  const faded = screen(256, 224);
  drawTheEnd(ctxOf(faded), 256, 0, 8, 0);
  assert.ok(same(faded, screenStill()), 'at level 0 the room is as it was');
  assert.ok(endingStill(256, 0) === endingStill(256, 0), 'the still is drawn once');
  const mid = screen(256, 224);
  drawTheEnd(ctxOf(mid), 256, 0, 8, 0.5);
  assert.ok(count(mid, 'ink') > count(room, 'ink') && count(mid, 'ink') < count(card, 'ink'), 'the card fades in');
  const scene = screen(256, 224);
  endScene(ctxOf(scene), 8, false);
  assert.ok(same(scene, room));
});

function screenStill(): FakeCanvas {
  const c = screen(256, 224);
  ctxOf(c).drawImage(endingStill(256, 0) as never, 0, 0);
  return c;
}

// ---------------------------------------------------------------- the files
test('the chapter 5 art files stay under 500 lines with no em dashes, and the page loads them', () => {
  const files = [
    'abyss_kit.ts', 'abyss_tiles.ts', 'abyss_bg.ts', 'heart_tiles.ts', 'heart_marks.ts', 'finale_boss.ts', 'finale_vecna.ts', 'finale_joyce.ts',
    'finale_end.ts', 'finale_party.ts', 'abyss_scenes.ts', 'abyss_sheet.ts',
  ].map((f) => `src/gfx/ch5/${f}`).concat(['tests/ch5-abyss-art.test.ts', 'chapter5-abyss.html']);
  for (const f of files) {
    const text = readFileSync(`${ROOT}${f}`, 'utf8');
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
  const page = readFileSync(`${ROOT}chapter5-abyss.html`, 'utf8');
  for (const m of ['abyss_sheet.ts', 'abyss_scenes.ts', 'finale_party.ts']) assert.ok(page.includes(m), m);
  assert.ok(!page.includes('<script src='), 'the page loads nothing from outside');
});
