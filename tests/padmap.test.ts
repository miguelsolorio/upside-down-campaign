// Controller bindings: the defaults match the layout the game shipped with, a rebind swaps on a conflict, A and B stay
// fixed so a menu can't get stuck, saved data is cleaned, and the hints and the reader follow the player's buttons.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PAD, DEFAULT_PAD_MAP, PAD_BUTTONS, PAD_FIXED, PAD_ROWS, PAD_SLOTS, buildPadMap, buttonsOf, clearPadBinding, currentPadMap,
  exportPadBinds, getPadBinding, loadPadBindings, maskedMap, padButtonLabel, parsePadBinds, resetPadBindings, setPadBinding,
} from '../src/core/padmap.ts';
import type { PadAction, PadBinds, PadBtn } from '../src/core/padmap.ts';
import { controlRows, keyText, labelOf, loadBindings, setPromptDevice } from '../src/core/bindings.ts';
import type { Action } from '../src/core/bindings.ts';
import { BTN, readPad } from '../src/core/gamepad.ts';
import type { PadLike } from '../src/core/gamepad.ts';

/** A stand-in for localStorage, so a save can be read back. */
let store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  configurable: true,
});

beforeEach(() => {
  store = new Map();
  resetPadBindings();
  setPromptDevice('keyboard');
});

function pad(held: Record<number, number> = {}, axes: number[] = [0, 0]): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: (held[i] ?? 0) > 0.5, value: held[i] ?? 0 }));
  return { buttons, axes, mapping: 'standard', connected: true };
}
const acts = (p: PadLike, map = currentPadMap()): Action[] => [...readPad(p, new Set(), map).actions].sort();
const at = (b: PadBtn): number => PAD_BUTTONS.indexOf(b);

