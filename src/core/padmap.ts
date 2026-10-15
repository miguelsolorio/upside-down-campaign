// Controller button bindings: the defaults, the player's overrides, the conflict rules and the labels the UI shows.
// The pad twin of bindings.ts, kept in its own file so each stays under the size cap. Pure TypeScript with no DOM, so
// Node tests can import it. The eight buttons below are the standard mapping's first eight, so a button's position in
// PAD_BUTTONS is its index on the pad. The stick, the D-pad, View and Start aren't here: they're fixed (gamepad.ts).
import { storage } from './storage.ts';
import type { Action, BindResult } from './bindings.ts';

export const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'] as const;
export type PadBtn = (typeof PAD_BUTTONS)[number];

/** The actions a controller can rebind. Every one keeps at least one button, since a pad has no other way to do it. */
export type PadAction = 'attack' | 'special' | 'swapPrev' | 'swapNext' | 'burst';

/** Buttons per action. Like the keys, each action has two slots and the second can be empty. */
export const PAD_SLOTS = 2;
export type PadSlots = (PadBtn | null)[];
export type PadBinds = Record<PadAction, PadSlots>;

/** What each button does in a given tick: Action lists indexed by button, 0 to 7. */
export type PadMap = readonly (readonly Action[])[];

/** Display order for the controller page. Labels are drawn in the caps font. */
export const PAD_ROWS: readonly { action: PadAction; label: string }[] = [
  { action: 'attack', label: 'ATTACK' },
  { action: 'special', label: 'SPECIAL' },
  { action: 'swapPrev', label: 'SWAP BACK' },
  { action: 'swapNext', label: 'SWAP NEXT' },
  { action: 'burst', label: 'CRIT' },
];

export const DEFAULT_PAD: Record<PadAction, readonly [PadBtn | null, PadBtn | null]> = {
  attack: ['A', 'RT'], special: ['X', null], swapPrev: ['LB', null], swapNext: ['RB', null], burst: ['Y', null],
};

/**
 * Buttons that always do these, whatever is bound, so a menu can never get stuck: A confirms and uses, B backs out.
 * The keyboard's Enter and Escape are fixed the same way. A and B can still carry a move on top (A attacks by default).
 */
export const PAD_FIXED: Partial<Record<PadBtn, readonly Action[]>> = { A: ['confirm', 'interact'], B: ['cancel'] };

/** What a button name means as text. A trigger is a button here too. */
export const padLabel = (b: PadBtn | null): string => b ?? '--';

const isPadBtn = (v: unknown): v is PadBtn => typeof v === 'string' && (PAD_BUTTONS as readonly string[]).includes(v);
export const padIndex = (b: PadBtn): number => PAD_BUTTONS.indexOf(b);

function cloneDefaults(): PadBinds {
  const out = {} as PadBinds;
  for (const row of PAD_ROWS) out[row.action] = [...DEFAULT_PAD[row.action]];
  return out;
}

/** The Action list for every button, from a set of bindings. The fixed menu actions come first. */
export function buildPadMap(binds: PadBinds): PadMap {
  const map: Action[][] = PAD_BUTTONS.map((b) => [...(PAD_FIXED[b] ?? [])]);
  for (const row of PAD_ROWS) {
    for (const b of binds[row.action]) {
      if (!b) continue;
      const list = map[padIndex(b)] as Action[];
      if (!list.includes(row.action)) list.push(row.action);
    }
  }
  return map;
}

/** The layout out of the box, and the one the on-screen Game Boy always uses. */
export const DEFAULT_PAD_MAP: PadMap = buildPadMap(cloneDefaults());

/** The same map with some buttons silent. Used while waiting for a button to bind, and until that button is let go. */
export function maskedMap(map: PadMap, silent: ReadonlySet<number>): PadMap {
  return map.map((acts, i) => (silent.has(i) ? [] : acts));
}

let current: PadBinds = cloneDefaults();
let cache: PadMap | null = null;
const STORE_KEY = 'upside-down:pad:v1';

export function padRowLabel(action: PadAction): string {
  return PAD_ROWS.find((r) => r.action === action)?.label ?? action.toUpperCase();
}
export function isPadAction(a: string): a is PadAction {
  return PAD_ROWS.some((r) => r.action === a);
}
export function getPadBinding(action: PadAction): readonly (PadBtn | null)[] {
  return current[action];
}
export function buttonsOf(action: PadAction): PadBtn[] {
  return current[action].filter((b): b is PadBtn => b !== null);
}
export function exportPadBinds(): PadBinds {
  const out = {} as PadBinds;
  for (const row of PAD_ROWS) out[row.action] = [...current[row.action]];
  return out;
}

