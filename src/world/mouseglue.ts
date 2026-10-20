// The mouse as the play scene reads it. Turns this tick's clicks into the MouseTick the driver (mouseplay.ts) takes, and into the party slot a
// click on a hero standing on the field asks to swap to. Pure: it reads the pointer's source, the view and the camera, so it is tested in
// Node with stub views and a fake source. A click on a portrait in the strip is the play scene's own (slotAt); this adds the lit Crit
// column, the field and the right button.
import type { PartyHud, SimView, Vec2 } from '../core/types.ts';
import type { Camera } from '../core/camera.ts';
import { VIEW_TOP } from '../core/config.ts';
import { onCrit, swappable } from '../ui/hudlayout.ts';
import { inField, pickAt, toWorld } from './mousepick.ts';
import { NO_TICK } from './mouseplay.ts';
import type { MouseTick } from './mouseplay.ts';

/** What play.ts reads for the mouse: the real InputState, or a scene test's fake input, which has none of the mouse methods. */
export interface MouseSource {
  clicked(): Vec2 | null;
  hover(): Vec2 | null;
  mouseClicked?(): Vec2 | null;
  rightClicked?(): Vec2 | null;
  rightHeld?(): boolean;
}

/** The party slot of a hero a click can swap to, or -1: the hero is in the party, standing, not cursed and not on a mark in the channel. */
function benchSlot(party: readonly PartyHud[], id: string): number {
  const i = party.findIndex((q) => q.id === id);
  const q = party[i];
  return q && swappable(q) ? i : -1;
}

/** This tick's mouse, as a MouseTick for the driver, and the party slot a click asked to swap to (-1 for none). */
export function readMouse(src: MouseSource, view: SimView, cam: Camera): { tick: MouseTick; swapTo: number } {
  let go: MouseTick['go'] = null;
  let special: MouseTick['special'] = null;
  let burst = false;
  let swapTo = -1;

  // A finger tap counts on the Crit column: the d20 is a button on a phone too.
  const c = src.clicked();
  if (c && c.y < VIEW_TOP && view.hud.burstReady && onCrit(view.hud.quarters, c.x, c.y)) burst = true;

  // Only a mouse or a pen drives the hero over the field. A phone has its D-pad.
  const m = src.mouseClicked?.() ?? null;
  if (m && inField(m)) {
    const w = toWorld(m, cam, view.shake);
    const p = pickAt(view, w);
    if (p.kind === 'enemy') go = { kind: 'attack', id: p.id, x: p.x, y: p.y };
    else if (p.kind === 'ground') go = { kind: 'walk', x: p.x, y: p.y };
    else if (view.hud.party.find((q) => q.active)?.id === p.id) go = 'stop';
    else {
      swapTo = benchSlot(view.hud.party, p.id);
      // Cursed, channeling or not in the party at all: no swap to make, so the click is just a spot to walk to.
      if (swapTo < 0) go = { kind: 'walk', x: w.x, y: w.y };
    }
  }

  // The right button is the Special, aimed at the spot under the pointer, the faded side bands of a wide screen included. On the strip
  // there is no spot to aim at.
  const r = src.rightClicked?.() ?? null;
  if (r) special = r.y >= VIEW_TOP ? toWorld(r, cam, view.shake) : true;
  const specialHeld = src.rightHeld?.() ?? false;

  if (go === null && special === null && !specialHeld && !burst) return { tick: NO_TICK, swapTo };
  return { tick: { go, special, specialHeld, burst }, swapTo };
}

/** True when the pointer is over something a click would do in the level: a foe, a party member a click can swap to, or the lit Crit column. */
export function wantsHand(ptr: Vec2 | null, view: SimView, cam: Camera): boolean {
  if (!ptr) return false;
  if (ptr.y < VIEW_TOP) return view.hud.burstReady && onCrit(view.hud.quarters, ptr.x, ptr.y);
  if (!inField(ptr)) return false;
  const p = pickAt(view, toWorld(ptr, cam, view.shake));
  if (p.kind === 'enemy') return true;
  return p.kind === 'hero' && benchSlot(view.hud.party, p.id) >= 0;
}
