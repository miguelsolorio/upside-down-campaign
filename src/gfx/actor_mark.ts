// What hangs over an actor's head in chapter 4 (docs/level-11.md). The clock of a curse over a hero (ActorView.curse, the chimes sounded so
// far): the Rooted pick's, a dark red rim round a bone face with two hands and four pips under it, red for the ones that have sounded
// (gfx/var/vecna_kit.ts, curseMark). And the d20 of Eddie's Hellfire DM over a boss or an elite he has marked (ActorView.marked): the
// HUD's own d20 in the club's red, bobbing a pixel. Both sit over the bar, which is drawn on top of everything later, and the d20 steps
// to the side of a "!". Pure pixel work: no DOM until a mark becomes a canvas.
import type { ActorView } from '../core/types.ts';
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';
import { curseMark } from './var/vecna_kit.ts';

/** The clock is 15 by 17 with its outline. The chimes it can show are 1 to 3: the fourth knocks the hero out. */
export const CLOCK_W = 15, CLOCK_H = 17;
const clocks: HTMLCanvasElement[] = [];

/** The clock with `n` pips lit, as a Px: dark red rim, bone face, red pips. */
export function clockPx(n: number): Px { return curseMark('blood1', 'bone', Math.max(0, Math.min(4, n)), 'red'); }

function clockCanvas(n: number): HTMLCanvasElement {
  return (clocks[n] ??= clockPx(n).toCanvas());
}

const D20 = ['...kk...', '..kffk..', 'kkfeefkk', 'kfewfefk', 'kfeeeefk', 'kksssskk', '..kssk..', '...kk...'];
const D20_PAL: Record<string, ColorName> = { k: 'ink', f: 'hot', e: 'red', w: 'white', s: 'blood1' };
let d20: HTMLCanvasElement | null = null;

/** The d20 of the Hellfire DM, 8 by 8. */
export function markPx(): Px { return new Px(8, 8).art(D20, D20_PAL); }

/** The final boss's clock marked this leg (ActorView.marked on a leg, docs/level-16.md): cutting it lifts the curse. The clock's face hangs over its tip, bobbing a pixel. */
export function drawLegMark(ctx: CanvasRenderingContext2D, v: ActorView): void {
  if (!v.aim || v.blink) return;
  const bob = ((v.t >> 4) & 1) ? 1 : 0;
  ctx.drawImage(clockCanvas(0), Math.round(v.aim.x) - (CLOCK_W >> 1), Math.round(v.aim.y) - 22 - CLOCK_H + bob);
}

/**
 * Draws the marks of an actor whose head is on row `head`, feet at v.x. A hero's bar is 4 rows tall with its top 5 above the head, so the
 * clock stands on the row over it; a foe's bar is drawn only once it has been hit, but its d20 keeps the same room either way.
 */
export function drawMarks(ctx: CanvasRenderingContext2D, v: ActorView, head: number): void {
  const cx = Math.round(v.x);
  if (v.curse) ctx.drawImage(clockCanvas(v.curse), cx - (CLOCK_W >> 1), head - 6 - CLOCK_H);
  if (v.marked) {
    d20 ??= markPx().toCanvas();
    const bob = ((v.t >> 4) & 1) ? 1 : 0;
    ctx.drawImage(d20, cx - 4 + (v.alert ? 7 : 0), head - (v.bar ? 14 : 10) + bob);
  }
}
