// The Palace's cabinets as a whole: every cabinet in 2.1 plays a game and can be walked up to, the boards start with the
// show's names and keep the best five, Space reaches the nearest cabinet or unlit lights, and the MADMAX prize pays the
// party through the sim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABINET_GAMES, TITLES, gameFor } from '../src/arcade/cabinets.ts';
import { BOARD_ROWS, DEFAULT_BOARDS, MADMAX_SCORE, NAME_MAX, createBoard, postScore } from '../src/arcade/scores.ts';
import type { ScoreStore } from '../src/arcade/scores.ts';
import { ARCADE_GAMES } from '../src/arcade/types.ts';
import { nearUsable, USE_REACH } from '../src/world/interact.ts';
import { STAGE_21 } from '../src/world/stages/stage21.ts';
import type { PropView } from '../src/core/types.ts';
import { stageKit } from './stage-helpers.ts';
import { makeSim } from './sim-helpers.ts';

const kit = stageKit(STAGE_21);
const cabinets = kit.props.filter((p) => p.prop === 'arcade');

function memoryStore(): ScoreStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => { data.set(k, v); } };
}

// ---------------------------------------------------------------- cabinets
test('every cabinet in the Palace plays a game, and every game stands somewhere', () => {
  assert.ok(cabinets.length >= 8);
  for (const c of cabinets) assert.ok(CABINET_GAMES[c.id], `${c.id} is in the table`);
  assert.equal(gameFor('digdug'), 'digdug');
  const played = new Set(cabinets.map((c) => gameFor(c.id)));
  for (const g of ARCADE_GAMES) assert.ok(played.has(g), `${TITLES[g]} has a cabinet`);
});

test('a cabinet outside the table still gets a game, the same one every time', () => {
  for (const id of ['arcade7', 'x', 'palace-north']) {
    assert.ok(ARCADE_GAMES.includes(gameFor(id)));
    assert.equal(gameFor(id), gameFor(id));
  }
});

test('the party can walk up to every cabinet: the tile in front of it is open and reachable from the start', () => {
  const reach = kit.flood(new Set());
  for (const c of cabinets) {
    const front = kit.idx(c.tx, c.ty + 1);
    assert.equal(reach[front], 1, `${c.id} at ${c.tx},${c.ty} has a reachable tile under it`);
  }
});

// ---------------------------------------------------------------- boards
test('the boards start with the show: MADMAX over Dustin at Dig Dug, Dustin still first at Centipede', () => {
  const b = createBoard(memoryStore());
  assert.deepEqual(b.top('digdug', 2).map((r) => r.name), ['MADMAX', 'DUSTIN']);
  assert.equal(b.top('digdug', 1)[0]?.score, MADMAX_SCORE);
  assert.equal(b.topName('centipede'), 'DUSTIN');
  assert.equal(b.topName('dragonslair'), 'KEITH');
  for (const g of ARCADE_GAMES) {
    const rows = DEFAULT_BOARDS[g];
    assert.equal(rows.length, BOARD_ROWS);
    for (let i = 1; i < rows.length; i++) assert.ok((rows[i - 1]?.score ?? 0) > (rows[i]?.score ?? 0), `${g} is in order`);
  }
});

test('a score goes in at its row, the sixth falls off, names are capped and the board saves', () => {
  const store = memoryStore();
  const b = createBoard(store);
  assert.equal(b.submit('digdug', 'dustin', 99999), 0);
  assert.equal(b.topName('digdug'), 'DUSTIN');
  assert.equal(b.top('digdug').length, BOARD_ROWS);
  assert.equal(b.submit('digdug', 'nobody', 10), -1, 'too low for the board');
  assert.equal(b.submit('galaga', 'a very long name', 20000), 0);
  assert.equal(b.topName('galaga').length, NAME_MAX);
  // A tie goes under the score already there.
  const tie = DEFAULT_BOARDS.pacman[1]?.score ?? 0;
  assert.equal(b.submit('pacman', 'WILL', tie), 2);
  const again = createBoard(store);
  assert.equal(again.topName('digdug'), 'DUSTIN', 'read back from storage');
  assert.equal(again.top('pacman')[2]?.name, 'WILL');
});

test('a broken save falls back to the starting boards', () => {
  const store = memoryStore();
  store.set('upside-down:arcade:v1', '{"digdug": [{"name": 3}], "galaga": "nope"');
  const b = createBoard(store);
  assert.equal(b.topName('digdug'), 'MADMAX');
  store.set('upside-down:arcade:v1', JSON.stringify({ digdug: [{ name: 'X', score: 'lots' }] }));
  assert.equal(createBoard(store).topName('digdug'), 'MADMAX');
});

test('only a Dig Dug score over MADMAX beats her', () => {
  const b = createBoard(memoryStore());
  assert.equal(postScore(b, 'digdug', 'LUCAS', MADMAX_SCORE).beatMadmax, false, 'a tie is not a win');
  const win = postScore(b, 'digdug', 'LUCAS', MADMAX_SCORE + 10);
  assert.equal(win.beatMadmax, true);
  assert.equal(win.rank, 0);
  assert.equal(postScore(b, 'centipede', 'LUCAS', 99999).beatMadmax, false);
});

// ---------------------------------------------------------------- Space
const pv = (id: string, kind: PropView['kind'], tx: number, ty: number, state: PropView['state'] = 'off', w = 16): PropView =>
  ({ id, kind, x: tx * 16, y: ty * 16, w, h: 16, state, t: 0 }) as PropView;

test('Space reaches the cabinet in front of the hero, and ignores lights already lit', () => {
  const props = [pv('cab8', 'arcade', 11, 4), pv('digdug', 'arcade', 12, 4), pv('lights_palace', 'lights', 3, 7, 'lit', 48)];
  // Feet just under Dig Dug's footprint, a little to the right of its middle.
  assert.equal(nearUsable(props, { x: 12 * 16 + 10, y: 5 * 16 + 6 })?.id, 'digdug');
  assert.equal(nearUsable(props, { x: 11 * 16 + 6, y: 5 * 16 + 6 })?.id, 'cab8');
  assert.equal(nearUsable(props, { x: 4 * 16, y: 6 * 16 + 12 }), null, 'lit lights do nothing');
  assert.equal(nearUsable(props, { x: 12 * 16 + 8, y: 5 * 16 + USE_REACH + 1 }), null, 'out of reach');
  const unlit = [pv('lights_palace', 'lights', 3, 7, 'off', 48)];
  assert.equal(nearUsable(unlit, { x: 4 * 16, y: 6 * 16 + 12 })?.id, 'lights_palace');
});

// ---------------------------------------------------------------- the prize
test('the bonus pays XP the usual way and adds quarters', () => {
  const sim = makeSim();
  const before = sim.party().map((p) => p.xp);
  sim.bonus(25, 5);
  const ev = sim.step({ mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, swapDelta: 0, swapTo: -1, burstPressed: false });
  assert.ok(ev.some((e) => e.t === 'sfx' && e.id === 'pickup'));
  assert.equal(sim.stats().xpEarned, 25);
  assert.equal(sim.stats().quarters, 5);
  const after = sim.party();
  assert.ok((after[0]?.xp ?? 0) > (before[0] ?? 0) || (after[0]?.level ?? 1) > 1, 'the active hero gets XP');
  assert.ok(sim.view().floaters.some((f) => f.text.includes('XP')));
});
