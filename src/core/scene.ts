import type { InputState } from './input.ts';
import type { Settings } from './settings.ts';
import type { Flags } from './flags.ts';

export interface Game {
  input: InputState;
  settings: Settings;
  flags: Flags;
  scenes: SceneManager;
  /** Ticks since boot. */
  frame: number;
}

export interface Scene {
  /** Opaque scenes hide whatever is under them. Overlays leave this false so the scene below still draws. */
  opaque?: boolean;
  enter?(g: Game): void;
  exit?(g: Game): void;
  /** Only the top scene updates. */
  update(g: Game): void;
  draw(ctx: CanvasRenderingContext2D, g: Game): void;
}

export interface SceneManager {
  /** Replace the whole stack. */
  go(s: Scene): void;
  push(s: Scene): void;
  pop(): void;
  top(): Scene | null;
  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export function createSceneManager(getGame: () => Game): SceneManager {
  const stack: Scene[] = [];
  const api: SceneManager = {
    go(s) {
      const g = getGame();
      while (stack.length) stack.pop()?.exit?.(g);
      stack.push(s);
      s.enter?.(g);
    },
    push(s) { stack.push(s); s.enter?.(getGame()); },
    pop() { stack.pop()?.exit?.(getGame()); },
    top: () => stack[stack.length - 1] ?? null,
    update() { stack[stack.length - 1]?.update(getGame()); },
    draw(ctx) {
      let from = stack.length - 1;
      while (from > 0 && !stack[from]?.opaque) from--;
      for (let i = Math.max(0, from); i < stack.length; i++) stack[i]?.draw(ctx, getGame());
    },
  };
  return api;
}
