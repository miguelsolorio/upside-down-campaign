// Every dialogue script for Level 3, stage 1.3 Hawkins Middle School, by id (ids and triggers are in docs/level-3.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Eleven speaks one or two words. Dustin explains, Lucas doubts, Mike checks on Eleven first. The Demogorgon is a D&D monster
// the boys rolled up in the basement, so Dustin knows its name and how it is supposed to work.
// Dialogue is off by default, so these are for players who turn story on. The puzzle tips carry the teaching.
// Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The parking lot. The first string of lights. */
const L3_START = script('l3_start', [
  line('lucas', 'Hawkins Middle, after hours. Two agents by the vans. Every light on.', 'worried'),
  line('dustin', "Hear me out: they're not guarding it. They're waiting for something to come out."),
  line('mike', 'Eleven, how close is it?', 'worried'),
  line('eleven', 'Very close.', 'worried'),
  line('mike', "Then we stay together. Nobody gets left behind.", 'determined'),
  line('dustin', "I clipped Joyce's spare lights to the fence again. Press {interact} by them to light them."),
  line('dustin', 'Go down in there and you start again from the last string you lit.'),
]);

/** In front of the side door. The PUSH puzzle. */
const L3_VAN_HINT = script('l3_van_hint', [
  line('lucas', 'Side door is the only one not chained. And somebody parked a van across it.', 'worried'),
  line('mike', "We can't lift it. We can't climb it.", 'worried'),
  line('dustin', "Eleven's shove moves heavy things. Swap her in with {swapTo4}.", 'happy'),
  line('dustin', 'Face the van and press {attack}.'),
  line('eleven', 'Move it.', 'determined'),
]);

const L3_VAN_DONE = script('l3_van_done', [
  line('eleven', 'Done.'),
  line('mike', 'Nose okay, Eleven? Easy on it.', 'worried'),
  line('dustin', 'She flipped a van. A whole van. I want that on record.', 'shocked'),
  line('lucas', "Door's clear. Weapons ready."),
]);

/** The hall. Two agents, and an elite who keeps looking at Eleven. */
const L3_AGENTS = script('l3_agents', [
  line('lucas', 'Three in the hall. The one at the back has a better coat.', 'worried'),
  line('dustin', "Elite. Tougher, faster, nastier. He's not looking for us. He's looking for her.", 'worried'),
  line('mike', "Then nobody leaves her side. We take them one at a time.", 'determined'),
  line('eleven', 'Hunting me.', 'worried'),
  line('lucas', 'Not for long. Watch the darts and step out of the line.'),
]);

/** The science room. The BURN puzzle. */
const L3_VINES_HINT = script('l3_vines_hint', [
  line('mike', "That's the back door. It's covered in vines. Not our vines.", 'worried'),
  line('dustin', 'Upside Down growth. It hates heat. Hairspray and a lighter, same as the Lab.'),
  line('dustin', 'Swap me in with {swapTo2}. Face the vines and press {special}.', 'happy'),
  line('lucas', 'And keep the flame off the desks. This place is mostly paper.'),
]);

const L3_VINES_DONE = script('l3_vines_done', [
  line('dustin', 'Burned clean. Hairspray beats a monster. Put that in the campaign.', 'happy'),
  line('lucas', "Doorway's open. It smells like a burnt salad."),
  line('mike', 'Eleven, stay behind me through here.', 'worried'),
  line('eleven', 'Cold.', 'worried'),
]);

/** The cafeteria doorway. The rats wake when it ends. */
const L3_CAFETERIA = script('l3_cafeteria', [
  line('lucas', "Cafeteria. Tables still set for lunch. Somebody's been eating off them.", 'worried'),
  line('dustin', "Rats. A lot of them. Hear me out: they're hungry, we smell like Eggos.", 'worried'),
  line('mike', "Back to the doorway. Let them come to us.", 'determined'),
  line('eleven', 'Hungry. Fast.', 'worried'),
  line('lucas', 'Then we are faster.'),
]);

