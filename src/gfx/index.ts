// PUBLIC API of gfx. Owner: Art agent.
//
// Conventions: all draw functions take a 2D context. World-space functions (drawStage, drawActor,
// drawFx, drawItem, drawProp) assume the caller already did ctx.translate(-camX, VIEW_TOP - camY).
// Screen-space functions (everything else) use raw 256x224 pixels.
//
// Sizes the UI can rely on: icons are 8x8, portraits 24x24, the title logo LOGO_SIZE (with its subtitle),
// the alphabet wall WALL_SIZE. Actors are 16x16 cells with the feet at bottom center.
import { warmActors } from './actors.ts';
import { warmFont } from './font.ts';
import { warmLogo } from './logo.ts';
import { warmUi } from './ui.ts';

export type { BakedStage, Spot } from './tiles.ts';
export { drawText, textWidth } from './font.ts';
export { bakeStage, drawStage } from './tiles.ts';
export { drawActor } from './actors.ts';
export { drawFx } from './fx.ts';
export { drawItem, drawProp } from './props.ts';
export { drawCamCone, drawHazard } from './overlays.ts';
export { paintGlow } from './glow.ts';
export type { Glow } from './glow.ts';
export { drawPortrait, drawIcon, drawPanel, drawBar } from './ui.ts';
export { drawLogo, drawAlphabetWall, LOGO_SIZE, WALL_SIZE } from './logo.ts';

/** Build atlases and fonts once at boot. Synchronous, under 200 ms. */
export function initGfx(): void {
  warmFont();
  warmActors();
  warmUi();
  warmLogo();
}
