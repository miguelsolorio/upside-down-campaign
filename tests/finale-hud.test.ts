// The final fight on the HUD (docs/level-16.md, "What UI builds"): the boss bar names each phase, the channel's bar counts the seconds, a bar for
// each channeler sits under it and their slots in the party band are marked as held. The names and the fields come from the real sim on the
// real stage; the layout is checked as rectangles and the bar and mark by the pixels they put down on the software canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCanvas, ctxOf, screen } from './canvas-helpers.ts';
import type { Rect } from '../src/core/pointer.ts';
import type { HudView, PartyHud } from '../src/core/types.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { SCREEN_W, VIEW_TOP } from '../src/core/config.ts';
import { hurtChannel } from '../src/combat/channel.ts';
import { drawHud } from '../src/ui/hud.ts';
import { BOSS_BAR_H, BOSS_BAR_W, CHANNEL_GAP, NEXT_DY, bossLayout, channelBars, slotAt, slotRects } from '../src/ui/hudlayout.ts';
import { COUNT_FILL, toneOf } from '../src/ui/hudchannel.ts';
import { FINALE_PHASES, bossTitle, secondsLeft } from '../src/ui/format.ts';
import { kind, rig, steps, still, toChannel, toSpider, until } from './finale-helpers.ts';

// The fake canvas has no clip, which the portraits in the strip use: give it one that later fills stay inside, as ui-ch4.test.ts does.
interface ClipCtx { sc: number; tx: number; ty: number; clipRect?: number[]; pathRect?: number[]; clipStack?: (number[] | undefined)[]; raw(x: number, y: number, v: number): void; save(): void; restore(): void }
const proto = Object.getPrototypeOf(ctxOf(screen(1, 1))) as Record<string, unknown> & ClipCtx;
const rawFill = proto.raw, rawSave = proto.save, rawRestore = proto.restore;
Object.assign(proto, {
  beginPath(this: ClipCtx) { this.pathRect = undefined; },
  rect(this: ClipCtx, x: number, y: number, w: number, h: number) { this.pathRect = [x * this.sc + this.tx, y * this.sc + this.ty, w * this.sc, h * this.sc]; },
  clip(this: ClipCtx) { this.clipRect = this.pathRect; },
  raw(this: ClipCtx, x: number, y: number, v: number) {
    const c = this.clipRect;
    if (c && (x < (c[0] as number) || y < (c[1] as number) || x >= (c[0] as number) + (c[2] as number) || y >= (c[1] as number) + (c[3] as number))) return;
    rawFill.call(this, x, y, v);
  },
  save(this: ClipCtx) { (this.clipStack ??= []).push(this.clipRect); rawSave.call(this); },
  restore(this: ClipCtx) { rawRestore.call(this); this.clipRect = (this.clipStack ??= []).pop(); },
});

const isColor = (c: FakeCanvas, x: number, y: number, color: ColorName): boolean => c.px[y * c.w + x] === px32(color);
const inBox = (c: FakeCanvas, r: Rect, color: ColorName): number => {
  let n = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (isColor(c, x, y, color)) n++;
  return n;
};

// ---------------------------------------------------------------- the names
test('the bar names each phase, VECNA, THE MIND FLAYER, THE CHANNEL: the sim says so and the screen prints what it says', () => {
  assert.deepEqual(FINALE_PHASES, ['VECNA', 'THE MIND FLAYER', 'THE CHANNEL']);
  const r = rig();
  r.sim.defend();
  steps(r, 2);
  const seen = [r.sim.view().hud.boss];
  kind(r, 'vecna').hp = 0;
  until(r, () => r.s.finale?.phase === 2);
  seen.push(r.sim.view().hud.boss);
  toSpider(r);
  toChannel(r);
  seen.push(r.sim.view().hud.boss);
  assert.deepEqual(seen.map((b) => b?.phase), [1, 2, 3]);
  assert.deepEqual(seen.map((b) => b?.name), [...FINALE_PHASES]);
  for (const b of seen) assert.equal(bossTitle(b!), b!.name, 'the HUD title is the phase\'s name');
  // A boss with no phase keeps its own name, and a name not in the list is not renamed.
  assert.equal(bossTitle({ name: 'THE ALPHA' }), 'THE ALPHA');
  assert.equal(bossTitle({ name: 'ODD', phase: 2 }), 'THE MIND FLAYER');
});

test('the seconds on the channel\'s bar round up, never below 0, as the ward\'s clock prints them', () => {
  assert.deepEqual([2400, 2399, 61, 60, 59, 1, 0, -5].map(secondsLeft), [40, 40, 2, 1, 1, 1, 0, 0]);
});

