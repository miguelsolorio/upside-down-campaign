// Every dialogue script for Level 5, stage 2.2 the tunnels, by id (ids and triggers are in docs/level-5.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// November, 1984, under Hawkins. Max and Steve are down here with the boys. Max is quick and dry and won't be told what to do.
// Steve is self-deprecating and protective ("Okay, kids, behind me") and keeps being proved right and wrong at once. Dustin
// explains, Lucas doubts, Mike is bossy and earnest, and Will notices first. Who is benched doesn't matter: the story assumes the
// whole crew is down there. Nobody says where Eleven is. Dialogue is off by default, so these are for players who turn story on.
// The puzzle tips carry the teaching. Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read
// as buttons on a controller. No line names a swap slot: the party is picked on the map, so who sits where changes.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The drop. The hole from the patch ends in a shaft of daylight. The first string of lights. */
const L5_START = script('l5_start', [
  line('dustin', 'Everybody down? Nobody broke anything important?', 'happy'),
  line('max', "Only my dignity. There's corn in my hair."),
  line('steve', "Great plan, Steve. Follow a pack of kids into a hole. Real leadership.", 'worried'),
  line('will', "It's colder than the patch. The roots are warm, though. Like they're breathing.", 'worried'),
  line('dustin', "I brought Joyce's spare lights. Press {interact} by them to light them."),
  line('dustin', 'Go down in here and you start again from the last string you lit.'),
]);

/** The drop's exit. Steve takes charge. Max won't be told. */
const L5_CREW = script('l5_crew', [
  line('steve', 'Okay, kids, behind me. Single file. I take point.', 'determined'),
  line('max', 'No.'),
  line('steve', "Max, it's a tunnel. Somebody has to go first."),
  line('max', "Then it's me. I'm faster, and I don't need a bat to feel brave."),
  line('mike', 'We all go. Nobody breaks the line.', 'determined'),
  line('steve', "Fine. I'll walk behind her. Protectively. From a respectful distance."),
]);

/** In front of gap1. The DASH puzzle. */
const L5_GAP_HINT = script('l5_gap_hint', [
  line('lucas', 'The floor stops. There is a gap across the whole tunnel, and no bottom to it.', 'worried'),
  line('steve', 'Nobody jump it. Nobody even think about jumping it.', 'worried'),
  line('max', "Please. I've cleared worse behind the arcade."),
  line('dustin', "She can't jump it, but she can roll over it. Max's skate dash goes right across."),
  line('dustin', 'Tag her in, face the gap and press {special}. The rest of us follow her trail.'),
]);

const L5_GAP_DONE = script('l5_gap_done', [
  line('max', 'Told you.'),
  line('steve', "She flew. I can't compete with that. I'm just here for the heavy lifting.", 'happy'),
  line('dustin', "We're across. I don't ask how the rest of us got over. Tunnel rules."),
  line('will', "Careful. Something is nested up ahead. I can hear it ticking.", 'worried'),
]);

/** The nest doorway. Pods and a vine. */
const L5_NEST = script('l5_nest', [
  line('will', "That's a nest. Every one of those pods is alive.", 'worried'),
  line('dustin', 'Spore pods. Get close and they swell, then burst. Same as the patch, but more of them.'),
  line('steve', "Okay, kids, nobody touches anything. Me included. Especially me."),
  line('max', "There's a vine at the far end. It's staring."),
  line('lucas', 'Then keep out of its reach, or take it down first.', 'determined'),
]);

/** In front of crack1. The SMASH puzzle. */
const L5_CRACK_HINT = script('l5_crack_hint', [
  line('lucas', 'A dead end to the north. The roots across it are cracked right through.', 'worried'),
  line('dustin', "There's something stashed back there. Eggos, I'd bet. A wall that thin is a bat's job."),
  line('steve', "My bat? It's a nail bat. It's not a battering ram.", 'worried'),
  line('mike', 'Steve, try it. Tag him in, face the crack and press {attack}.', 'determined'),
  line('max', "Take your time. We'll stand here and wait to be eaten."),
]);

const L5_CRACK_DONE = script('l5_crack_done', [
  line('steve', 'Hey, it worked. Try not to look so surprised.', 'happy'),
  line('dustin', 'Nice swing. Grab whatever is in there.'),
  line('max', "Somebody kept a pantry down here. That's a little unsettling."),
  line('lucas', "Quick. Whatever made that crack isn't far.", 'worried'),
]);

/** The long hall. Dart, grown, goes by. Story only. */
const L5_DART = script('l5_dart', [
  line('dustin', "Guys. Something just ran past. It's big and it has a tail.", 'shocked'),
  line('lucas', "It didn't attack. Why didn't it attack?", 'worried'),
  line('dustin', "That's Dart. He grew. He remembered the chocolate bar.", 'happy'),
  line('max', 'Your pet is a monster, Dustin.'),
  line('dustin', "He's a teenager. They go through phases."),
  line('steve', 'Hold on. You kept this? On purpose?', 'shocked'),
]);

/** The hub's doorway. The third string of lights. */
const L5_HUB = script('l5_hub', [
  line('will', "It's huge. The walls are all veins, and they're glowing.", 'worried'),
  line('mike', "I can see a ladder in the far corner. That's the way up.", 'determined'),
  line('steve', 'Light the string here. If this goes sideways, I want a place to come back to.'),
  line('dustin', "It's too quiet. Something is about to happen."),
  line('max', "Something always does."),
]);

/** In the hub. Three waves. */
const L5_AMBUSH = script('l5_ambush', [
  line('lucas', 'Here they come. All of them at once.', 'shocked'),
  line('dustin', 'Demodogs, in waves. The big ones hit harder, so watch the one with the thick coat.'),
  line('steve', "Okay, kids, behind me. Babysit's what I've got, so I'm using it.", 'determined'),
  line('max', "You're the one they're all looking at. Just so you know."),
  line('mike', 'Back to back. When the d20 meter fills, press {burst}.', 'determined'),
]);

/** The last words before the results. A hook for the Lab and the Gate. */
const L5_CLEAR = script('l5_clear', [
  line('will', "That's the last of them. The ladder is clear.", 'worried'),
  line('mike', 'It comes up near the Lab. The Gate is right under it.', 'determined'),
  line('dustin', 'The Gate. Where all of this comes from.', 'shocked'),
  line('steve', "I'll go up first. Somebody has to, and it's usually me, for some reason."),
  line('max', "Fine. I'm right behind you. Close enough to say I told you so."),
]);

export const L5_SCRIPTS: DialogueScript[] = [
  L5_START, L5_CREW, L5_GAP_HINT, L5_GAP_DONE, L5_NEST, L5_CRACK_HINT, L5_CRACK_DONE, L5_DART, L5_HUB, L5_AMBUSH, L5_CLEAR,
];
