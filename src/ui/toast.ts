// A one-line notice across the top of the screen for two seconds: a controller connecting or dropping.
import { SCREEN_W } from '../core/config.ts';
import { drawText } from '../gfx/index.ts';
import { box } from './kit.ts';
import type { Ctx } from './kit.ts';

export const TOAST_FRAMES = 120;

export interface Toast {
  show(text: string): void;
  /** Once per update tick. */
  tick(): void;
  draw(ctx: Ctx): void;
}

export function createToast(): Toast {
  let text = '';
  let ttl = 0;
  return {
    show(t) { text = t; ttl = TOAST_FRAMES; },
    tick() { if (ttl > 0) ttl--; },
    draw(ctx) {
      if (ttl <= 0) return;
      box(ctx, 0, 0, SCREEN_W, 11, 'ink');
      box(ctx, 0, 11, SCREEN_W, 1, 'shadow');
      drawText(ctx, text, SCREEN_W / 2, 2, text.endsWith('LOST') ? 'hot' : 'leaf', { align: 'center' });
    },
  };
}
