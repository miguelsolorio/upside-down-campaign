// The heart's look in the world pass (stage 5.3, docs/level-16.md): the two channel marks on the arena floor, which glow while the channel
// runs, and the heart's own pulsing red over the view. Both are the art's (gfx/ch5/heart_marks.ts); this places them. They go after the tiles
// and before everything that stands on them. Reduce flashing holds the pulse at one calm step inside the art.
import type { FinaleDef, SimView } from '../core/types.ts';
import { SCREEN_H, SCREEN_W, TILE, VIEW_TOP } from '../core/config.ts';
import { drawChannelMark, drawHeartGlow } from '../gfx/index.ts';

type Ctx = CanvasRenderingContext2D;

/** The feet position of a tile, as an actor standing on it (the sim holds a channeler there). */
export const markAt = (tx: number, ty: number): { x: number; y: number } => ({ x: tx * TILE + TILE / 2, y: ty * TILE + 12 });

/**
 * Draws the marks and the glow. The caller has moved the context to world space; `camX` and `camY` are the world px at the screen's left edge
 * and at the view's top, shake taken out. The marks are Eleven's and Will's, wherever the stage puts them, and lit while `hud.channel.on`.
 */
export function drawHeart(ctx: Ctx, finale: FinaleDef, view: SimView, camX: number, camY: number, t: number): void {
  const lit = view.hud.channel?.on === true;
  for (const c of finale.channelers) {
    if (c.hero !== 'eleven' && c.hero !== 'will') continue;
    const at = markAt(c.tx, c.ty);
    drawChannelMark(ctx, c.hero, at.x, at.y, t, lit);
  }
  // The glow is the screen's, not the map's: centered on the view and moving with the camera, so the vignette always closes in on the screen's edges.
  drawHeartGlow(ctx, t, camX + SCREEN_W / 2, camY + (SCREEN_H - VIEW_TOP) / 2);
}