// ---------------------------------------------------------------- the fields
test('the channel\'s HUD: null before it, then the clock, Eleven\'s and Will\'s bars, and the two held rows of the party band', () => {
  const r = rig();
  toSpider(r);
  assert.equal(r.sim.view().hud.channel, null, 'null in phase two');
  assert.ok(r.sim.view().hud.party.every((p) => !p.channeling));
  toChannel(r);
  let ch = r.sim.view().hud.channel!;
  assert.ok(ch, 'the channel exists in phase three');
  assert.equal(ch.on, false, 'walking to the marks: the clock has not started');
  assert.equal(ch.total, 40 * 60);
  assert.equal(ch.left, ch.total);
  assert.deepEqual(ch.channelers.map((c) => [c.id, c.name]), [['eleven', 'ELEVEN'], ['will', 'WILL']]);
  for (const c of ch.channelers) assert.ok(c.hpMax > 0 && c.hp === c.hpMax, `${c.name} at full`);
  assert.deepEqual(r.sim.view().hud.party.filter((p) => p.channeling).map((p) => p.id), ['eleven', 'will'], 'the two held rows');
  assert.equal(r.sim.view().hud.boss?.hp, ch.left, 'the boss bar is the countdown');
  until(r, () => r.sim.view().hud.channel?.on === true, 400);
  steps(r, 60);
  ch = r.sim.view().hud.channel!;
  assert.equal(ch.on, true);
  assert.ok(ch.left < ch.total && ch.left > ch.total - 120, `${ch.left} frames left a second in`);
  assert.equal(r.sim.view().hud.boss?.hp, ch.left);
  // A channeler hit loses HP in their own bar and not the hero's; a fall puts both back at full and the clock at the start.
  const chans = r.s.finale!.chans;
  const before = r.sim.view().hud.party.find((p) => p.id === 'eleven')!.hp;
  hurtChannel(r.s, chans[0]!, 1, 30);
  const hurt = r.sim.view().hud;
  assert.ok(hurt.channel!.channelers[0]!.hp < hurt.channel!.channelers[0]!.hpMax);
  assert.equal(hurt.party.find((p) => p.id === 'eleven')!.hp, before, 'the hero\'s own HP is untouched');
  hurtChannel(r.s, chans[0]!, 1, 99999);
  const reset = r.sim.view().hud.channel!;
  assert.equal(reset.left, reset.total);
  assert.ok(reset.channelers.every((c) => c.hp === c.hpMax));
});

test('the two bodies that stay after they fall, Vecna sinking and the kneeling Mind Flayer, are not left white by the killing blow\'s flash', () => {
  const r = rig();
  r.sim.defend();
  steps(r, 2);
  const vecna = kind(r, 'vecna');
  vecna.hp = 0;
  steps(r, 6);
  vecna.flash = 0.9;
  const flashOf = (id: string): number | undefined => r.sim.view().actors.find((a) => a.id === id)?.flash;
  assert.equal(vecna.dead, true);
  assert.equal(flashOf('vecna'), 0, 'a sinking Vecna is drawn plain');
  until(r, () => r.s.finale?.phase === 2);
  steps(r, 60);
  still(r);
  const body = kind(r, 'flayer5');
  body.hp = 0;
  steps(r, 6);
  body.flash = 0.9;
  assert.equal(body.dead, true);
  assert.equal(flashOf('flayer5'), 0, 'and so is a kneeling Mind Flayer');
});

// ---------------------------------------------------------------- the layout
const party = (held: string[]): PartyHud[] =>
  (['mike', 'dustin', 'eleven', 'will'] as const).map((id, i) => ({
    id, name: id.toUpperCase(), level: 8, hp: 80, hpMax: 100, mp: 10, mpMax: 10, mpCost: 5, xp: 0, xpNext: 99, ko: false, active: i === 0, ...(held.includes(id) ? { channeling: true } : {}),
  }));

test('the channelers\' bars sit side by side under the boss bar, inside its width, a row down', () => {
  const lay = bossLayout(SCREEN_W, VIEW_TOP);
  const bars = channelBars(SCREEN_W, lay.nextY, 2);
  assert.equal(bars.length, 2);
  const [a, b] = bars as [Rect, Rect];
  assert.equal(a.y, lay.y + NEXT_DY);
  assert.equal(a.y, b.y);
  assert.equal(b.x - (a.x + a.w), CHANNEL_GAP, 'a gap between them');
  assert.equal(a.x, lay.x, 'the pair starts where the boss bar does');
  assert.equal(b.x + b.w, lay.x + BOSS_BAR_W, 'and ends where it ends');
  assert.equal(a.w, b.w);
  assert.equal(a.h, BOSS_BAR_H);
  assert.deepEqual(channelBars(SCREEN_W, 30, 0), [], 'no channelers, no bars');
  assert.equal(channelBars(SCREEN_W, 30, 1)[0]!.w, BOSS_BAR_W, 'one fills the width');
});