// ---------------------------------------------------------------- defaults
test('the eight buttons are the standard mapping\'s first eight, in order', () => {
  assert.deepEqual([...PAD_BUTTONS], ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT']);
  assert.deepEqual(PAD_BUTTONS.map((b) => at(b)), [BTN.A, BTN.B, BTN.X, BTN.Y, BTN.LB, BTN.RB, BTN.LT, BTN.RT]);
});

test('the defaults are the layout the game shipped with', () => {
  assert.deepEqual(DEFAULT_PAD_MAP.map((a) => [...a].sort()), [
    ['attack', 'confirm', 'interact'], ['cancel'], ['special'], ['burst'], ['swapPrev'], ['swapNext'], [], ['attack'],
  ]);
  assert.deepEqual(acts(pad({ [BTN.A]: 1 })), ['attack', 'confirm', 'interact']);
  assert.deepEqual(acts(pad({ [BTN.RT]: 0.9 })), ['attack']);
  assert.deepEqual(acts(pad({ [BTN.LT]: 1 })), []);
  assert.deepEqual(exportPadBinds().attack, ['A', 'RT']);
});

test('every action has a row and keeps at least one button out of the box', () => {
  assert.deepEqual(PAD_ROWS.map((r) => r.action), ['attack', 'special', 'swapPrev', 'swapNext', 'burst']);
  for (const row of PAD_ROWS) assert.ok(buttonsOf(row.action).length >= 1, row.action);
  assert.equal(PAD_SLOTS, 2);
});

// ---------------------------------------------------------------- editing
test('a button goes on a slot, and the slot it left is free', () => {
  assert.deepEqual(setPadBinding('special', 1, 'LT'), { ok: true, note: 'LT SET FOR SPECIAL' });
  assert.deepEqual(getPadBinding('special'), ['X', 'LT']);
  assert.deepEqual(acts(pad({ [BTN.LT]: 1 })), ['special']);
  assert.deepEqual(setPadBinding('special', 0, 'LT'), { ok: true, note: 'LT AND X SWAPPED' }, 'inside one action the two slots trade');
  assert.deepEqual(getPadBinding('special'), ['LT', 'X']);
});

test('a button already used elsewhere swaps into the slot being replaced', () => {
  const r = setPadBinding('special', 0, 'Y');
  assert.deepEqual(r, { ok: true, note: 'Y SWAPPED WITH CRIT' });
  assert.deepEqual(getPadBinding('special'), ['Y', null]);
  assert.deepEqual(getPadBinding('burst'), ['X', null]);
  assert.deepEqual(acts(pad({ [BTN.Y]: 1 })), ['special']);
  assert.deepEqual(acts(pad({ [BTN.X]: 1 })), ['burst']);
});

test('a button taken into an empty slot leaves the other action a button, or the move is refused', () => {
  // ATTACK has two, so RT can be taken for SPECIAL's empty second slot and ATTACK keeps A.
  assert.deepEqual(setPadBinding('special', 1, 'RT'), { ok: true, note: 'RT TAKEN FROM ATTACK' });
  assert.deepEqual(getPadBinding('attack'), ['A', null]);
  // Now A is ATTACK's last button, so it can't be taken into an empty slot.
  assert.deepEqual(setPadBinding('swapPrev', 1, 'A'), { ok: false, note: 'ATTACK NEEDS A BUTTON' });
  assert.deepEqual(getPadBinding('attack'), ['A', null]);
  assert.deepEqual(getPadBinding('swapPrev'), ['LB', null]);
});

test('setting what is already there changes nothing', () => {
  assert.deepEqual(setPadBinding('burst', 0, 'Y'), { ok: true, note: 'Y IS ALREADY SET' });
});

test('an action never loses its last button, and a second slot can be cleared', () => {
  assert.deepEqual(clearPadBinding('burst', 0), { ok: false, note: 'CRIT NEEDS A BUTTON' });
  assert.deepEqual(clearPadBinding('burst', 1), { ok: true, note: 'THAT SLOT IS EMPTY' });
  assert.deepEqual(clearPadBinding('attack', 1), { ok: true, note: 'RT CLEARED FROM ATTACK' });
  assert.deepEqual(getPadBinding('attack'), ['A', null]);
  assert.deepEqual(acts(pad({ [BTN.RT]: 1 })), []);
});

test('reset restores the layout', () => {
  setPadBinding('attack', 0, 'LT');
  setPadBinding('special', 0, 'RT');
  resetPadBindings();
  assert.deepEqual(exportPadBinds(), parsePadBinds(null));
  assert.deepEqual(acts(pad({ [BTN.A]: 1 })), ['attack', 'confirm', 'interact']);
});

// ---------------------------------------------------------------- the fixed buttons
test('A confirms and uses and B backs out, whatever the player binds', () => {
  assert.deepEqual(PAD_FIXED.A, ['confirm', 'interact']);
  assert.deepEqual(PAD_FIXED.B, ['cancel']);
  // Take ATTACK off A, and put SPECIAL on B.
  setPadBinding('attack', 0, 'LT');
  setPadBinding('special', 1, 'B');
  assert.deepEqual(acts(pad({ [BTN.A]: 1 })), ['confirm', 'interact'], 'A still confirms, no longer attacks');
  assert.deepEqual(acts(pad({ [BTN.B]: 1 })), ['cancel', 'special'], 'B still backs out, and now casts');
  assert.deepEqual(acts(pad({ [BTN.LT]: 1 })), ['attack']);
});

test('no sequence of rebinds can take confirm or cancel off A and B', () => {
  const moves: [PadAction, number, PadBtn][] = [];
  for (const row of PAD_ROWS) for (let s = 0; s < PAD_SLOTS; s++) for (const b of PAD_BUTTONS) moves.push([row.action, s, b]);
  // A fixed pseudo-random walk over every action, slot and button.
  let seed = 7;
  for (let n = 0; n < 400; n++) {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    const [a, s, b] = moves[seed % moves.length] as [PadAction, number, PadBtn];
    if (seed % 5 === 0) clearPadBinding(a, s); else setPadBinding(a, s, b);
    const map = currentPadMap();
    assert.ok(map[at('A')]?.includes('confirm') && map[at('A')]?.includes('interact'), `A after ${n} moves`);
    assert.ok(map[at('B')]?.includes('cancel'), `B after ${n} moves`);
    for (const row of PAD_ROWS) assert.ok(buttonsOf(row.action).length >= 1, `${row.action} after ${n} moves`);
    // No button carries two of the player's actions.
    const used = PAD_ROWS.flatMap((r) => buttonsOf(r.action));
    assert.equal(new Set(used).size, used.length, 'a button is bound once');
  }
});

test('confirm and cancel come from A and B alone, so a trigger can never push through a menu', () => {
  setPadBinding('attack', 1, 'LT');
  for (const b of PAD_BUTTONS) {
    const list = currentPadMap()[at(b)] ?? [];
    if (b !== 'A') assert.ok(!list.includes('confirm'), `${b} confirms`);
    if (b !== 'B') assert.ok(!list.includes('cancel'), `${b} cancels`);
  }
});

test('the stick, the D-pad, View and Start are not rebindable and read as before', () => {
  setPadBinding('attack', 0, 'LT');
  assert.deepEqual(acts(pad({ [BTN.MENU]: 1 })), ['pause', 'start']);
  assert.deepEqual(acts(pad({ [BTN.VIEW]: 1 })), ['skip']);
  assert.deepEqual(acts(pad({ [BTN.UP]: 1 })), ['up']);
  assert.deepEqual(acts(pad({}, [0.9, 0])), ['right']);
});

// ---------------------------------------------------------------- the reader
test('a rebind moves the action to the new button, and a trigger counts past half a pull', () => {
  // RT was ATTACK's second button, so SWAP NEXT takes it and RB goes to ATTACK in the swap.
  assert.deepEqual(setPadBinding('swapNext', 0, 'RT'), { ok: true, note: 'RT SWAPPED WITH ATTACK' });
  assert.deepEqual(getPadBinding('attack'), ['A', 'RB']);
  assert.deepEqual(acts(pad({ [BTN.RT]: 0.8 })), ['swapNext']);
  assert.deepEqual(acts(pad({ [BTN.RT]: 0.3 })), [], 'a light pull is nothing');
  assert.deepEqual(acts(pad({ [BTN.RB]: 1 })), ['attack']);
});

test('the touch controls read with the factory layout, whatever the controller is set to', () => {
  setPadBinding('attack', 0, 'LT');
  setPadBinding('special', 0, 'RT');
  // readPad without a map is what touch uses.
  assert.deepEqual([...readPad(pad({ [BTN.A]: 1 })).actions].sort(), ['attack', 'confirm', 'interact']);
  assert.deepEqual([...readPad(pad({ [BTN.X]: 1 })).actions], ['special']);
});

test('a masked map silences just those buttons', () => {
  const m = maskedMap(currentPadMap(), new Set([at('A'), at('RT')]));
  assert.deepEqual(m[at('A')], []);
  assert.deepEqual(m[at('RT')], []);
  assert.deepEqual(m[at('X')], ['special']);
  assert.deepEqual(m[at('B')], ['cancel']);
  assert.equal(currentPadMap()[at('A')]?.includes('attack'), true, 'the real map is untouched');
});

// ---------------------------------------------------------------- saving
test('bindings are saved per browser and read back', () => {
  setPadBinding('attack', 0, 'LT');
  setPadBinding('special', 1, 'RB');
  assert.ok(store.has('upside-down:pad:v1'));
  const saved = exportPadBinds();
  resetPadBindings();
  store.set('upside-down:pad:v1', JSON.stringify(saved));
  loadPadBindings();
  assert.deepEqual(exportPadBinds(), saved);
  assert.deepEqual(acts(pad({ [BTN.LT]: 1 })), ['attack']);
});

test('loading the key bindings loads the controller ones with them', () => {
  store.set('upside-down:pad:v1', JSON.stringify({ attack: ['RT', null], special: ['LT', null] }));
  loadBindings();
  assert.deepEqual(getPadBinding('attack'), ['RT', null]);
  assert.deepEqual(getPadBinding('special'), ['LT', null]);
});

test('saved data is cleaned: unknown buttons drop, a repeat keeps its first owner, a missing action gets its defaults', () => {
  const clean = parsePadBinds({ attack: ['A', 'A'], special: ['Z', 'X'], swapPrev: 'LB', burst: ['X', 'Y'] });
  assert.deepEqual(clean.attack, ['A', null], 'A is used once');
  assert.deepEqual(clean.special, [null, 'X'], 'Z is no button');
  assert.deepEqual(clean.swapPrev, ['LB', null], 'not a list: the default');
  assert.deepEqual(clean.swapNext, ['RB', null], 'missing: the default');
  assert.deepEqual(clean.burst, [null, 'Y'], 'X belongs to SPECIAL already');
});

test('damaged saved data, or an action left with no button, means the defaults', () => {
  const defaults: PadBinds = { attack: ['A', 'RT'], special: ['X', null], swapPrev: ['LB', null], swapNext: ['RB', null], burst: ['Y', null] };
  assert.deepEqual(parsePadBinds({ swapNext: [3, null] }), defaults, 'nothing valid left on SWAP NEXT');
  for (const junk of [null, undefined, 'x', 7, [], {}]) assert.deepEqual(parsePadBinds(junk), defaults);
  store.set('upside-down:pad:v1', '{not json');
  loadPadBindings();
  assert.deepEqual(exportPadBinds(), defaults);
  for (const row of PAD_ROWS) assert.deepEqual(getPadBinding(row.action), DEFAULT_PAD[row.action]);
});

// ---------------------------------------------------------------- the prompts
test('the prompts name the buttons the player chose, and only for a controller', () => {
  setPadBinding('swapPrev', 0, 'LT');
  setPadBinding('attack', 0, 'X');   // X and A trade: SPECIAL lands on A
  setPromptDevice('gamepad');
  assert.equal(labelOf('attack'), 'X');
  assert.equal(labelOf('special'), 'A');
  assert.equal(labelOf('swapPrev'), 'LT');
  assert.equal(labelOf('burst'), 'Y');
  assert.deepEqual(controlRows(), [
    { keys: 'X', what: 'ATTACK' }, { keys: 'A', what: 'SPECIAL' }, { keys: 'LT RB', what: 'SWAP' },
  ]);
  assert.equal(keyText('Press {attack}, then {special}. {swap} change heroes.'), 'Press X, then A. LT and RB change heroes.');
  assert.equal(keyText('{swapOr}'), 'LT or RB');
  setPromptDevice('keyboard');
  assert.equal(labelOf('attack'), 'Z', 'keys are untouched');
  assert.equal(keyText('{attack}'), 'Z');
  setPromptDevice('touch');
  assert.equal(labelOf('attack'), 'A', 'the Game Boy is untouched');
});

test('the buttons that never move are always named', () => {
  setPadBinding('attack', 0, 'LT');
  setPromptDevice('gamepad');
  assert.equal(labelOf('interact'), 'A');
  assert.equal(labelOf('skip'), 'VIEW');
  assert.equal(labelOf('pause'), 'START');
  assert.equal(padButtonLabel('mute'), undefined, 'an action with no button falls through to its key');
  assert.equal(labelOf('mute'), 'M');
  assert.equal(padButtonLabel('swap1'), undefined);
});

test('buildPadMap is pure: the same bindings make the same map', () => {
  const b = exportPadBinds();
  assert.deepEqual(buildPadMap(b), buildPadMap(b));
  assert.deepEqual(buildPadMap(b), currentPadMap());
});
