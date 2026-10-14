// Every dialogue script for Level 2, stage 1.2 Hawkins Lab, by id (ids and triggers are in docs/level-2.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Eleven speaks one or two words, and she knows the Lab. "Papa" is as far as anyone goes about Brenner.
// Dialogue is off by default, so these are for players who turn story on. The puzzle tips carry the teaching.
// Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The loading dock. The first string of lights. */
const L2_START = script('l2_start', [
  line('lucas', 'Loading dock. One camera, and it points at the road.', 'worried'),
  line('dustin', "Hear me out. Nobody guards a delivery door. They plan for trucks, not kids."),
  line('mike', 'Eleven, is this it?'),
  line('eleven', "Papa's place.", 'worried'),
  line('mike', "Then Will's in there. Nobody gets left behind.", 'determined'),
  line('dustin', "I clipped Joyce's spare lights to the fence. Press {interact} by them to light them."),
  line('dustin', 'Go down in there and you start again from the last string you lit.'),
]);

/** Corridor A. Two agents pace it. Darts stop at pillars. */
const L2_AGENTS = script('l2_agents', [
  line('lucas', 'Two suits, pacing the corridor. They turn at the lockers.', 'worried'),
  line('mike', 'Can we sneak past?'),
  line('lucas', 'No. Use the pillars and the lockers. A dart stops at the first thing it hits.'),
  line('dustin', 'Their darts come slow. Dart, pause, dart. Step in during the pause.'),
  line('eleven', 'Careful.', 'worried'),
]);

/** The power room. The BURN puzzle. */
const L2_BURN_HINT = script('l2_burn_hint', [
  line('dustin', "That panel on the wall is a heat sensor. The door won't move until it reads fire."),
  line('lucas', 'So we burn it.'),
  line('dustin', 'Hairspray and a lighter. Swap me in with {swapTo2}. Face the sensor and press {special}.', 'happy'),
  line('mike', 'Stand close. Not too close.', 'worried'),
]);

const L2_BURN_DONE = script('l2_burn_done', [
  line('dustin', 'Told you. Hairspray beats a heat sensor.', 'happy'),
  line('lucas', "The door's moving."),
  line('mike', "Quiet. Something's patrolling the hall past it.", 'worried'),
]);

/** The animal lab doorway. The rats wake when it ends. */
const L2_CAGES = script('l2_cages', [
  line('lucas', "Cages on every wall. Those aren't lab mice.", 'worried'),
  line('dustin', "Hear me out: a rat that size ate something it shouldn't have.", 'worried'),
  line('eleven', 'Bad. Hungry.', 'worried'),
  line('mike', "Slow. Stay together. Don't touch the latches.", 'determined'),
  line('dustin', 'Is it me, or are the latches rattling?', 'shocked'),
  line('lucas', "It's not you."),
]);

/** A dark shape crosses behind the observation glass. No fight. */
const L2_SCARE = script('l2_scare', [
  line('lucas', 'Did something just walk past the glass?', 'shocked'),
  line('dustin', 'Tall. Too tall. Please tell me that was a coat rack.', 'shocked'),
  line('eleven', 'Not human.', 'worried'),
  line('mike', "Eyes forward. Walk. Don't give it a reason.", 'determined'),
  line('lucas', 'It watched us the whole way along that glass.', 'worried'),
]);

/** The observation corridor. The SHOOT puzzle. */
const L2_SHOOT_HINT = script('l2_shoot_hint', [
  line('lucas', 'The relay behind the glass runs the next door. No relay, no door.'),
  line('mike', "The glass is in the way. We can't reach it.", 'worried'),
  line('lucas', 'My wrist rocket flies over glass. Swap me in with {swapTo3}.', 'determined'),
  line('lucas', 'Face the glass and press {attack}.'),
  line('dustin', 'Line up straight on or on a clean diagonal. Rockets fly in eight directions.'),
]);

const L2_RELAY_DONE = script('l2_relay_done', [
  line('lucas', "Relay's down. The door lock let go."),
  line('dustin', 'A rock through glass. Physics, you beautiful thing.', 'happy'),
  line('mike', 'Nice shot, Lucas.', 'happy'),
  line('lucas', "I know. The door's open."),
]);

/** The storage hall. The PUSH puzzle. */
const L2_PUSH_HINT = script('l2_push_hint', [
  line('mike', 'A crate wedged across the corridor. There is no way around.', 'worried'),
  line('lucas', 'Too heavy to lift. Too tight to climb.'),
  line('dustin', "Eleven's shove moves heavy things. Swap her in with {swapTo4}.", 'happy'),
  line('dustin', 'Face the crate and press {attack}.'),
  line('eleven', 'Move.', 'determined'),
]);

const L2_CRATE_CLEARED = script('l2_crate_cleared', [
  line('eleven', 'Done.'),
  line('mike', 'Nose okay, Eleven? Good.', 'worried'),
  line('dustin', 'That crate weighed more than my bike. Just saying.', 'shocked'),
  line('lucas', 'Records wing is next. Check the corners.'),
]);

/** The klaxon. Three waves follow, from both ends of the wing. */
const L2_LOCKDOWN_START = script('l2_lockdown_start', [
  line('lucas', "That's an alarm. Every door just locked.", 'shocked'),
  line('dustin', "Hear me out: it's a lockdown. The guards come from both ends of the hall.", 'shocked'),
  line('mike', 'Back to back. Check on each other.', 'determined'),
  line('lucas', 'Watch your MP. Rotate hurt kids to the bench.'),
  line('dustin', 'When the d20 meter fills, press {burst}.'),
  line('eleven', 'Coming.', 'determined'),
]);

const L2_LOCKDOWN_CLEAR = script('l2_lockdown_clear', [
  line('lucas', "That's the last of them. The alarm is still going."),
  line('mike', 'Count off. Everyone standing?', 'worried'),
  line('dustin', 'Alive. Winded. Standing next to a lot of filing cabinets.', 'happy'),
  line('dustin', 'Hear me out: records means a name. Will has a name.'),
  line('eleven', 'This one.', 'determined'),
]);

/** The last words before the results. A hook for the school. */
const L2_CLEAR = script('l2_clear', [
  line('dustin', 'Found his file. It has a map of Hawkins Middle School.', 'shocked'),
  line('lucas', 'Our school. After hours. Great.', 'worried'),
  line('mike', "That's where he is. We go together.", 'determined'),
  line('eleven', 'Hurry.', 'determined'),
  line('lucas', 'And we find the exits first.'),
]);

export const L2_SCRIPTS: DialogueScript[] = [
  L2_START, L2_AGENTS, L2_BURN_HINT, L2_BURN_DONE, L2_CAGES, L2_SCARE, L2_SHOOT_HINT, L2_RELAY_DONE,
  L2_PUSH_HINT, L2_CRATE_CLEARED, L2_LOCKDOWN_START, L2_LOCKDOWN_CLEAR, L2_CLEAR,
];
