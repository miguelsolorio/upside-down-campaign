// Key bindings: the defaults, the player's overrides, the conflict rules and the labels the UI shows.
// Pure TypeScript with no DOM, so Node tests can import it. Storage is wrapped and safe in Node.
import { storage } from './storage.ts';

export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'attack' | 'special' | 'dash' | 'swapPrev' | 'swapNext'
  | 'swap1' | 'swap2' | 'swap3' | 'swap4' | 'burst'
  | 'interact' | 'confirm' | 'cancel' | 'pause' | 'mute' | 'skip'
  /** Only a controller's Start button sends this, together with pause. The title uses it to begin. */
  | 'start';

/** The actions a player can rebind. confirm follows attack and interact. cancel follows special. */
export type BindAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'attack' | 'special' | 'dash' | 'swapPrev' | 'swapNext'
  | 'swap1' | 'swap2' | 'swap3' | 'swap4' | 'burst'
  | 'interact' | 'skip' | 'pause' | 'mute';

/** Keys per action. Each action has two slots, and a slot can be empty. */
export const SLOTS = 2;
export type Slots = (string | null)[];
export type Bindings = Record<BindAction, Slots>;

export interface BindRow { action: BindAction; label: string; /** Must always keep at least one key. */ required: boolean }

/** Display order for the controls screen. Labels are drawn in the caps font. */
export const BIND_ROWS: readonly BindRow[] = [
  { action: 'up', label: 'MOVE UP', required: false },
  { action: 'down', label: 'MOVE DOWN', required: false },
  { action: 'left', label: 'MOVE LEFT', required: false },
  { action: 'right', label: 'MOVE RIGHT', required: false },
  { action: 'attack', label: 'ATTACK', required: true },
  { action: 'special', label: 'SPECIAL', required: true },
  { action: 'dash', label: 'DASH', required: true },
  { action: 'swapPrev', label: 'SWAP BACK', required: false },
  { action: 'swapNext', label: 'SWAP NEXT', required: false },
  { action: 'swap1', label: 'HERO 1', required: false },
  { action: 'swap2', label: 'HERO 2', required: false },
  { action: 'swap3', label: 'HERO 3', required: false },
  { action: 'swap4', label: 'HERO 4', required: false },
  { action: 'burst', label: 'PARTY BURST', required: false },
  { action: 'interact', label: 'TALK OR LIGHT', required: false },
  { action: 'skip', label: 'SKIP DIALOGUE', required: false },
  { action: 'pause', label: 'PAUSE', required: false },
  { action: 'mute', label: 'MUTE', required: false },
];

export const DEFAULT_BINDINGS: Record<BindAction, readonly [string | null, string | null]> = {
  up: ['KeyW', null], down: ['KeyS', null], left: ['KeyA', null], right: ['KeyD', null],
  attack: ['KeyJ', 'KeyZ'], special: ['KeyK', 'KeyX'], dash: ['KeyL', 'KeyC'],
  swapPrev: ['KeyQ', null], swapNext: ['KeyE', null],
  swap1: ['Digit1', null], swap2: ['Digit2', null], swap3: ['Digit3', null], swap4: ['Digit4', null],
  burst: ['KeyU', 'KeyV'], interact: ['Space', null], skip: ['Tab', null], pause: ['KeyP', null], mute: ['KeyM', null],
};

/** Keys that always work and can't be rebound: menu navigation and the way out of anything. */
const SYSTEM: Record<string, Action[]> = {
  ArrowUp: ['up'], ArrowDown: ['down'], ArrowLeft: ['left'], ArrowRight: ['right'],
  Enter: ['confirm', 'interact'],
  Escape: ['cancel', 'pause'],
  Backspace: ['cancel'],
};

/** Browser shortcuts and keys the controls screen uses itself. */
const NOT_BINDABLE = /^(Meta|Control|Alt|OS)(Left|Right)$|^F\d{1,2}$|^(ContextMenu|Delete|Insert|Home|End|PageUp|PageDown|CapsLock|NumLock|ScrollLock|Pause|PrintScreen)$/;

export function isReserved(code: string): boolean {
  return Object.hasOwn(SYSTEM, code) || NOT_BINDABLE.test(code);
}

