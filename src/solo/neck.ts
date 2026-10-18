// The neck of Eddie's Flying V, the owner's pick for the note highway (solo-variations.html, "The neck"): dark wood coming out
// from under him toward the player in perspective, fret wires that scroll, inlay dots, three lanes and a bone strum line near
// the bottom of the screen. This is its geometry and the drawing of its parts onto anything with rect and set, a Px on the
// sheet and the bake of the in-game bed, so the sheet and the game draw the same neck. Pure: no DOM.
import type { ColorName } from '../gfx/palette.ts';

/** What the neck draws onto: a Px, or the thin wrapper in draw.ts around a canvas context. */
export interface Surface {
  rect(x: number, y: number, w: number, h: number, c: ColorName): unknown;
  set(x: number, y: number, c: ColorName): unknown;
}

/** The far end of the neck, its near end and the strum line, in screen rows. */
export const NECK_T = 126, NECK_B = 216, STRUM = 204;
/** The middle of the screen: the neck is centered on Eddie. */
export const NECK_CX = 128;

/** The x of fraction f (0 left edge, 1 right edge) of the neck at row y. The neck is 40 px wide at the far end and 132 at the near end. */
export function neckX(y: number, f: number): number {
  const k = (y - NECK_T) / (NECK_B - NECK_T), half = 20 + k * 46;
  return NECK_CX - half + f * half * 2;
}

/** The x of a lane's middle (0 Attack, 1 Special, 2 Crit) at row y. */
export const laneX = (lane: number, y: number): number => neckX(y, (lane + 0.5) / 3);

/** How far along the neck a note is: 0 at the far end, 1 on the strum line, past 1 once it has gone by. Squared down so the near end is spread out. */
export const rowOf = (z: number): number => NECK_T + z ** 1.7 * (STRUM - NECK_T);

/** The wood with its edges and lane dividers: the part of the neck that never moves. */
export function neckBed(p: Surface): void {
  for (let y = NECK_T; y < NECK_B; y++) {
    const a = Math.round(neckX(y, 0)), b = Math.round(neckX(y, 1));
    p.rect(a, y, b - a, 1, 'soil0');
    p.set(a - 1, y, 'grey2'); p.set(b, y, 'grey2'); p.set(a - 2, y, 'ink'); p.set(b + 1, y, 'ink');
    for (const f of [1 / 3, 2 / 3]) p.set(Math.round(neckX(y, f)), y, 'soil1');
  }
}

/** A fret wire on a row, with an inlay dot under it or not. */
export interface Fret { y: number; dot: boolean }

/** Fret wires on the given rows. Rows off the neck are skipped. */
export function neckFrets(p: Surface, frets: readonly Fret[]): void {
  for (const f of frets) {
    const y = Math.round(f.y);
    if (y < NECK_T || y >= NECK_B) continue;
    const a = Math.round(neckX(y, 0)), b = Math.round(neckX(y, 1));
    p.rect(a, y, b - a, 1, 'grey3');
    if (f.dot) p.set(Math.round((a + b) / 2), y + 2, 'bone');
  }
}

/** The bone line the notes are struck on. */
export function strumLine(p: Surface): void {
  p.rect(Math.round(neckX(STRUM, 0)), STRUM, Math.round(neckX(STRUM, 1) - neckX(STRUM, 0)), 1, 'bone');
}
