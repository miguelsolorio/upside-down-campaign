// Every dialogue script for Level 11, stage 4.2 the Hellfire Club and the Creel House, by id (ids and triggers are in docs/level-11.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Spring 1986, a stormy night in Hawkins. Eddie Munson joins the party in his club, Max gets her Walkman back from a school locker, and
// the party crosses town to the Creel House, where the ghouls step out of mirrors and a grandfather clock teaches the curse. The story
// assumes everyone, as in 3.3: any hero may speak, whoever was picked. Eddie is theatrical and nervous underneath: he talks like the
// dungeon master of his own campaign, jokes first and flinches first, and counts his scares. His greeting is his own. Max is quick and
// dry, Dustin explains, Mike is earnest, Will notices first, Lucas doubts, Nancy is flat and decisive, Robin rambles and Steve hides
// behind things and says so. The Walkman is her tape and nothing more is said about what it is for until the clock chimes. The curse
// script (l11_curse) names the two ways out in character, without keys: break the clock, which Eddie's guitar does at once and anyone
// else's hits do in a few, or Max's music, if she is in the party. The lines that teach a button use {tokens} (see keyText in
// core/bindings.ts), so they follow a rebind and read as buttons on a controller. No line names a swap slot: the party is picked on the
// map, so who sits where changes. Dialogue is off by default, so these are for players who turn story on.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The Hellfire Club, in the storm. Eddie joins; the first string of lights is by the board. */
const L11_START = script('l11_start', [
  line('narrator', 'Hawkins High after hours. Rain on the glass, and candles burning on a table of desks.'),
  line('eddie', 'Gather round, travelers! The map is out, the table is open and the dice are hungry.', 'happy'),
  line('dustin', 'Eddie, we need a guide. Something is picking kids off, one chime at a time.'),
  line('eddie', 'I heard. Everybody in town has an opinion about this club tonight. None of them are kind.', 'worried'),
  line('mike', 'The trail runs to the Creel House, across town. You have mapped it. We never have.'),
  line('eddie', 'I drew a dungeon like that once. Never meant to walk one. Fine. A guitar, a bad feeling, and me.', 'determined'),
  line('lucas', 'Good enough. Press {interact} by the string of lights to light it and save our place.'),
]);

/** In front of the lockers in the school hall. The `walkman` step comes first: the save has it from here. */
const L11_WALKMAN = script('l11_walkman', [
  line('narrator', 'The school hall, dark and empty. A long row of lockers, and one of them is hanging open.'),
  line('max', "That one's mine. I cleared it out in a hurry. Hold on."),
  line('max', "My Walkman. Right where I left it, tape and all. I thought it was gone for good.", 'happy'),
  line('eddie', 'A tape player in a school locker. The loot in this dungeon is humbler than I planned.'),
  line('dustin', 'Keep it close, Max. Something tells me that tape is going to matter.'),
  line('max', 'It always has.'),
]);

/** Out of the school doors, onto the street. Script only. */
const L11_STREET = script('l11_street', [
  line('narrator', 'Out the doors and into the storm. Hawkins is dark, and the street lamps flicker and buzz.'),
  line('will', 'The Creel House is across town, at the far end of this road.'),
  line('eddie', 'Nobody walks this way after dark. The whole street holds its breath when that house comes up.', 'worried'),
  line('nancy', 'Then we walk fast and stay together. Eyes up.', 'determined'),
]);

/** The Creel yard's gate. The second string of lights hangs by the porch. */
const L11_YARD = script('l11_yard', [
  line('narrator', 'The Creel yard. Dead trees, weeds up to the knee, and a porch with a sagging roof.'),
  line('robin', 'The gate was open. Nobody lives here, nobody mows, and the porch is, wow, extremely welcoming.'),
  line('eddie', 'Every campaign has a door like that one. The door you really should not open.', 'worried'),
  line('steve', 'Let me guess. We open it. I will hold it. From behind.'),
  line('dustin', 'There is a string of lights by the porch. Press {interact} to light it before we go in.'),
]);

