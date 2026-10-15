// The arcade's shared vocabulary: the games, the controls a cart reads each tick, and the cart itself. A cart is one
// game's rules and drawing. Its step() is pure logic with no DOM, so Node tests can play it headless; draw() paints the
// field at 1x, with its top-left wherever the cabinet scene puts it.
import type { SfxId } from '../core/types.ts';
import type { Ctx } from '../gfx/canvas.ts';

export type ArcadeGameId = 'digdug' | 'centipede' | 'dragonslair' | 'galaga' | 'pacman' | 'mspacman';
export const ARCADE_GAMES: readonly ArcadeGameId[] = ['digdug', 'centipede', 'dragonslair', 'galaga', 'pacman', 'mspacman'];

/** Every cart draws in the same square: 21 by 21 cells of 8 px. */
export const CELL = 8;
export const CELLS = 21;
export const FIELD = CELL * CELLS;

export type Dir = 'up' | 'down' | 'left' | 'right';

/** One tick of the cabinet's controls. */
export interface Pad {
  /** The stick, each axis -1 to 1. */
  mx: number; my: number;
  /** The fire button is down, and it went down this tick. */
  fire: boolean; firePressed: boolean;
  /** A direction that went down this tick, for games that read taps (Dragon's Lair). */
  dirPressed: Dir | null;
}

export const IDLE_PAD: Pad = { mx: 0, my: 0, fire: false, firePressed: false, dirPressed: null };

export interface Cart {
  readonly score: number;
  readonly lives: number;
  /** The last life is gone and the death has played out. The scene posts the score then. */
  readonly over: boolean;
  /** One 60 Hz tick. Returns the sounds this tick made. */
  step(pad: Pad): SfxId[];
  /** Paints the FIELD by FIELD square with its top-left at (ox, oy). */
  draw(ctx: Ctx, ox: number, oy: number): void;
}

/** What a cart starts from: the seed for its randomness and the board's best score, for the HI readout. */
export interface CartOpts { seed: number; best: number }
export type CartFactory = (opts: CartOpts) => Cart;

/** The stick snapped to one of four directions (the bigger axis wins), or null inside the dead zone. */
export function stickDir(p: Pad, dead = 0.4): Dir | null {
  const ax = Math.abs(p.mx), ay = Math.abs(p.my);
  if (Math.max(ax, ay) < dead) return null;
  return ax > ay ? (p.mx < 0 ? 'left' : 'right') : (p.my < 0 ? 'up' : 'down');
}

export const DX: Record<Dir, number> = { up: 0, down: 0, left: -1, right: 1 };
export const DY: Record<Dir, number> = { up: -1, down: 1, left: 0, right: 0 };

/** One finished run: its score, the row it took on the board (-1 for none), and whether it beat MADMAX at Dig Dug. */
export interface ArcadeResult { game: ArcadeGameId; score: number; rank: number; beatMadmax: boolean }
