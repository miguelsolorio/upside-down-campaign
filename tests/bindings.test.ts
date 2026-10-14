import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  BIND_ROWS, DEFAULT_BINDINGS, SLOTS, actionsForCode, clearBinding, exportBindings, isReserved, keyLabel, keyText,
  getPromptDevice, keysOf, labelOf, levelHintLines, packLines, parseBindings, resetBindings, setBinding, setPromptDevice,
  slotKeyLabel, titleHintLines,
} from '../src/core/bindings.ts';

beforeEach(() => {
  resetBindings();
  setPromptDevice('keyboard');
});

const set = (codes: string[]): Set<string> => new Set(codes);

test('defaults give every key the actions the game shipped with', () => {
  assert.deepEqual(set(actionsForCode('KeyJ')), set(['attack', 'confirm']));
  assert.deepEqual(set(actionsForCode('KeyK')), set(['special', 'cancel']));
  assert.deepEqual(set(actionsForCode('Space')), set(['interact', 'confirm']));
  assert.deepEqual(set(actionsForCode('Enter')), set(['confirm', 'interact']));
  assert.deepEqual(set(actionsForCode('Escape')), set(['cancel', 'pause']));
  assert.deepEqual(actionsForCode('ArrowLeft'), ['left']);
  assert.ok(actionsForCode('KeyW').includes('up'));
  assert.ok(actionsForCode('Tab').includes('skip'));
  assert.ok(actionsForCode('KeyP').includes('pause'));
  assert.ok(actionsForCode('KeyM').includes('mute'));
  assert.deepEqual(actionsForCode('KeyH'), []);
});

test('every row has two default slots and the required ones start bound', () => {
  for (const row of BIND_ROWS) {
    assert.equal(DEFAULT_BINDINGS[row.action].length, SLOTS, row.action);
    if (row.required) assert.ok(keysOf(row.action).length >= 1, `${row.action} needs a default key`);
    assert.ok(row.label.length <= 14, `${row.label} must fit the label column`);
  }
});

test('rebinding moves the key and its confirm role with it', () => {
  const r = setBinding('attack', 0, 'KeyH');
  assert.equal(r.ok, true);
  assert.deepEqual(set(actionsForCode('KeyH')), set(['attack', 'confirm']));
  assert.deepEqual(actionsForCode('KeyJ'), []);
  assert.deepEqual(keysOf('attack'), ['KeyH', 'KeyZ']);
});

test('a key already in use is swapped into the slot it replaces', () => {
  const r = setBinding('attack', 0, 'KeyK');
  assert.equal(r.ok, true);
  assert.match(r.note, /SWAPPED WITH SPECIAL/);
  assert.deepEqual(set(actionsForCode('KeyK')), set(['attack', 'confirm']));
  assert.deepEqual(set(actionsForCode('KeyJ')), set(['special', 'cancel']));
});

test('taking a key into an empty slot leaves the other action one key short', () => {
  const r = setBinding('mute', 1, 'KeyU');
  assert.equal(r.ok, true);
  assert.match(r.note, /TAKEN FROM PARTY BURST/);
  assert.deepEqual(keysOf('burst'), ['KeyV']);
  assert.deepEqual(keysOf('mute'), ['KeyM', 'KeyU']);
});

test('required actions never lose their last key', () => {
  assert.equal(clearBinding('dash', 1).ok, true);
  const cleared = clearBinding('dash', 0);
  assert.equal(cleared.ok, false);
  assert.match(cleared.note, /DASH NEEDS A KEY/);
  const stolen = setBinding('mute', 1, 'KeyL');
  assert.equal(stolen.ok, false);
  assert.deepEqual(keysOf('dash'), ['KeyL']);
  assert.deepEqual(keysOf('mute'), ['KeyM']);
});

test('reserved keys are refused', () => {
  for (const code of ['Escape', 'Enter', 'ArrowUp', 'Backspace', 'ControlLeft', 'MetaLeft', 'F5', 'Delete', 'AltRight']) {
    assert.equal(isReserved(code), true, code);
    assert.equal(setBinding('attack', 0, code).ok, false, code);
  }
  assert.deepEqual(keysOf('attack'), ['KeyJ', 'KeyZ']);
  assert.equal(isReserved('KeyH'), false);
  assert.equal(isReserved('ShiftLeft'), false);
});

