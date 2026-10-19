// Every dialogue script for Level 13, stage 4.4 Vecna's lair, by id (ids and triggers are in docs/level-13.md). Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters.
// Spring 1986. The party goes into the Creel House in the Upside Down and up to the attic, where Vecna floats bound in his vines. Eddie fell in 4.3
// and Hopper is still in Kamchatka, so neither speaks; the story assumes everyone else, as in 4.2: any hero may speak, whoever was picked. Vecna is
// slow and certain, a few words at a time, and never raises his voice. The party is quick and tired and grieving, and says so in short lines. The two
// ways out of the clock (the marked orb, Max's Walkman) are named in character, without keys, in l13_vecna; the float and the burn each get one thing a
// player needs, and no line counts the enemies, so the roster can change without the words. Eleven keeps to two words a line, as before 2.3.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The porch. Safe: the first string of lights hangs here. */
const L13_START = script('l13_start', [
  line('narrator', 'The Creel House, turned inside out. Red veins crawl over the porch, and the windows glow.'),
  line('mike', 'Eddie bought us this chance. We are not wasting it.', 'determined'),
  line('will', 'Light the string of lights on the porch first. Then we always have a way back.'),
  line('nancy', 'Stay together. Whatever waits in the attic wants us apart.', 'determined'),
  line('robin', 'Rotten boards, red veins and a bad feeling. Honestly, a normal Tuesday.'),
]);

/** The foyer. The foyer's demodogs and vines wake when this ends. */
const L13_HOUSE = script('l13_house', [
  line('narrator', 'The foyer. The wallpaper has split open, and something is breathing behind the sheets.'),
  line('lucas', 'Demodogs, from both ends of the room. Back to back!', 'worried'),
  line('robin', 'And vines in the north corners. Keep off them, they grab.'),
  line('steve', 'I will take the middle. Where everybody can see me being brave.'),
]);

/** The foot of the stairs. The landing wakes when this ends. */
const L13_STAIRS = script('l13_stairs', [
  line('narrator', 'Vines have swallowed the stairs. The way up is the gap beside them, and something waits.'),
  line('will', 'Wings, up on the landing. A lot of them. And claws on the boards.', 'worried'),
  line('dustin', 'They heard us coming. They always do.'),
  line('mike', 'Then we go up through them. One step at a time.', 'determined'),
]);

/** The attic. The door shuts behind the party, the music changes, and Vecna wakes when this ends. */
const L13_VECNA = script('l13_vecna', [
  line('narrator', 'The attic. Vines hang from the rafters in a knot, and Vecna floats in the middle of it.'),
  line('vecna', 'Every clock ends. Yours too.'),
  line('dustin', 'Those red bulbs on the floor feed him. Break them and he stops healing.'),
  line('will', 'When the clock chimes, one bulb turns red. Break that one and the curse breaks with it.'),
  line('max', "Or my tape. If I'm with you, swap me in and the music holds it off."),
  line('mike', 'Burn the vines, break the bulbs, hit him. Do not stop.', 'determined'),
  line('vecna', 'Begin.'),
]);

/** Vecna at 60%: he rises out of reach. Script only. */
const L13_FLOAT = script('l13_float', [
  line('narrator', 'Vecna lifts off the floor, out of reach, and the vines spread across the rafters.'),
  line('vecna', 'Look up. See how small you are.'),
  line('lucas', 'Shots and beams still reach him. Swings do not.', 'worried'),
  line('robin', 'Break a red bulb and he drops to the floor for a few seconds. Go for it!'),
  line('dustin', 'They grow back, so pull him down again whenever you need to.'),
]);

/** Vecna at 25%: he burns, and the whip and the clock both quicken. Script only. */
const L13_BURN = script('l13_burn', [
  line('narrator', 'Fire climbs his arms and he does not feel it. The vines lash faster, and the clock too.'),
  line('vecna', 'Even fire keeps time.'),
  line('eleven', 'End it.', 'determined'),
  line('robin', 'The bell is twice as quick! Do not let it take us all at once.', 'shocked'),
  line('mike', 'Almost there. Give it everything!', 'determined'),
]);

/** The last orb falls with him and the attic door opens. The end of chapter four. */
const L13_CLEAR = script('l13_clear', [
  line('narrator', 'Vecna drops to his knees. The vines go slack, the bulbs wither, and the clock stops.'),
  line('vecna', 'What I opened stays open.', 'hurt'),
  line('will', 'Something just opened outside, all over Hawkins. I can feel it from here.', 'worried'),
  line('mike', 'We stopped him tonight. We will stop him again.', 'determined'),
  line('narrator', 'Hawkins, spring of 1986. The gates are open, and the town does not know it yet.'),
]);

export const L13_SCRIPTS: DialogueScript[] = [L13_START, L13_HOUSE, L13_STAIRS, L13_VECNA, L13_FLOAT, L13_BURN, L13_CLEAR];