function cloneDefaults(): Bindings {
  const out = {} as Bindings;
  for (const row of BIND_ROWS) out[row.action] = [...DEFAULT_BINDINGS[row.action]];
  return out;
}

let current: Bindings = cloneDefaults();
let cache: Map<string, Action[]> | null = null;
const STORE_KEY = 'upside-down:keys:v1';

export function rowLabel(action: BindAction): string {
  return BIND_ROWS.find((r) => r.action === action)?.label ?? action.toUpperCase();
}
function isRequired(action: BindAction): boolean {
  return BIND_ROWS.find((r) => r.action === action)?.required ?? false;
}

export function getBinding(action: BindAction): readonly (string | null)[] {
  return current[action];
}
export function keysOf(action: BindAction): string[] {
  return current[action].filter((c): c is string => c !== null);
}
export function exportBindings(): Bindings {
  const out = {} as Bindings;
  for (const row of BIND_ROWS) out[row.action] = [...current[row.action]];
  return out;
}

// ---------------------------------------------------------------- code to actions
function buildCache(): Map<string, Action[]> {
  const m = new Map<string, Action[]>();
  const add = (code: string, a: Action): void => {
    const list = m.get(code);
    if (!list) m.set(code, [a]);
    else if (!list.includes(a)) list.push(a);
  };
  for (const [code, acts] of Object.entries(SYSTEM)) for (const a of acts) add(code, a);
  for (const row of BIND_ROWS) {
    for (const code of keysOf(row.action)) {
      add(code, row.action);
      if (row.action === 'attack' || row.action === 'interact') add(code, 'confirm');
      if (row.action === 'special') add(code, 'cancel');
    }
  }
  return m;
}

/** Every action a physical key triggers right now: the fixed system keys plus the player's bindings. */
export function actionsForCode(code: string): Action[] {
  if (!cache) cache = buildCache();
  return cache.get(code) ?? [];
}

// ---------------------------------------------------------------- editing
export interface BindResult { ok: boolean; note: string }

function findCell(code: string, skipAction: BindAction, skipSlot: number): { action: BindAction; slot: number } | null {
  for (const row of BIND_ROWS) {
    for (let s = 0; s < SLOTS; s++) {
      if (row.action === skipAction && s === skipSlot) continue;
      if (current[row.action][s] === code) return { action: row.action, slot: s };
    }
  }
  return null;
}

function changed(): void {
  cache = null;
  storage.set(STORE_KEY, JSON.stringify(current));
}

/**
 * Puts a key on one slot of an action. A key already used elsewhere is swapped into the slot being replaced,
 * so nothing is left without a key unless the slot was empty. Required actions never lose their last key.
 */
export function setBinding(action: BindAction, slot: number, code: string): BindResult {
  if (isReserved(code)) return { ok: false, note: `${keyLabel(code)} IS RESERVED` };
  const mine = current[action];
  if (mine[slot] === code) return { ok: true, note: `${keyLabel(code)} IS ALREADY SET` };
  const old = mine[slot] ?? null;
  const other = findCell(code, action, slot);
  let note = `${keyLabel(code)} SET FOR ${rowLabel(action)}`;
  if (other) {
    if (other.action !== action && old === null && isRequired(other.action) && keysOf(other.action).length === 1) {
      return { ok: false, note: `${rowLabel(other.action)} NEEDS A KEY` };
    }
    current[other.action][other.slot] = old;
    if (other.action === action) note = old ? `${keyLabel(code)} AND ${keyLabel(old)} SWAPPED` : `${keyLabel(code)} MOVED`;
    else note = old ? `${keyLabel(code)} SWAPPED WITH ${rowLabel(other.action)}` : `${keyLabel(code)} TAKEN FROM ${rowLabel(other.action)}`;
  }
  mine[slot] = code;
  changed();
  return { ok: true, note };
}

export function clearBinding(action: BindAction, slot: number): BindResult {
  const mine = current[action];
  const was = mine[slot] ?? null;
  if (was === null) return { ok: true, note: 'THAT SLOT IS EMPTY' };
  if (isRequired(action) && keysOf(action).length === 1) return { ok: false, note: `${rowLabel(action)} NEEDS A KEY` };
  mine[slot] = null;
  changed();
  return { ok: true, note: `${keyLabel(was)} CLEARED FROM ${rowLabel(action)}` };
}

