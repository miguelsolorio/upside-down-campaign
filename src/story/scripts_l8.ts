// Every dialogue script for Level 8, stage 3.2 the Russian base, by id (ids and triggers are in docs/level-8.md). Pure data: no DOM, so
// Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// July, 1985, under Starcourt. The freight lift came down into a Soviet base, and the whole crew is here, whoever is in the party (the
// story assumes everyone, as in 2.2 and the mall). Robin carries this one: she reads the doors out loud, sounds sure when she isn't, and
// translates worse the more scared she gets. Dustin explains the machine before anyone asks. Nancy is flat and decisive, Eleven speaks
// in short full sentences, Lucas doubts, Mike is earnest, Will notices first, Max is quick and dry, Steve hides behind things and says
// so. Grigori never speaks: the others talk about him and he says nothing. Nobody names what the Key is for. They only know it is
// opening something. Dialogue is off by default, so these are for players who turn story on. Keys are {tokens} (see keyText in
// core/bindings.ts), so the lines follow a rebind and read as buttons on a controller. No line names a swap slot: the party is picked
// on the map, so who sits where changes. Nobody counts the soldiers, so the roster can change without the words.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The lift drop. The freight lift has landed, and the first string of lights is here. */
const L8_START = script('l8_start', [
  line('robin', "I'd like it noted that I said no to the freight lift. Loudly. Twice.", 'worried'),
  line('dustin', 'A shaft this deep, and a floor at the bottom. Somebody dug this base on purpose.'),
  line('nancy', 'Keep it quiet. Keep it short. We find whatever they built this for.', 'determined'),
  line('dustin', 'Same strings as upstairs. Press {interact} by one to light it and save your place.'),
  line('eleven', 'The floor hums. Something big is awake.', 'worried'),
  line('mike', 'Robin reads the doors. Everybody else keeps her alive.', 'determined'),
]);

/** The bay's doorway. Crates, and rifles behind them. */
const L8_BAY = script('l8_bay', [
  line('nancy', 'Rifles. Behind the crates. They saw us come in.', 'determined'),
  line('robin', "Every crate has the same word on it. I think it's 'ammunition.' I'd like it to be 'fruit.'", 'shocked'),
  line('lucas', 'Their rounds stop at crates. So do ours. Pick a crate.'),
  line('steve', 'Okay, kids, behind me. Behind a crate. Behind me behind a crate.', 'worried'),
  line('dustin', "The red ! means a burst is coming. It aims where you're standing, so keep moving."),
]);

/** In front of cipher1. The READ puzzle: Robin stands close and the door turns to English. */
const L8_CIPHER_HINT = script('l8_cipher_hint', [
  line('lucas', "The corridor's shut. Steel door, a keypad, and a line of Russian over it.", 'worried'),
  line('robin', 'I took a year of Russian. Menus, mostly. And one love letter I never answered.'),
  line('robin', "Okay. The line says... stop. It says stop. That's the whole sign. It's big.", 'worried'),
  line('dustin', 'It decodes while Robin stands close. Put her in front, stay still, and wait.'),
  line('mike', 'Take all the time you need, Robin. Not all of it. A little less.', 'determined'),
]);

const L8_CIPHER_DONE = script('l8_cipher_done', [
  line('robin', "The letters turned to English while I read. 'Stop.' Then it opened. Mixed message.", 'shocked'),
  line('dustin', "It's a lock that trusts whoever can read it. Sloppy for a base. Lucky for us."),
  line('eleven', 'I hear boots past the door.', 'worried'),
  line('nancy', 'Then we go quietly. Weapons up.', 'determined'),
]);

/** In front of cipher2, the barracks door off the hall. The second READ puzzle. */
const L8_CACHE_HINT = script('l8_cache_hint', [
  line('will', 'Another door, off the hall. Same steel, same keypad.', 'worried'),
  line('robin', "This one says 'barracks.' I'm ninety percent sure. The other ten percent is 'barn.'"),
  line('dustin', 'Barracks means bunks, lockers and snacks. Soldiers hide snacks.'),
  line('max', 'Or boots. Mostly it will be boots.'),
  line('mike', "It's off the route. Robin, your call."),
]);

const L8_CACHE_DONE = script('l8_cache_done', [
  line('robin', "Barracks. I was right. I'd like that in writing.", 'happy'),
  line('steve', 'Take what you need. Leave the boots.', 'happy'),
  line('robin', "This tin says 'beet.' Or 'eat.' I'm taking it either way."),
  line('nancy', "Quick. We're not staying.", 'determined'),
]);

/** The lab's doorway. Rats in the cages, and something in the cells that rises when this ends. */
const L8_LAB = script('l8_lab', [
  line('will', 'Cages on the walls, full of rats. Cells along the back, and something in them.', 'worried'),
  line('robin', "The sign over the cages says 'do not feed.' Or 'do not fear.' Neither one is working.", 'shocked'),
  line('dustin', "Melting rats. They burst when they die and slow whoever's standing near. Keep moving."),
  line('eleven', 'Something is breathing in the cells.', 'worried'),
  line('nancy', "If one grabs you, swap with {swapOr}. Don't wait.", 'determined'),
]);

/** The control room. They see the Key through the window, and Grigori beside it. The third string of lights. */
const L8_CONTROL = script('l8_control', [
  line('dustin', "Before anyone asks: that's a boiler, and the cable runs into the wall behind it."),
  line('robin', "The console says 'pressure' and 'danger.' I didn't need a dictionary for the second one.", 'shocked'),
  line('dustin', "It's the Key, and it's opening something. I can't say what. I just know it's big."),
  line('nancy', "There. Past the glass. He hasn't moved.", 'determined'),
  line('eleven', 'He knows we are here. He is waiting.', 'worried'),
  line('lucas', 'See the plate on the floor and the red switch on the wall? The switch feeds the plate.'),
  line('dustin', 'Lure him onto the plate, then shoot the switch. Shots fly over walls.'),
  line('mike', 'Light the string first. Once the doors shut, they stay shut.', 'determined'),
]);

/** Inside the chamber. The doors close behind the party, and the fight starts when this ends. Grigori never speaks. */
const L8_GRIGORI = script('l8_grigori', [
  line('robin', 'The doors shut. The sign over them has a new word. I would rather not know it.', 'shocked'),
  line('nancy', "He's coming straight at us. Spread out.", 'determined'),
  line('mike', 'His front takes a quarter of every hit. Go round and hit his back when he swings.', 'determined'),
  line('dustin', 'He grabs, too. If he does, swap with {swapOr}.'),
  line('lucas', "Plate and switch. I'll believe it when he steps on it."),
  line('eleven', 'He does not talk. He does not stop.', 'worried'),
]);

/** The last words before the results. The doors open, and the way up to the food court is clear. */
const L8_CLEAR = script('l8_clear', [
  line('nancy', "He's down. Doors are open.", 'determined'),
  line('dustin', "The machine's still running. Whatever it's opening, it isn't done."),
  line('robin', "The plate by the door says 'do not touch.' In English, too. That's considerate."),
  line('eleven', 'Something is waking up. Above us.', 'worried'),
  line('mike', "That's the food court over our heads. We go up.", 'determined'),
]);

export const L8_SCRIPTS: DialogueScript[] = [
  L8_START, L8_BAY, L8_CIPHER_HINT, L8_CIPHER_DONE, L8_CACHE_HINT, L8_CACHE_DONE, L8_LAB, L8_CONTROL, L8_GRIGORI, L8_CLEAR,
];
