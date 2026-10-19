// Every dialogue script for Level 15, stage 5.2 the Abyss, by id (ids and triggers are in docs/level-15.md). Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
// Will is locked into this stage (his bridge is on the route), so he does the talking, with the narrator. Whoever else the player picked, nobody
// else has a line: a party of four from ten should never hear a name that is not on the bench. Will feels the Upside Down before anyone, so he
// reads the place aloud, calm and a little tired; the hints say who can open each gate and always leave a way for a party that has nobody to do
// it (anyone's swing wears the vines and the wall down). Keys are {tokens} (see keyText in core/bindings.ts). Dialogue is off by default.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The landing. The Lab's gate has closed, and the first string of Joyce's lights hangs from a vine. */
const L15_START = script('l15_start', [
  line('narrator', 'Through the Lab\'s gate the air turns red. Pieces of Hawkins hang over a dark with no bottom.'),
  line('will', 'The gate closed behind us. The only way is on.', 'worried'),
  line('will', "Joyce's lights hang from the vines. Press {interact} by one to keep our place.", 'determined'),
]);

/** The road island, at the foot of the bridge north. The BURN puzzle. */
const L15_BURN_HINT = script('l15_burn_hint', [
  line('narrator', 'A wall of vines grows across the bridge north. It is dry as paper.'),
  line('will', "They'll burn. Dustin's hairspray, or Nancy's Molotov, if they came.", 'determined'),
  line('will', 'Nobody with fire? Face the vines and keep hitting them with {attack}.'),
]);

const L15_BURN_DONE = script('l15_burn_done', [
  line('narrator', 'The vines curl to ash and the bridge is clear.'),
  line('will', 'Quickly. The roots do not stay dead for long.', 'worried'),
]);

/** The road's east edge. The DASH puzzle, which only leads to the cache. */
const L15_GAP_HINT = script('l15_gap_hint', [
  line('narrator', 'The road has broken away. Past the gap, a ledge, and something that shines.'),
  line('will', "Too far to jump. Max could roll over it with {special}. We don't need it, though.", 'determined'),
]);

/** The deck, by the second string of lights. The SENSE puzzle. */
const L15_SENSE_HINT = script('l15_sense_hint', [
  line('will', 'There is a bridge north of here. I can feel it, like a pulse in the dark.', 'worried'),
  line('narrator', 'Everyone else sees nothing but the red void and a drop.'),
  line('will', "Swap me in and walk up to the edge. It'll show itself.", 'determined'),
]);

const L15_SENSE_DONE = script('l15_sense_done', [
  line('narrator', 'Planks of root slide out of the dark, one by one.'),
  line('will', 'There. It was always there.', 'happy'),
]);

/** The classroom's neck, by the third string of lights. The SMASH puzzle. */
const L15_CRACK_HINT = script('l15_crack_hint', [
  line('narrator', 'A wall has fallen across the neck. A crack runs right through it.'),
  line('will', "Steve's bat, or Hopper's fists. They'd bring it down in one.", 'determined'),
  line('will', 'If they stayed home, hit it with {attack} until it gives.'),
]);

const L15_CRACK_DONE = script('l15_crack_done', [
  line('narrator', 'The wall comes down in a cloud of red dust.'),
  line('will', 'The bridge past it runs to a ring of rock. Something is up there.', 'worried'),
]);

/** The ring. door1 comes down behind the party, and both twins wake. */
const L15_TWINS = script('l15_twins', [
  line('narrator', 'Behind you the rock falls, and the bridge is gone.'),
  line('will', 'Two of them. They move as one: while one charges, the other circles.', 'shocked'),
  line('will', 'Stay off the rim. Let them charge at the edge, and the dark will take them.', 'determined'),
]);

/** The last words before the results. A hook for the heart of the Abyss. */
const L15_CLEAR = script('l15_clear', [
  line('narrator', 'The last twin goes still, and the rock goes quiet.'),
  line('will', 'Something is waiting at the heart of this place. I can feel it looking back.', 'worried'),
  line('will', "Whatever it is, we go in together. We're not done yet.", 'determined'),
]);

export const L15_SCRIPTS: DialogueScript[] = [
  L15_START, L15_BURN_HINT, L15_BURN_DONE, L15_GAP_HINT, L15_SENSE_HINT, L15_SENSE_DONE, L15_CRACK_HINT, L15_CRACK_DONE, L15_TWINS, L15_CLEAR,
];