test('the same key in both slots of one action just swaps them', () => {
  const r = setBinding('attack', 1, 'KeyJ');
  assert.equal(r.ok, true);
  assert.deepEqual(exportBindings().attack, ['KeyZ', 'KeyJ']);
});

test('reset restores the defaults', () => {
  setBinding('attack', 0, 'KeyH');
  setBinding('mute', 1, 'KeyN');
  resetBindings();
  assert.deepEqual(exportBindings().attack, ['KeyJ', 'KeyZ']);
  assert.deepEqual(exportBindings().mute, ['KeyM', null]);
});

test('saved data is cleaned on the way in', () => {
  assert.deepEqual(parseBindings(null), exportBindings());
  assert.deepEqual(parseBindings('nonsense'), exportBindings());
  const cleaned = parseBindings({ attack: ['KeyH', 'Escape'], mute: ['KeyH', 'KeyN'], junk: 1 });
  assert.deepEqual(cleaned.attack, ['KeyH', null]);
  assert.deepEqual(cleaned.mute, [null, 'KeyN']);
  assert.deepEqual(cleaned.dash, ['KeyL', 'KeyC']);
  assert.deepEqual(parseBindings({ attack: [null, null] }), exportBindings());
  setBinding('swap2', 0, 'KeyN');
  assert.deepEqual(parseBindings(JSON.parse(JSON.stringify(exportBindings()))), exportBindings());
});

test('labels are short caps and fall back to the key that always works', () => {
  assert.equal(keyLabel('KeyJ'), 'J');
  assert.equal(keyLabel('Digit1'), '1');
  assert.equal(keyLabel('Space'), 'SPACE');
  assert.equal(keyLabel('ShiftLeft'), 'SHIFT');
  assert.equal(keyLabel('Numpad7'), 'NUM7');
  assert.equal(keyLabel('Semicolon'), ';');
  assert.equal(keyLabel(null), '--');
  assert.equal(labelOf('up'), 'W');
  clearBinding('up', 0);
  assert.equal(labelOf('up'), 'UP');
  clearBinding('interact', 0);
  assert.equal(labelOf('interact'), 'ENTER');
  clearBinding('skip', 0);
  assert.equal(labelOf('skip'), '--');
});

test('hint lines match the shipped text and follow a rebind', () => {
  assert.deepEqual(titleHintLines(), ['WASD MOVE  J ATTACK  K SPECIAL  L DASH', 'Q E SWAP  1-4 PICK  U BURST  ESC PAUSE']);
  assert.deepEqual(levelHintLines(), ['WASD MOVE  J ATTACK  K SPECIAL  L DASH', 'Q E SWAP  SPACE LIGHTS  ESC PAUSE']);
  setBinding('attack', 0, 'KeyH');
  assert.ok((titleHintLines()[0] as string).includes('H ATTACK'));
  setBinding('up', 0, 'KeyT');
  setBinding('left', 0, 'KeyF');
  setBinding('down', 0, 'KeyG');
  setBinding('right', 0, 'KeyB');
  assert.ok((titleHintLines()[0] as string).includes('TFGB MOVE'));
  setBinding('up', 0, 'ShiftLeft');
  assert.ok((titleHintLines()[0] as string).includes('ARROWS MOVE'));
  for (const line of [...titleHintLines(), ...levelHintLines()]) assert.ok(line.length <= 42, line);
});

test('packLines wraps at the limit and skips empties', () => {
  assert.deepEqual(packLines(['AAAA', 'BBBB', 'CCCC'], 10), ['AAAA  BBBB', 'CCCC']);
  assert.deepEqual(packLines(['AAAA', '', 'BBBB'], 40), ['AAAA  BBBB']);
  assert.deepEqual(packLines([], 10), []);
});

test('story key tokens fill in and follow rebinds', () => {
  assert.equal(keyText('Press {attack}.'), 'Press J.');
  assert.equal(keyText('{swap} cycle. Press {pick}.'), 'Q and E cycle. Press 1 to 4.');
  assert.equal(keyText('with {pick4}, {swapOr}'), 'with 4, Q or E');
  assert.equal(keyText('{move} to move'), 'WASD or the arrow keys to move');
  assert.equal(keyText('{nope} {constructor}'), '{nope} {constructor}');
  setBinding('attack', 0, 'KeyH');
  assert.equal(keyText('Press {attack}.'), 'Press H.');
  setBinding('swap1', 0, 'KeyN');
  assert.equal(keyText('{pick}'), 'N, 2, 3, 4');
});