export function resetBindings(): void {
  current = cloneDefaults();
  changed();
}

// ---------------------------------------------------------------- saving
/** Cleans saved data: unknown or reserved keys drop, a repeated key keeps its first owner, damaged data means defaults. */
export function parseBindings(data: unknown): Bindings {
  const src = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const out = {} as Bindings;
  const used = new Set<string>();
  for (const row of BIND_ROWS) {
    const raw = src[row.action];
    const base: readonly unknown[] = Array.isArray(raw) ? raw : DEFAULT_BINDINGS[row.action];
    const slots: Slots = [];
    for (let s = 0; s < SLOTS; s++) {
      const c = base[s];
      if (typeof c === 'string' && !isReserved(c) && !used.has(c)) { slots.push(c); used.add(c); } else slots.push(null);
    }
    out[row.action] = slots;
  }
  for (const row of BIND_ROWS) if (row.required && !out[row.action].some((c) => c !== null)) return cloneDefaults();
  return out;
}

export function loadBindings(): void {
  const raw = storage.get(STORE_KEY);
  cache = null;
  if (!raw) { current = cloneDefaults(); return; }
  try { current = parseBindings(JSON.parse(raw)); } catch { current = cloneDefaults(); }
}

// ---------------------------------------------------------------- labels
const NAMED: Record<string, string> = {
  Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP',
  ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT',
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=',
  BracketLeft: 'LBRKT', BracketRight: 'RBRKT', Backslash: 'BSLSH', IntlBackslash: 'BSLSH', Backquote: 'TICK',
  NumpadAdd: 'NUM+', NumpadSubtract: 'NUM-', NumpadMultiply: 'NUMMUL', NumpadDivide: 'NUM/',
  NumpadDecimal: 'NUM.', NumpadEnter: 'NUMENT',
};

/** A short caps label for a physical key, drawn in the 5x7 font. An empty slot reads "--". */
export function keyLabel(code: string | null): string {
  if (!code) return '--';
  const named = NAMED[code];
  if (named) return named;
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1] as string;
  m = /^Digit(\d)$/.exec(code);
  if (m) return m[1] as string;
  m = /^Numpad(\d)$/.exec(code);
  if (m) return `NUM${m[1]}`;
  return code.toUpperCase().slice(0, 6);
}

// ---------------------------------------------------------------- which device the prompts speak for
export type PromptDevice = 'keyboard' | 'gamepad';
let promptDevice: PromptDevice = 'keyboard';

/** Every hint, token and label below follows this. The main loop sets it from whichever device was touched last. */
export function setPromptDevice(d: PromptDevice): void {
  promptDevice = d;
}
export function getPromptDevice(): PromptDevice {
  return promptDevice;
}
const onPad = (): boolean => promptDevice === 'gamepad';

/** The Xbox face for each action a controller can do. These are fixed, so a key rebind never touches them. */
const PAD_LABEL: Partial<Record<BindAction, string>> = {
  attack: 'A', special: 'X', dash: 'B', swapPrev: 'LB', swapNext: 'RB', burst: 'Y',
  interact: 'A', skip: 'VIEW', pause: 'START',
};

/** What to show for an action: its first key, or the fixed key that always works for it. A controller shows its button. */
const FALLBACK: Partial<Record<BindAction, string>> = {
  up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', interact: 'ENTER', pause: 'ESC',
};
export function labelOf(action: BindAction): string {
  const button = onPad() ? PAD_LABEL[action] : undefined;
  if (button) return button;
  const first = keysOf(action)[0];
  return first ? keyLabel(first) : (FALLBACK[action] ?? '--');
}

/** The key printed next to a bench hero in the HUD: the key if it's one character, else the slot number. */
export function slotKeyLabel(n: 1 | 2 | 3 | 4): string {
  if (onPad()) return String(n);
  const l = labelOf(`swap${n}` as BindAction);
  return l.length === 1 ? l : String(n);
}

