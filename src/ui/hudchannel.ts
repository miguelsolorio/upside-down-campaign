// The final fight's channel on the HUD (docs/level-16.md, stage 5.3), the way 2.3's ward bar is drawn: the countdown on the boss bar and
// a bar for each channeler under it, plus the held mark on their rows in the party band. ui/hudlayout.ts says where they go. Eleven's bar
// is her mark's hot rose and Will's the cool teal of his, so each finds their own; the countdown is amber, since it is time and not health.
// Nothing here blinks, so Reduce flashing has nothing to hold still.
import type { HeroId, HudView } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { drawBar, drawText } from '../gfx/index.ts';
import { secondsLeft } from './format.ts';
import { HELD_H, channelBars } from './hudlayout.ts';
import { box, outline } from './kit.ts';
import type { Ctx } from './kit.ts';

type Channel = NonNullable<HudView['channel']>;

/** A channeler's colors: the bar's fill and its trough, and the frame and held mark in the party band. */
export interface Tone { fill: ColorName; back: ColorName; frame: ColorName }
const TONES: Partial<Record<HeroId, Tone>> = {
  eleven: { fill: 'rose', back: 'blood0', frame: 'pink' },
  will: { fill: 'teal1', back: 'teal0', frame: 'cyan' },
};
const OTHER: Tone = { fill: 'red', back: 'blood0', frame: 'hot' };
export const toneOf = (id: HeroId): Tone => TONES[id] ?? OTHER;

/** The countdown's bar: amber on a dark trough. It drains as the clock runs. */
export const COUNT_FILL: ColorName = 'amber';
export const COUNT_BACK: ColorName = 'soil1';

/** The boss bar of the channel: the seconds left, at the right end, as the ward's bar prints them. */
export function drawCountdown(ctx: Ctx, x: number, y: number, w: number, left: number): void {
  drawText(ctx, `${secondsLeft(left)}S`, x + w - 3, y + 1, 'white', { align: 'right', shadow: true });
}

/** The channelers' bars, side by side, their tops at `y`: the name on the left of each. A fallen channeler's is empty. */
export function drawChannelers(ctx: Ctx, channel: Channel, y: number, screenW: number): void {
  const bars = channelBars(screenW, y, channel.channelers.length);
  channel.channelers.forEach((c, i) => {
    const b = bars[i];
    if (!b) return;
    const tone = toneOf(c.id);
    outline(ctx, b.x - 1, b.y - 1, b.w + 2, b.h + 2, 'ink');
    drawBar(ctx, b.x, b.y, b.w, b.h, c.hpMax > 0 ? c.hp / c.hpMax : 0, tone.fill, tone.back);
    drawText(ctx, c.name, b.x + 3, b.y + 1, 'white', { shadow: true });
  });
}

/** The ring that stands where a held hero's key would be: 3 by 5, in the hero's frame color, with its middle lit while the channel runs. */
const RING = ['.x.', 'x.x', 'x.x', 'x.x', '.x.'];
export function drawHeld(ctx: Ctx, x: number, y: number, id: HeroId, lit: boolean): void {
  const tone = toneOf(id);
  RING.forEach((row, j) => [...row].forEach((c, i) => { if (c === 'x') box(ctx, x + i, y + j, 1, 1, tone.frame); }));
  if (lit) box(ctx, x + 1, y + (HELD_H >> 1), 1, 1, 'white');
}
