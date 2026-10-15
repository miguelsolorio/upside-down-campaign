// Every dialogue script for Level 9, stage 3.3 the food court, by id (ids and triggers are in docs/level-9.md), and the chapter three
// epilogue, `l9_letter`. Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// The night of July 4th, 1985, back up in Starcourt. The whole crew is here, whoever is in the party (the story assumes everyone, as in
// 2.2 and the mall): Mike, Dustin, Lucas, Will, Eleven, Max, Steve, Robin and Nancy, and Hopper and Joyce at the lift, who go back down
// to the Key and are not seen again. Hopper is gruff and soft underneath, and in a hurry, and never says goodbye in so many words. Billy
// never speaks while he fights; he has one short line, once he is free. Eleven carries the beach: she reached him with a memory of a
// summer day that was not hers. Nancy is flat and decisive, Eleven speaks in short full sentences, Lucas doubts, Mike is earnest, Will
// notices first, Max is quick and dry, Steve hides behind things and says so, Robin rambles, Dustin explains. In l9_clear the floor
// shakes, the lights die, and somebody asks where Hopper is. Nobody answers. Dialogue is off by default, so these are for players who
// turn story on. Keys are {tokens} (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller.
// No line names a swap slot: the party is picked on the map, so who sits where changes.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The service hall. The lift has come up behind the court. Hopper and Joyce ride it back down; he leaves when this ends. */
const L9_START = script('l9_start', [
  line('hopper', "Lift's up, and that machine is still running. Joyce and I ride it back down.", 'determined'),
  line('joyce', 'Someone has to shut the Key off at the source. You hold the floor up here.', 'determined'),
  line('mike', 'We can come with you. We can split the work.', 'worried'),
  line('hopper', "No. Whatever's waking up in this mall, you keep it off the stairs."),
  line('dustin', 'The strings are hung again. Press {interact} by one to light it and save your place.'),
  line('hopper', 'Kitchens are east. Stay on the aisle. Go.', 'determined'),
]);

/** The kitchens' doorway. Fryers still hot, and melting rats among them. */
const L9_KITCHEN = script('l9_kitchen', [
  line('will', 'The fryers are still going. Oil bubbling and nobody here. That is worse than somebody.', 'worried'),
  line('max', 'Hot oil and things that burst. Great kitchen.'),
  line('dustin', 'Melting rats. They burst when they die and the goo slows you. Hit, then step back.'),
  line('steve', 'Okay, kids. Nothing hot, nothing wet, nothing moving. Touch none of it.', 'worried'),
  line('nancy', 'Stay on the aisle. East end of the room, then the concourse.', 'determined'),
]);

/** In front of crack1, the walk-in freezer's door. The SMASH puzzle. */
const L9_CRACK_HINT = script('l9_crack_hint', [
  line('robin', "That's the walk-in freezer, right behind that wall. See the crack? It runs the whole seam.", 'worried'),
  line('dustin', 'A walk-in freezer means frozen waffles. Do not ask me how long they keep.'),
  line('steve', 'A cracked wall? I have a bat for that. Okay, stand back. Robin, further back.', 'happy'),
  line('mike', 'Tag Steve in, face the crack and press {attack}.'),
]);

const L9_CRACK_DONE = script('l9_crack_done', [
  line('steve', 'Wall is down. The freezer is open for business.', 'happy'),
  line('dustin', 'Frozen waffles, a whole shelf of them. Take what you can carry.', 'happy'),
  line('will', 'It is freezing in there. Grab it and get out.', 'worried'),
]);

/** The concourse's south end. A Flayed crowd stands in the goo, and wakes when this ends. */
const L9_CONCOURSE = script('l9_concourse', [
  line('will', 'Every grille is down and the goo has climbed the pillars. It is nesting in here.', 'worried'),
  line('eleven', 'They are waiting. Their eyes are open.', 'worried'),
  line('dustin', 'Flayed. Slow, but they grab hard. If one grabs you, swap with {swapOr}.'),
  line('nancy', 'Do not get surrounded. Move north, and take them one at a time.', 'determined'),
  line('max', 'Escalators at the far end. Last one up buys snacks.'),
]);

/** In front of crate1, across the escalators' top. The PUSH puzzle. */
const L9_CRATE_HINT = script('l9_crate_hint', [
  line('lucas', 'A kiosk came down across the top of the escalator. It is wedged in the rails.'),
  line('dustin', 'Too heavy to lift, too heavy to drag. It needs the kind of shove that moves vans.'),
  line('eleven', 'I can move it. Stand back.', 'determined'),
  line('mike', 'Tag Eleven in, face the kiosk and press {attack}.'),
]);

const L9_CRATE_DONE = script('l9_crate_done', [
  line('eleven', 'It is open.'),
  line('steve', 'She moved a kiosk. With her hand. I am going to sit down in a minute.', 'shocked'),
  line('mike', 'Sit later. Up the escalator, all of us.', 'determined'),
]);