/** The foyer, in front of mirror1. The riff gate: ghouls step out of the glass, and Eddie can break it. */
const L11_MIRROR_HINT = script('l11_mirror_hint', [
  line('narrator', 'A tall mirror fills the doorway to the hall, and something pale is standing inside the glass.'),
  line('will', "She's watching us. There are more of them behind her.", 'worried'),
  line('eddie', 'Glass wraiths. I put one in a module once. I never expected to meet her.', 'shocked'),
  line('lucas', "The mirror blocks the whole doorway. We can't go around it."),
  line('eddie', 'Then I will play it a riff. Break the glass, and everyone inside goes with it.', 'determined'),
  line('mike', 'Tag Eddie in, face the mirror and press {attack}.'),
]);

/** mirror1 shatters. Script only. */
const L11_MIRROR_DONE = script('l11_mirror_done', [
  line('eddie', 'Seven years of bad luck? Worth it for that sound.', 'happy'),
  line('dustin', 'Whatever was still inside went with the glass. Good riddance.'),
  line('nancy', 'More mirrors in the hall. Keep moving, and watch the glass.', 'determined'),
]);

/** The dining room, in front of mirror4, which closes the pantry. The cache. */
const L11_CACHE_HINT = script('l11_cache_hint', [
  line('robin', 'A pantry, and a mirror right across its door. Somebody did not want company in there.'),
  line('dustin', 'Pantries have snacks. I would bet my allowance there is something worth taking.'),
  line('eddie', 'A locked door with a ghost in it. Give me a second and a power chord.'),
  line('mike', 'Tag Eddie in, face the mirror and press {attack}.'),
]);

/** The parlor. The clock chimes and one of the party is lifted off the floor. The two ways out, without keys. */
const L11_CURSE = script('l11_curse', [
  line('narrator', 'The parlor. A grandfather clock stands by the wall, and every mirror here is watching.'),
  line('narrator', 'It strikes, a low bell that is slightly wrong, and one of the party rises off the floor.'),
  line('eddie', 'Four chimes. That is all the time they get. Then the floor is a long way down.', 'shocked'),
  line('nancy', 'Break the clock! Whatever rings that bell, we stop it.', 'determined'),
  line('eddie', 'My guitar does it in one go. Anyone else needs three good hits.', 'determined'),
  line('max', "Or my music. If I'm with you, swap me in and the tape drowns the bell out."),
  line('dustin', 'And the ghouls are coming out of the glass. Go, go, go!', 'worried'),
]);

/** The curse ends, however it ends. Script only. */
const L11_CURSE_END = script('l11_curse_end', [
  line('narrator', 'The red drains out of the room. The clock is silent, and nothing hangs in the air anymore.'),
  line('eddie', 'Remember that bell. I have a feeling we have not heard the last of it.', 'worried'),
]);

/** The back hall. Three mirrors, and the way out at the far end. The ghouls wake when this ends. */
const L11_FINALE = script('l11_finale', [
  line('narrator', 'The back hall. A long corridor, and three more mirrors standing in a row like a jury.'),
  line('will', 'The door at the far end is the way out. They know it.', 'worried'),
  line('eddie', 'One of them is bigger than the rest. See the cracks? They run red.', 'shocked'),
  line('lucas', "Stay together. Don't let them pin us against the wall."),
  line('eddie', 'Okay. Big finish. I have waited my whole life for a crowd.', 'determined'),
]);

/** The last ghoul falls and the back door opens. */
const L11_CLEAR = script('l11_clear', [
  line('narrator', 'The last ghoul falls to shards. The back door swings open on the rain.'),
  line('eddie', 'We are out! I want it on record that I only flinched twice.', 'happy'),
  line('mike', 'Three times. At least.'),
  line('max', 'Four. I counted.'),
  line('will', 'That bell was real. Whatever rings it is not finished with Hawkins.', 'worried'),
]);

export const L11_SCRIPTS: DialogueScript[] = [
  L11_START, L11_WALKMAN, L11_STREET, L11_YARD, L11_MIRROR_HINT, L11_MIRROR_DONE, L11_CACHE_HINT, L11_CURSE, L11_CURSE_END, L11_FINALE, L11_CLEAR,
];