function moveLabel(): string {
  if (onPad()) return 'STICK';
  const ls = (['up', 'left', 'down', 'right'] as const).map((a) => {
    const k = keysOf(a)[0];
    return k ? keyLabel(k) : '';
  });
  return ls.every((l) => l.length === 1) ? ls.join('') : 'ARROWS';
}
function pickLabels(): string[] {
  return (['swap1', 'swap2', 'swap3', 'swap4'] as const).map(labelOf);
}

/** Greedy line packing for the hint strips. */
export function packLines(items: string[], max = 42, gap = '  '): string[] {
  const lines: string[] = [];
  let line = '';
  for (const it of items) {
    if (!it) continue;
    if (!line) line = it;
    else if (line.length + gap.length + it.length <= max) line += gap + it;
    else { lines.push(line); line = it; }
  }
  if (line) lines.push(line);
  return lines;
}

/** The controls reminder on the title screen. */
export function titleHintLines(max = 42): string[] {
  const picks = pickLabels();
  return packLines([
    `${moveLabel()} MOVE`, `${labelOf('attack')} ATTACK`, `${labelOf('special')} SPECIAL`, `${labelOf('dash')} DASH`,
    `${labelOf('swapPrev')} ${labelOf('swapNext')} SWAP`,
    // A controller has no direct pick: the bumpers are the only way to swap.
    onPad() ? '' : `${picks.join('') === '1234' ? '1-4' : picks.join(' ')} PICK`,
    `${labelOf('burst')} BURST`, `${onPad() ? labelOf('pause') : 'ESC'} PAUSE`,
  ], max);
}

/** The controls reminder shown over the level when the story is skipped. */
export function levelHintLines(max = 42): string[] {
  return packLines([
    `${moveLabel()} MOVE`, `${labelOf('attack')} ATTACK`, `${labelOf('special')} SPECIAL`, `${labelOf('dash')} DASH`,
    `${labelOf('swapPrev')} ${labelOf('swapNext')} SWAP`, `${labelOf('interact')} LIGHTS`, `${onPad() ? labelOf('pause') : 'ESC'} PAUSE`,
  ], max);
}

// Story lines name keys with {tokens}, so a tutorial stays true after a rebind.
// A controller player gets button names instead, and the lines that mention picking a hero by number drop that part.
const swapOr = (): string => `${labelOf('swapPrev')} or ${labelOf('swapNext')}`;
const swapTo = (n: 2 | 3 | 4): string => (onPad() ? swapOr() : `${labelOf(`swap${n}`)}, ${swapOr()}`);
const TOKENS: Record<string, () => string> = {
  move: () => {
    if (onPad()) return 'the stick or D-pad';
    const m = moveLabel();
    return m === 'ARROWS' ? 'the arrow keys' : `${m} or the arrow keys`;
  },
  attack: () => labelOf('attack'),
  special: () => labelOf('special'),
  dash: () => labelOf('dash'),
  burst: () => labelOf('burst'),
  interact: () => labelOf('interact'),
  skip: () => labelOf('skip'),
  swap: () => `${labelOf('swapPrev')} and ${labelOf('swapNext')}`,
  swapOr,
  pick: () => { const p = pickLabels(); return p.join('') === '1234' ? '1 to 4' : p.join(', '); },
  pick2: () => labelOf('swap2'),
  pick3: () => labelOf('swap3'),
  pick4: () => labelOf('swap4'),
  /** "3, Q or E" on a keyboard, "LB or RB" on a controller. */
  swapTo2: () => swapTo(2),
  swapTo3: () => swapTo(3),
  swapTo4: () => swapTo(4),
  /** A whole closing sentence, so a controller line can leave it out. Starts with a space. */
  pickHint: () => {
    if (onPad()) return '';
    const p = pickLabels();
    return ` Or press ${p.join('') === '1234' ? '1 to 4' : p.join(', ')} to pick.`;
  },
};

/** Fills {attack}, {move} and the other key tokens in a line of dialogue. Unknown tokens stay as written. */
export function keyText(text: string): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (Object.hasOwn(TOKENS, name) ? (TOKENS[name] as () => string)() : whole));
}