test('the held rows are marked in the slot rectangles and are no swap target, whoever else is', () => {
  const p = party(['eleven', 'will']);
  const rects = slotRects(p);
  assert.deepEqual(rects.filter((r) => r.held).map((r) => p[r.index]!.id), ['eleven', 'will']);
  assert.ok(rects.filter((r) => !r.held).every((r) => !r.cursed));
  for (const r of rects) {
    const at = slotAt(p, r.x + r.w / 2, r.y + r.h / 2);
    if (r.active || r.held) assert.equal(at, -1, `slot ${r.n} is no target`);
    else assert.equal(at, r.index, `slot ${r.n} still is`);
  }
});

// ---------------------------------------------------------------- the pixels
const hudOf = (o: Partial<HudView>): HudView => ({
  party: party([]), burst: 0.3, burstReady: false, quarters: 3, inspiration: 0, swapReady: 1, boss: null, ward: null, stash: { eggo: 0, coke: 0 }, solo: null, walkman: null,
  channel: null, ...o,
});
const channelHud = (left: number, hp: [number, number], on = true): HudView => hudOf({
  party: party(['eleven', 'will']),
  boss: { name: 'THE CHANNEL', hp: left, hpMax: 2400, phase: 3 },
  channel: { on, left, total: 2400, channelers: [{ id: 'eleven', name: 'ELEVEN', hp: hp[0], hpMax: 380 }, { id: 'will', name: 'WILL', hp: hp[1], hpMax: 380 }] },
});
const draw = (hud: HudView): FakeCanvas => {
  const c = screen(256, 224);
  drawHud(ctxOf(c), hud, 0, { device: 'keyboard' });
  return c;
};

test('the channel draws an amber countdown bar and a bar for each channeler in their own color, and a fallen channeler\'s is empty', () => {
  const lay = bossLayout(SCREEN_W, VIEW_TOP);
  const [e, w] = channelBars(SCREEN_W, lay.nextY, 2) as [Rect, Rect];
  const full = draw(channelHud(2400, [380, 380]));
  const boss: Rect = { x: lay.x, y: lay.y + 1, w: BOSS_BAR_W, h: BOSS_BAR_H - 2 };
  assert.ok(inBox(full, boss, COUNT_FILL) > BOSS_BAR_W * 3, 'the countdown bar is amber and full');
  assert.equal(inBox(full, boss, 'red'), 0, 'and is not the red of a health bar');
  const tone = (id: 'eleven' | 'will'): ColorName => toneOf(id).fill;
  assert.ok(inBox(full, { ...e, y: e.y + 1, h: e.h - 2 }, tone('eleven')) > e.w * 3, 'Eleven\'s bar is her rose');
  assert.ok(inBox(full, { ...w, y: w.y + 1, h: w.h - 2 }, tone('will')) > w.w * 3, 'Will\'s is his teal');
  assert.notEqual(tone('eleven'), tone('will'));
  // Half the time and half of Eleven's HP, and Will fallen: the bars follow. A probe past the words in the middle row of each bar tells how far it is filled.
  const half = draw(channelHud(1200, [190, 0]));
  const mid = (r: Rect): number => r.y + (r.h >> 1);
  const x = { boss: lay.x + 140, e: e.x + 60, w: w.x + 60 };
  assert.ok(isColor(full, x.boss, mid(boss), COUNT_FILL) && !isColor(half, x.boss, mid(boss), COUNT_FILL), 'the countdown drained by half');
  assert.ok(isColor(half, lay.x + 30, mid(boss), COUNT_FILL), 'and still holds the first half');
  assert.ok(isColor(full, x.e, mid(e), tone('eleven')) && !isColor(half, x.e, mid(e), tone('eleven')), 'Eleven\'s bar is at half');
  assert.ok(isColor(half, e.x + 20, mid(e), tone('eleven')) || isColor(half, e.x + 41, mid(e), tone('eleven')), 'and holds its first half');
  assert.ok(isColor(full, x.w, mid(w), tone('will')) && !isColor(half, w.x + 4, mid(w) + 1, tone('will')), 'Will\'s, at 0, is empty');
});

test('the held mark stands where a key would, in the hero\'s own color, and a swap key stays on the ones who can be swapped to', () => {
  const held = draw(channelHud(2400, [380, 380]));
  const free = draw(hudOf({ party: party([]) }));
  for (const r of slotRects(party(['eleven', 'will'])).filter((x) => x.held)) {
    const frame = toneOf(r.n === 3 ? 'eleven' : 'will').frame;
    const face: Rect = { x: r.px, y: 2, w: 11, h: 11 };
    assert.ok(inBox(held, face, frame) >= 30, `${frame} frames slot ${r.n}'s face`);
    const key: Rect = { x: r.x + 2, y: 5, w: 3, h: 5 };
    assert.ok(inBox(held, key, frame) >= 6, `slot ${r.n} wears the ring where the key was`);
    assert.equal(inBox(free, key, frame), 0, 'and the key is what stands there when nothing is held');
  }
});
