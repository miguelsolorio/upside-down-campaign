// Which atlas an actor is drawn from, and which paper doll a key stands for (actors.ts). A key is the actor id, then ":low" for a guard
// with its shield down or a camp guard with his baton down, then ":elite", then ":prison" for Hopper in the Telogreika, the look he wears
// from chapter 4 (looks.ts, docs/level-10.md). The camp guard has two stances the way the riot guard has two atlases: his block, the baton
// held across his body, while the sim says he is guarding, and the baton at his side when he is recovering, broken or stunned. Pure: no DOM.
import type { CharSpec } from './data/types.ts';
import { EDDIE_SPEC } from './data/eddie.ts';
import { HOPPER4 } from './data/hopper4.ts';
import { KBATON, KBATON_LOW, KGUARD } from './data/kguard.ts';
import { hopperInPrison } from './looks.ts';

/** The chapter 4 actors drawn from a paper doll, by id (actors.ts adds them to its table). Eddie is drawn from frames of his own (actor_eddie.ts); his doll is for the map's token and for where the hero's bar sits. */
export const CH4_SPECS: CharSpec[] = [KGUARD, KBATON, EDDIE_SPEC];

/** The actors that have a lowered stance: a guard or the warden with the shield down, a camp guard with the baton down. */
const LOWERS = new Set(['guard', 'warden', 'kbaton']);

/** The atlas an actor is drawn from: its id, plus whether it is lowered, whether it is an elite and whether Hopper is in prison. `prison` defaults to the chapter's look. */
export function keyOf(id: string, guarding: boolean | undefined, elite: boolean | undefined, kind: string, prison = hopperInPrison()): string {
  return id + (LOWERS.has(id) && guarding === false ? ':low' : '') + (elite && kind === 'enemy' ? ':elite' : '') + (prison && id === 'hopper' ? ':prison' : '');
}

/** The paper doll a key's flags ask for in place of the one registered under its id, or undefined when they ask for none. */
export function lookSpec(id: string, flags: string[]): CharSpec | undefined {
  if (id === 'kbaton' && flags.includes('low')) return KBATON_LOW;
  if (id === 'hopper' && flags.includes('prison')) return HOPPER4;
  return undefined;
}