/** The map the pad reader uses right now. Cached until a binding changes. */
export function currentPadMap(): PadMap {
  if (!cache) cache = buildPadMap(current);
  return cache;
}

// ---------------------------------------------------------------- editing
function findCell(b: PadBtn, skipAction: PadAction, skipSlot: number): { action: PadAction; slot: number } | null {
  for (const row of PAD_ROWS) {
    for (let s = 0; s < PAD_SLOTS; s++) {
      if (row.action === skipAction && s === skipSlot) continue;
      if (current[row.action][s] === b) return { action: row.action, slot: s };
    }
  }
  return null;
}

function changed(): void {
  cache = null;
  storage.set(STORE_KEY, JSON.stringify(current));
}

/**
 * Puts a button on one slot of an action. A button already used elsewhere is swapped into the slot being replaced, so
 * nothing is left without a button unless the slot was empty. An action never loses its last button.
 */
export function setPadBinding(action: PadAction, slot: number, b: PadBtn): BindResult {
  const mine = current[action];
  if (mine[slot] === b) return { ok: true, note: `${b} IS ALREADY SET` };
  const old = mine[slot] ?? null;
  const other = findCell(b, action, slot);
  let note = `${b} SET FOR ${padRowLabel(action)}`;
  if (other) {
    if (other.action !== action && old === null && buttonsOf(other.action).length === 1) {
      return { ok: false, note: `${padRowLabel(other.action)} NEEDS A BUTTON` };
    }
    current[other.action][other.slot] = old;
    if (other.action === action) note = old ? `${b} AND ${old} SWAPPED` : `${b} MOVED`;
    else note = old ? `${b} SWAPPED WITH ${padRowLabel(other.action)}` : `${b} TAKEN FROM ${padRowLabel(other.action)}`;
  }
  mine[slot] = b;
  changed();
  return { ok: true, note };
}

export function clearPadBinding(action: PadAction, slot: number): BindResult {
  const mine = current[action];
  const was = mine[slot] ?? null;
  if (was === null) return { ok: true, note: 'THAT SLOT IS EMPTY' };
  if (buttonsOf(action).length === 1) return { ok: false, note: `${padRowLabel(action)} NEEDS A BUTTON` };
  mine[slot] = null;
  changed();
  return { ok: true, note: `${was} CLEARED FROM ${padRowLabel(action)}` };
}

export function resetPadBindings(): void {
  current = cloneDefaults();
  changed();
}

// ---------------------------------------------------------------- saving
/** Cleans saved data: unknown buttons drop, a repeated button keeps its first owner, damaged data means defaults. */
export function parsePadBinds(data: unknown): PadBinds {
  const src = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const out = {} as PadBinds;
  const used = new Set<PadBtn>();
  for (const row of PAD_ROWS) {
    const raw = src[row.action];
    const base: readonly unknown[] = Array.isArray(raw) ? raw : DEFAULT_PAD[row.action];
    const slots: PadSlots = [];
    for (let s = 0; s < PAD_SLOTS; s++) {
      const b = base[s];
      if (isPadBtn(b) && !used.has(b)) { slots.push(b); used.add(b); } else slots.push(null);
    }
    out[row.action] = slots;
  }
  for (const row of PAD_ROWS) if (!out[row.action].some((b) => b !== null)) return cloneDefaults();
  return out;
}

export function loadPadBindings(): void {
  const raw = storage.get(STORE_KEY);
  cache = null;
  if (!raw) { current = cloneDefaults(); return; }
  try { current = parsePadBinds(JSON.parse(raw)); } catch { current = cloneDefaults(); }
}

// ---------------------------------------------------------------- labels
/** What a controller player is told for an action: its first button, or the fixed one that always does it. */
const FIXED_LABEL: Partial<Record<string, string>> = { interact: 'A', skip: 'VIEW', pause: 'START' };

/** The button to name for an action, or undefined for an action a controller has no button for. */
export function padButtonLabel(action: string): string | undefined {
  if (isPadAction(action)) return padLabel(buttonsOf(action)[0] ?? null);
  return FIXED_LABEL[action];
}
