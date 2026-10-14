// Every dialogue script for Level 4, stage 2.1 the Palace and the patch, by id (ids and triggers are in docs/level-4.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Halloween, 1984. Mike, Dustin, Lucas and Will: Dustin explains, Lucas doubts, Mike is bossy and earnest, and Will is quiet and
// notices first. Max is quick and dry. Eleven is not here and nobody says where she is: Mike says he misses her once, in
// l4_street, and that is all. Dialogue is off by default, so these are for players who turn story on. The puzzle tips carry the teaching.
// Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The Palace. The first string of lights. */
const L4_START = script('l4_start', [
  line('dustin', 'Halloween, 1984. The Palace is open late, and Dig Dug is mine tonight.', 'happy'),
  line('lucas', "You said that at the last three arcades. You'd rather say it than win it."),
  line('will', "Something's off. The air in here smells like a wet basement.", 'worried'),
  line('mike', 'Stay together. Nobody wanders off.', 'determined'),
  line('dustin', "I borrowed Joyce's spare lights. Press {interact} by them to light them."),
  line('dustin', 'Go down out there and you start again from the last string you lit.'),
]);

/** Max, at the Dig Dug cabinet. She won't give up the high score. */
const L4_MAX = script('l4_max', [
  line('dustin', 'MADMAX is at the top of the board. Nobody gets that score.', 'shocked'),
  line('max', "I did. Back of the line, nerds."),
  line('lucas', 'Bet I can top it.'),
  line('max', "Try and keep up. I'm on my last life and I'm still ahead."),
  line('mike', "We're not here for the game. Something is wrong at Merrill's farm.", 'worried'),
  line('max', "Not my problem. Not until I've beaten my own score."),
]);

/** The arcade door, out onto Main Street. Mike misses Eleven, once. */
const L4_STREET = script('l4_street', [
  line('dustin', 'Everyone is in costume. Nobody will notice four kids and a wrist rocket.'),
  line('lucas', "Merrill's farm is at the east end. Past the fence."),
  line('mike', "Eleven would have loved the costumes. The candy, too.", 'hurt'),
  line('dustin', 'Yeah. She would.'),
  line('will', "I'll keep watch on the road.", 'worried'),
]);

/** The trash can on Main Street. Dustin finds something. Story only. */
const L4_DART = script('l4_dart', [
  line('dustin', "Guys. Guys. Something's in the trash can. It's small and it hisses.", 'shocked'),
  line('lucas', 'Leave it.', 'worried'),
  line('dustin', "It's scared. It likes my chocolate bar.", 'happy'),
  line('will', "It has legs and a tail. That's not a cat.", 'worried'),
  line('mike', 'Dustin. We have a farm to check.', 'determined'),
  line('dustin', "Fine. But I'm calling it Dart."),
]);

/** In front of the fence gap. The BURN puzzle. */
const L4_VINES_HINT = script('l4_vines_hint', [
  line('mike', "That's the way into the patch. The gap is full of vines.", 'worried'),
  line('will', "They aren't Merrill's. They came up from underneath.", 'worried'),
  line('dustin', 'Same trick as the school. Hairspray and a lighter. Swap me in with {swapTo2}.', 'happy'),
  line('dustin', 'Face the vines and press {special}.'),
  line('lucas', 'And keep it off the pumpkin stand. Pumpkins burn too.'),
]);

const L4_VINES_DONE = script('l4_vines_done', [
  line('dustin', 'Burned clean. I should sell this stuff.', 'happy'),
  line('lucas', "Gate's open. It smells like a campfire in here."),
  line('will', "Something's moving past the first rows.", 'worried'),
  line('mike', 'Watch the ground. Stay close.', 'determined'),
]);

/** The first pumpkin rows. The rot. */
const L4_PATCH = script('l4_patch', [
  line('mike', 'Look at the pumpkins. Half of them are rotten.', 'shocked'),
  line('dustin', 'The rot comes up from below. Same stuff as the school and the Lab.', 'worried'),
  line('will', 'Pods in the soil. If you walk too close they swell. Then they burst.', 'worried'),
  line('lucas', "So we don't walk too close."),
  line('dustin', 'And the vines lash. Stay out of their reach, or burn them, or shoot them first.'),
]);

/** The barn yard. The SHOOT puzzle. */
const L4_SHOOT_HINT = script('l4_shoot_hint', [
  line('mike', 'The gate to the far field is chained shut. The chain runs up into the barn.', 'worried'),
  line('dustin', "There's a metal plate on the wall up there. Hit it and the chain lets go."),
  line('lucas', 'A rock over the wall will do it. Swap me in with {swapTo3}.', 'determined'),
  line('lucas', 'Face the barn and press {attack}. Line up straight on.'),
  line('will', "Careful. Something's circling in the yard.", 'worried'),
]);

const L4_SHOOT_DONE = script('l4_shoot_done', [
  line('lucas', 'Plate is down. The chain let go.'),
  line('dustin', 'Gate is open. Far field next.', 'happy'),
  line('will', 'The air is colder past it.', 'worried'),
  line('mike', 'Together. Eyes on the corn.', 'determined'),
]);

/** The far field, at the corn wall. The SENSE puzzle. Will feels something. */
const L4_SENSE_HINT = script('l4_sense_hint', [
  line('will', 'There is a gap in the corn. I can feel it, like a draft.', 'worried'),
  line('mike', "I see a wall of corn. There's no gap."),
  line('dustin', 'Will was the first to feel the Upside Down. Hear me out: the corn is hiding a door.'),
  line('dustin', 'Swap him in with {swapTo4} and walk up to it.'),
  line('lucas', "Mind the vines in the corn. They don't show until they hit."),
]);

const L4_SENSE_DONE = script('l4_sense_done', [
  line('will', 'There. The stalks parted.', 'determined'),
  line('lucas', 'How did you know?'),
  line('will', 'I always know. Somebody has to.'),
  line('mike', "Light the string just past it. Then we find the hole.", 'determined'),
]);

/** The hole. Three waves of young demodogs come up. */
const L4_AMBUSH = script('l4_ambush', [
  line('dustin', "That's the hole. It goes down, and it's been breathing.", 'shocked'),
  line('will', "They're coming up. Small ones. A lot of them.", 'worried'),
  line('lucas', 'Demodogs. They circle first, and they take turns. Watch the one that crouches.', 'determined'),
  line('mike', 'Back to back. When the d20 meter fills, press {burst}.', 'determined'),
  line('dustin', 'Fireballs work best when they bunch up.'),
]);

/** The last words before the results. A hook for the tunnels. */
const L4_CLEAR = script('l4_clear', [
  line('lucas', "That's all of them. The hole is still open.", 'worried'),
  line('will', "It goes under the whole town. I can hear it from here.", 'worried'),
  line('dustin', 'Tunnels. A whole network, right under Hawkins.', 'shocked'),
  line('mike', 'Then we go down. Together.', 'determined'),
  line('dustin', 'Somebody bring a flashlight.'),
]);

export const L4_SCRIPTS: DialogueScript[] = [
  L4_START, L4_MAX, L4_STREET, L4_DART, L4_VINES_HINT, L4_VINES_DONE, L4_PATCH, L4_SHOOT_HINT, L4_SHOOT_DONE, L4_SENSE_HINT,
  L4_SENSE_DONE, L4_AMBUSH, L4_CLEAR,
];
