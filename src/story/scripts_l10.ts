// Every dialogue script for Level 10, stage 4.1 Kamchatka, by id (ids and triggers are in docs/level-10.md). Pure data: no DOM, so Node can
// test it. Each line fits the dialogue box: three rows of 32 characters.
// Spring 1986. Hopper is alone in a prison camp on the Kamchatka peninsula, and plays alone for the first time, so every line is his or the
// narrator's: he talks to himself, to Joyce in his head, and once to the beast. He is gruff and deadpan, and soft underneath. The care package
// is Joyce's lights in a crate from home, with a note; it stays short and warm. He teaches the stage out loud, the way a man talks himself
// through a job: what a guard's rifle does, what a baton guard's block is for, what the cracks want and what finishes the beast. Dialogue is
// off by default, so these are for players who turn story on. Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind
// and read as buttons on a controller. No line names a swap slot: there is nobody to swap to.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The work yard. Joyce's lights wait in a crate by the fence: the first save point. */
const L10_START = script('l10_start', [
  line('narrator', 'Kamchatka, spring of 1986. A work yard inside the wire, and snow to the knees.'),
  line('hopper', "Cold enough to crack a tooth. Fine. Means I can still feel my face.", 'worried'),
  line('narrator', "By the fence sits a crate that was not here yesterday. Joyce's handwriting is on the lid."),
  line('hopper', 'Christmas lights. She mailed me Christmas lights. To a prison camp.', 'happy'),
  line('hopper', "Note says, hang these where it's dark. Porch light stays on."),
  line('hopper', 'Okay, Joyce. Press {interact} by a string to light it and keep my place.', 'determined'),
]);

/** The snow yard's south edge. The floodlight, the rifles and the baton guard. */
const L10_YARD = script('l10_yard', [
  line('hopper', 'Floodlight, rifles, and guards walking circles round it. Cozy.', 'worried'),
  line('hopper', "Rifles fire in bursts, aimed where I stand. So I won't stand there."),
  line('hopper', 'Crates and drums stop bullets. Use them.'),
  line('hopper', 'The one with the baton keeps it raised. A slam on {special} breaks that open.', 'determined'),
]);

/** In front of crack1, the iced-over side door. The SMASH puzzle. */
const L10_CRACK_HINT = script('l10_crack_hint', [
  line('hopper', "A side door into the block, iced over. There's a crack down the middle."),
  line('hopper', "Frozen concrete. I've hit worse on a bad day."),
  line('hopper', 'Face the crack and press {attack}.', 'determined'),
]);

const L10_CRACK_DONE = script('l10_crack_done', [
  line('hopper', "That's one way to knock.", 'happy'),
  line('hopper', 'Wet concrete and cold soup. I can smell it from here.'),
  line('hopper', "Nobody's shouting. That never lasts.", 'worried'),
]);

/** Inside the block. The guard room's sleepers wake when this ends. */
const L10_BLOCK = script('l10_block', [
  line('hopper', 'A cell block. I know this view. Usually from the other side.'),
  line('hopper', 'Boots, and more than one pair. Somebody heard that door.', 'worried'),
  line('hopper', 'Back to the wall, and let them come at me one at a time.', 'determined'),
  line('hopper', "I've been in worse corridors. Not many."),
]);

/** In front of crack2, across a cell door in the corridor. The cache. */
const L10_CELL_HINT = script('l10_cell_hint', [
  line('hopper', 'This cell has a crack across its door. Somebody hid something in there.'),
  line('hopper', "Food, if I'm lucky. Joyce would tell me to check. Joyce would be right."),
  line('hopper', 'Face the crack and press {attack}.', 'determined'),
]);

/** The shaft's landing: the third string of lights, last before the pit. */
const L10_SHAFT = script('l10_shaft', [
  line('narrator', 'The corridor ends at the shaft. Grates in the floor, and a passage cut down into the rock.'),
  line('hopper', "Something's down there. I can hear it breathing through the stone.", 'worried'),
  line('hopper', 'A string of lights, last one before the bottom. Press {interact} to light it.'),
  line('hopper', 'Okay, Joyce. Porch light on. Like you said.', 'determined'),
]);

/** Inside the pit. The door shuts behind him and the Demogorgon wakes when this ends. */
const L10_PIT = script('l10_pit', [
  line('narrator', 'The door slams shut. In the far wall, nailed planks groan.'),
  line('hopper', 'A barricade, nailed on from this side. Somebody built a cage and forgot to tell me.', 'shocked'),
  line('hopper', "Easy, pal. I'm not the one who put you down here."),
  line('hopper', "No? Didn't think so.", 'worried'),
  line('hopper', 'It charges in a straight line. Let it hit a wall. Three good bumps and it stays down.', 'determined'),
]);

/** The Demogorgon is pinned. The finisher: a slam, close to it. */
const L10_PIT_DOWN = script('l10_pit_down', [
  line('hopper', "It's on its knees, and every punch just bounces off.", 'shocked'),
  line('hopper', 'Fists do nothing now. The floor, though. Get close and slam it with {special}.', 'determined'),
]);

/** The beast is dead. The door opens. */
const L10_CLEAR = script('l10_clear', [
  line('narrator', 'The beast shudders once and goes still. The pit is quiet.'),
  line('hopper', 'Sorry, pal.', 'hurt'),
  line('hopper', 'Still in the wire. Still breathing. Call it a start.'),
  line('hopper', "Door's open. Next problem.", 'determined'),
]);

export const L10_SCRIPTS: DialogueScript[] = [
  L10_START, L10_YARD, L10_CRACK_HINT, L10_CRACK_DONE, L10_BLOCK, L10_CELL_HINT, L10_SHAFT, L10_PIT, L10_PIT_DOWN, L10_CLEAR,
];