/** A dark shape crosses behind the serving counter. No fight. */
const L3_SCARE = script('l3_scare', [
  line('lucas', 'Something just walked behind the counter. Tall. Slow.', 'shocked'),
  line('dustin', "No face. A head that opens like a flower. That's a Demogorgon.", 'shocked'),
  line('mike', 'It was a game. We rolled it up in the basement.', 'worried'),
  line('eleven', 'Real now.', 'worried'),
  line('lucas', 'Then keep moving. Slowly. Do not run.', 'determined'),
]);

/** The cafeteria. The SHOOT puzzle. */
const L3_FIREBOX_HINT = script('l3_firebox_hint', [
  line('lucas', 'The gym door is a fire door. Its release box is on the wall behind the counter.', 'worried'),
  line('mike', "We can't reach it. The counter is in the way.", 'worried'),
  line('dustin', 'A rocket flies over furniture. Swap Lucas in with {swapTo3}.', 'happy'),
  line('lucas', 'Face the box and press {attack}. Line up straight on.', 'determined'),
]);

const L3_FIREBOX_DONE = script('l3_firebox_done', [
  line('lucas', 'Box is lit. The lock let go.'),
  line('dustin', 'Fire door is open. Next stop is the gym.', 'happy'),
  line('mike', 'Check on each other. Everyone standing?', 'worried'),
  line('eleven', 'Loud. Close.', 'worried'),
]);

/** The gym doors. The third string of lights. */
const L3_GYM = script('l3_gym', [
  line('dustin', "Gym doors. There's a string of lights by the wall. Light it before we go in.", 'worried'),
  line('lucas', 'The far wall looks wrong. Like something pressed on it from the other side.', 'shocked'),
  line('mike', "Eleven, you don't have to be at the front.", 'worried'),
  line('eleven', 'I do.', 'determined'),
]);

/** The wall splits and the Demogorgon comes through. The music changes. */
const L3_DEMOGORGON = script('l3_demogorgon', [
  line('dustin', "The wall's splitting. That's it. That's the one from the basement.", 'shocked'),
  line('lucas', 'It runs at you in a straight line. Step out of the line and let it hit the wall.', 'determined'),
  line('dustin', 'Three wall hits and it stays down. Then hit it hard, while it is dazed.'),
  line('mike', 'When something lands on the floor, run. Everyone together.', 'determined'),
  line('eleven', 'Stay close.', 'determined'),
]);

/** The boss is pinned. The finisher. */
const L3_PINNED = script('l3_pinned', [
  line('dustin', "It's down but it isn't dying. Nothing we have even scratches it.", 'shocked'),
  line('lucas', 'Only Eleven can finish it. Swap her in with {swapTo4}.', 'determined'),
  line('dustin', 'Face it and press {special}. Stay in the line.'),
  line('mike', "Eleven. You don't have to.", 'worried'),
  line('eleven', 'I can.', 'determined'),
]);

/** The end of chapter one. Eleven destroys the Demogorgon and is gone. */
const L3_CLEAR = script('l3_clear', [
  line('eleven', 'Mike.', 'determined'),
  line('mike', 'El. Wait. We can find another way.', 'hurt'),
  line('eleven', 'Friends. Go.', 'determined'),
  line('narrator', 'A white light fills the gym. When it fades, the Demogorgon is gone. So is Eleven.'),
  line('dustin', 'Where did she go? Somebody say something.', 'shocked'),
  line('lucas', 'No coat. No shoes. Nothing on the floor.', 'hurt'),
  line('mike', "She's out there. And I'm finding her.", 'determined'),
]);

export const L3_SCRIPTS: DialogueScript[] = [
  L3_START, L3_VAN_HINT, L3_VAN_DONE, L3_AGENTS, L3_VINES_HINT, L3_VINES_DONE, L3_CAFETERIA, L3_SCARE,
  L3_FIREBOX_HINT, L3_FIREBOX_DONE, L3_GYM, L3_DEMOGORGON, L3_PINNED, L3_CLEAR,
];
