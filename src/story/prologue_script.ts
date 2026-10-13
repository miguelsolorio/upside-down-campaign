// The basement prologue, 15 lines in four parts. The scene plays the parts one at a time and puts the die roll,
// a reaction beat and the lamp flicker between them. SCRIPTS.prologue is all four parts joined.
// Pure data: no DOM, so Node can test it. Mike speaks as the DM, so his narration uses the 'dm' speaker.
import type { DialogueLine, DialogueScript } from '../core/types.ts';

/** Before the roll: the Demogorgon arrives and Mike asks Will to roll. */
const BEFORE_ROLL: DialogueLine[] = [
  { who: 'dm', text: 'Deep in the cavern, the torches gutter out one by one. Something huge is breathing.' },
  { who: 'dustin', expr: 'shocked', text: 'Okay. Two heads, tentacle arms, prince of demons. That breathing is a Demogorgon.' },
  { who: 'lucas', expr: 'worried', text: "Great. Where's the exit? Tell me there's an exit." },
  { who: 'dm', text: "The Demogorgon steps into the torchlight. It's looking right at the wizard." },
  { who: 'mike', expr: 'determined', text: "Will, you're up. Roll a d20 for Fireball. Ten or higher and it works." },
  { who: 'will', expr: 'worried', text: 'Okay. Everyone stop staring at me.' },
];

/** After the roll lands low: the spell fizzles and the wizard falls. */
const AFTER_ROLL: DialogueLine[] = [
  { who: 'dm', text: 'The die stops. A two. The spell fizzles, and the Demogorgon lunges.' },
  { who: 'will', expr: 'hurt', text: "A two. Of course it's a two." },
  { who: 'dm', text: 'Claws come down. The wizard is gone.' },
];

/** The table reacts. */
const REACTIONS: DialogueLine[] = [
  { who: 'dustin', expr: 'shocked', text: 'Gone? Gone as in dead? There has to be a rule for that. Hold on.' },
  { who: 'lucas', expr: 'neutral', text: 'Dead is dead, Dustin. Put the rulebook down.' },
  { who: 'mike', expr: 'worried', text: "Will? You okay? It's only a game." },
];

/** After the lamp flickers and something growls. */
const AFTER_FLICKER: DialogueLine[] = [
  { who: 'mike', expr: 'shocked', text: 'Okay. Who made that noise? Dustin?' },
  { who: 'dustin', expr: 'shocked', text: 'Not me. Not me! It came from the stairs.' },
  { who: 'will', expr: 'worried', text: "That wasn't us. That wasn't the game." },
];

/** In playing order. The scene runs index 0, rolls, then 1, pauses, then 2, flickers, then 3, then fades out. */
export const PROLOGUE_PARTS: DialogueLine[][] = [BEFORE_ROLL, AFTER_ROLL, REACTIONS, AFTER_FLICKER];

export const PROLOGUE: DialogueScript = { id: 'prologue', lines: PROLOGUE_PARTS.flat() };

/** The scene runs each part as its own script, so each needs an id. */
export function prologuePart(i: number): DialogueScript {
  return { id: `prologue.${i + 1}`, lines: PROLOGUE_PARTS[i] ?? [] };
}