/** The top of the escalators. The mall's music goes sour. */
const L9_SOUR = script('l9_sour', [
  line('robin', 'Is it me, or has the mall music started sounding like it is playing under water?', 'worried'),
  line('dustin', 'Same song as downstairs. Every note is a little flat, and the tempo drags.'),
  line('will', 'It is the mall singing along. And getting it wrong.', 'worried'),
  line('eleven', 'It is close. Above us, in the dark.', 'worried'),
  line('mike', 'Then that is where we go.', 'determined'),
]);

/** The balcony. Goo wall to wall, and the third string of lights by the court's doors. */
const L9_BALCONY = script('l9_balcony', [
  line('max', 'The rail is slick. The whole balcony is goo, wall to wall.'),
  line('will', 'The goo is moving. Something is coming up through it.', 'worried'),
  line('nancy', 'Fight in the open lane. Do not back into a corner.', 'determined'),
  line('dustin', 'There is a string of lights by the court doors. Light it before we go in.'),
  line('mike', 'Once those doors shut, they stay shut. Heal up first.', 'determined'),
]);

/** Inside the court. The doors shut behind the party, and the fight starts when this ends. Billy never speaks. */
const L9_BILLY = script('l9_billy', [
  line('max', 'Billy. Billy, stop.', 'shocked'),
  line('lucas', 'Those are veins. All over his skin. That is not him.', 'shocked'),
  line('nancy', 'The doors are shut. Whatever happens, it happens in here.', 'determined'),
  line('dustin', 'He charges in a straight line and grabs up close. A wall stuns him. Hit him then.'),
  line('eleven', 'Wait for him to kneel. Then I reach him.', 'determined'),
  line('mike', 'Spread out. Keep him running.', 'determined'),
]);

/** Billy is pinned on his knees. The reach puzzle: Eleven stands close and holds still. */
const L9_BILLY_DOWN = script('l9_billy_down', [
  line('will', 'He stopped. He is on his knees, and he is not getting up.', 'worried'),
  line('dustin', 'Nothing we throw at him works now. Something is holding him there.'),
  line('eleven', 'He is still in there. I have to stand close.', 'determined'),
  line('mike', 'Tag Eleven in, walk her up to him and hold still. Keep the Flayed off her.', 'determined'),
]);

/** Billy is free. Eleven reached him with a day at the beach, and he has one line before the Mind Flayer comes in. */
const L9_BILLY_FREED = script('l9_billy_freed', [
  line('eleven', 'I went in after him. There was a beach.', 'determined'),
  line('eleven', 'Hot sand. Bright water. A summer day.'),
  line('eleven', 'It was not my memory. I gave it to him.'),
  line('max', 'Billy? It is us. You are okay.', 'worried'),
  line('billy', 'Get back. It is coming through the glass.', 'hurt'),
  line('dustin', 'The glass? The skylight! Everybody off the open floor!', 'shocked'),
]);

/** The Mind Flayer is down. The machine blows under the mall: the lights die and the floor shakes. Nobody answers Eleven. */
const L9_CLEAR = script('l9_clear', [
  line('nancy', 'It is down. It is really down.', 'determined'),
  line('robin', 'Why did the lights go out? Did anyone touch a switch? I did not touch a switch.', 'shocked'),
  line('dustin', 'That is the floor shaking. That is not us. That is coming from below.', 'shocked'),
  line('will', 'Something big just blew up. A long way down.', 'worried'),
  line('eleven', 'Where is Hopper?', 'worried'),
]);

/** The epilogue: Hopper's letter, read by Eleven the morning after, in his voice. Hers is the last line. */
const L9_LETTER = script('l9_letter', [
  line('hopper', "Don't pack the radio. Leave it on the shelf. I'll want it where I can find it."),
  line('hopper', "Spare key's under the porch step. If Joyce asks, you found it yourself."),
  line('hopper', "Tell Mike he did fine. Don't tell him I said so, or he'll make a speech about it."),
  line('hopper', "Eat a real breakfast. Get your feet wet somewhere that isn't a bathtub. Be loud on purpose."),
  line('hopper', "You don't have to be brave every minute. Sleep with the light on. I do."),
  line('hopper', "I'm not signing this. People who sign these are saying something I'm not saying."),
  line('eleven', 'I read it twice. I did not pack the radio.'),
]);

export const L9_SCRIPTS: DialogueScript[] = [
  L9_START, L9_KITCHEN, L9_CRACK_HINT, L9_CRACK_DONE, L9_CONCOURSE, L9_CRATE_HINT, L9_CRATE_DONE, L9_SOUR, L9_BALCONY, L9_BILLY,
  L9_BILLY_DOWN, L9_BILLY_FREED, L9_CLEAR, L9_LETTER,
];
