// Every dialogue script for Level 6, stage 2.3 the Gate, by id (ids and triggers are in docs/level-6.md). Pure data: no DOM, so Node
// can test it. Each line fits the dialogue box: three rows of 32 characters.
// November, 1984. The tunnel came up inside Hawkins Lab, which the Upside Down has swallowed, and the whole crew is down here:
// Mike, Dustin, Lucas, Will, Max and Steve, whoever is in the party (the story assumes everyone, as in 2.2). Max is quick and dry,
// Steve self-deprecating ("Okay, kids, behind me"), Dustin explains, Lucas doubts, Will notices first, Mike is bossy and earnest.
// Eleven and Hopper first speak at the Gate. Eleven has grown since 1.1 and talks in short sentences now. Hopper is gruff and soft
// underneath. The boys see Eleven again in l6_gate, and Mike gets the line. Dialogue is off by default, so these are for players
// who turn story on. Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a
// controller. No line names a swap slot: the party is picked on the map, so who sits where changes.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The tunnel mouth. The tunnel ends in a hole in the Lab's wall. */
const L6_START = script('l6_start', [
  line('dustin', "The tunnel ends inside a wall. Hawkins Lab. We're in.", 'shocked'),
  line('will', "The walls are wet, and warm. Something grew over everything.", 'worried'),
  line('mike', 'The Gate is down here. We find it and we shut it.', 'determined'),
  line('steve', 'Okay, kids, behind me. Slowly. Quietly. Mostly slowly.'),
  line('max', "I'm walking ahead of you. Try to keep up."),
  line('dustin', 'Lights again. Press {interact} by a string to light it.'),
  line('dustin', 'Go down in here and you start again from the last one you lit.'),
]);

/** In front of crack1. The SMASH puzzle. */
const L6_CRACK_HINT = script('l6_crack_hint', [
  line('lucas', "The corridor stops. A wall of roots, cracked right through.", 'worried'),
  line('dustin', "It's thin. A good swing would take it out."),
  line('steve', "A good swing. From me. I'm the guy who hits things.", 'worried'),
  line('mike', 'Tag Steve in, face the wall and press {attack}.', 'determined'),
  line('max', 'Swing hard. It was a long day for that wall too.'),
]);

const L6_CRACK_DONE = script('l6_crack_done', [
  line('steve', "Hey. Down in one. Don't tell the wall I was surprised.", 'happy'),
  line('will', "That was loud. Something heard it.", 'worried'),
  line('lucas', 'Then be ready. Weapons up.', 'determined'),
]);

/** The storage doorway. Pods, a vine and two demodogs. */
const L6_STORAGE = script('l6_storage', [
  line('dustin', 'Storage. Shelves, crates, and pods. A lot of pods.'),
  line('will', "They swell when you walk close, then burst. Keep away from them.", 'worried'),
  line('lucas', 'I count two demodogs and a vine by the east wall.', 'determined'),
  line('max', "If a pod pops, I'm blaming Dustin."),
  line('mike', 'Stay in the aisles. Take them one at a time.', 'determined'),
]);

/** In front of gap1. The DASH puzzle. */
const L6_GAP_HINT = script('l6_gap_hint', [
  line('lucas', 'A side room past the east door. A drop across the doorway.'),
  line('max', "A drop doesn't scare me. Tag me in."),
  line('dustin', 'Face the gap and press {special}. Her skate dash rolls right over it.'),
  line('steve', "Everybody follow her trail. Don't copy her. Follow her.", 'worried'),
]);

const L6_GAP_DONE = script('l6_gap_done', [
  line('max', 'Told you. Now grab whatever is in there.'),
  line('steve', "She rolls over things. I hit things. It's a system.", 'happy'),
  line('dustin', "Don't linger. The stairs are the other way."),
]);

/** Outside the loading bay. The second lights. */
const L6_DEN = script('l6_den', [
  line('will', 'Something big is breathing behind those doors.', 'worried'),
  line('dustin', "Every pack has an Alpha. That's where it sleeps."),
  line('steve', "Light the string first. If this goes wrong, we come back here."),
  line('mike', "Then we go in together. Nobody runs off.", 'determined'),
]);

/** The seals shut behind them and the Alpha wakes. */
const L6_ALPHA = script('l6_alpha', [
  line('lucas', 'The vines closed behind us!', 'shocked'),
  line('dustin', "It's a den. Nobody leaves until one side is done."),
  line('will', "It's awake. It's looking right at us.", 'worried'),
  line('mike', "Dodge the lunge. Hit it when it howls. It can't move then.", 'determined'),
  line('steve', "Okay, kids, behind me. It's mostly looking at me anyway."),
]);

/** The Alpha is down and the seals let go. */
const L6_ALPHA_DOWN = script('l6_alpha_down', [
  line('lucas', "It's down. The vines are letting go.", 'happy'),
  line('will', "Listen. That hum is coming from up the stairs.", 'worried'),
  line('dustin', "It's the Gate. And it sounds close."),
  line('max', "That's a lot of dog. Let's not do that again."),
  line('mike', 'Then we go up. Everybody still standing?', 'determined'),
]);

/** The Gate chamber's doorway. Eleven and Hopper are at the rift. Mike gets the line. */
const L6_GATE = script('l6_gate', [
  line('mike', "Eleven. It's you. It's really you.", 'shocked'),
  line('eleven', 'Mike. You came.', 'happy'),
  line('hopper', "Kid's holding the Gate shut. Barely. Don't hug her yet.", 'determined'),
  line('eleven', 'I can close it. I need time.', 'determined'),
  line('hopper', 'Forty-five seconds. Keep them off her.'),
  line('steve', "Light the string behind us first. If she goes down, we come back here."),
]);

/** In front of the rift. The defense starts when it ends. */
const L6_DEFEND = script('l6_defend', [
  line('eleven', 'Now. Keep them off me.', 'determined'),
  line('hopper', "You heard her. Nothing touches that kid."),
  line('dustin', "They go for her first. Get close or hit them, and they turn on you."),
  line('steve', 'Okay, kids, behind me. And around her. Mostly around her.', 'determined'),
]);

/** The Gate is shut and Eleven comes home. */
const L6_CLEAR = script('l6_clear', [
  line('eleven', 'Done. It is shut.', 'happy'),
  line('hopper', "That's it. The Gate's closed. Nobody ever speaks of this."),
  line('mike', "El. You're coming home with us.", 'happy'),
  line('eleven', 'Home?', 'worried'),
  line('mike', 'Home. My basement. We have snacks.', 'happy'),
  line('hopper', 'Coffee first. Monsters second. Then your basement.'),
]);

export const L6_SCRIPTS: DialogueScript[] = [
  L6_START, L6_CRACK_HINT, L6_CRACK_DONE, L6_STORAGE, L6_GAP_HINT, L6_GAP_DONE, L6_DEN, L6_ALPHA, L6_ALPHA_DOWN, L6_GATE, L6_DEFEND, L6_CLEAR,
];