test('hero slot labels prefer a one-character key, else the slot number', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => slotKeyLabel(n as 1 | 2 | 3 | 4)), ['1', '2', '3', '4']);
  setBinding('swap1', 0, 'KeyN');
  assert.equal(slotKeyLabel(1), 'N');
  setBinding('swap2', 0, 'ShiftLeft');
  assert.equal(slotKeyLabel(2), '2');
});

// ---------------------------------------------------------------- the controller's side of the prompts
test('the prompts speak keyboard until told otherwise', () => {
  assert.equal(getPromptDevice(), 'keyboard');
  setPromptDevice('gamepad');
  assert.equal(getPromptDevice(), 'gamepad');
});

test('no key ever sends start, so the controller is the only way to it', () => {
  for (const row of BIND_ROWS) for (const code of keysOf(row.action)) assert.ok(!actionsForCode(code).includes('start'), code);
  for (const code of ['Enter', 'Escape', 'Backspace', 'ArrowUp']) assert.ok(!actionsForCode(code).includes('start'), code);
});

test('a controller player sees button names, and a key rebind does not touch them', () => {
  setPromptDevice('gamepad');
  const names = { attack: 'A', special: 'X', dash: 'B', burst: 'Y', interact: 'A', swapPrev: 'LB', swapNext: 'RB', skip: 'VIEW', pause: 'START' } as const;
  for (const [action, name] of Object.entries(names)) assert.equal(labelOf(action as keyof typeof names), name, action);
  setBinding('attack', 0, 'KeyH');
  clearBinding('skip', 0);
  assert.equal(labelOf('attack'), 'A');
  assert.equal(labelOf('skip'), 'VIEW', 'a cleared key slot has no bearing on the button');
  setPromptDevice('keyboard');
  assert.equal(labelOf('attack'), 'H');
});

test('an action the controller cannot do keeps its key label', () => {
  setPromptDevice('gamepad');
  assert.equal(labelOf('mute'), 'M');
});

test('the hint strips name the buttons and drop the hero numbers', () => {
  setPromptDevice('gamepad');
  assert.deepEqual(titleHintLines(), ['STICK MOVE  A ATTACK  X SPECIAL  B DASH', 'LB RB SWAP  Y BURST  START PAUSE']);
  assert.deepEqual(levelHintLines(), ['STICK MOVE  A ATTACK  X SPECIAL  B DASH', 'LB RB SWAP  A LIGHTS  START PAUSE']);
  for (const line of [...titleHintLines(), ...levelHintLines()]) assert.ok(line.length <= 42, line);
});

test('the HUD shows slot numbers on a controller, whatever the keys are', () => {
  setBinding('swap1', 0, 'KeyN');
  setPromptDevice('gamepad');
  assert.deepEqual([1, 2, 3, 4].map((n) => slotKeyLabel(n as 1 | 2 | 3 | 4)), ['1', '2', '3', '4']);
});

test('story tokens read as buttons on a controller, and the pick-a-hero sentence drops out', () => {
  setPromptDevice('gamepad');
  assert.equal(keyText('Press {attack}.'), 'Press A.');
  assert.equal(keyText('{move} to move'), 'the stick or D-pad to move');
  assert.equal(keyText('{swap} cycle through us.{pickHint}'), 'LB and RB cycle through us.');
  assert.equal(keyText('Swap me in with {swapTo3}.'), 'Swap me in with LB or RB.');
  assert.equal(keyText('Swap her in with {swapTo4}.'), 'Swap her in with LB or RB.');
  assert.equal(keyText('press {burst}'), 'press Y');
});

test('the same story tokens still read as keys on a keyboard', () => {
  assert.equal(keyText('{swap} cycle through us.{pickHint}'), 'Q and E cycle through us. Or press 1 to 4 to pick.');
  assert.equal(keyText('Swap me in with {swapTo3}.'), 'Swap me in with 3, Q or E.');
  assert.equal(keyText('Swap her in with {swapTo4}.'), 'Swap her in with 4, Q or E.');
  setBinding('swap1', 0, 'KeyN');
  assert.equal(keyText('{pickHint}'), ' Or press N, 2, 3, 4 to pick.');
});
