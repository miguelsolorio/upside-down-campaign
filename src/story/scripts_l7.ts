// Every dialogue script for Level 7, stage 3.1 Starcourt Mall, by id (ids and triggers are in docs/level-7.md). Pure data: no DOM, so
// Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// July, 1985, after closing. The whole crew is at the mall, whoever is in the party (the story assumes everyone, as in 2.2): Mike,
// Dustin, Lucas, Will, Eleven, Max and Steve, and Robin and Nancy, who join here. Robin rambles and gets worse under stress. Nancy is
// flat and decisive. Erica, Lucas's sister, works the Scoops Ahoy counter, is bossy and dry and talks business. Eleven speaks in short
// full sentences now. Steve and Robin wear the sailor suits and know the shop. Dustin explains, Lucas doubts, Mike is earnest, Will
// notices first, Max is quick and dry. Dialogue is off by default, so these are for players who turn story on. Keys are {tokens}
// (see keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller. No line names a swap slot: the
// party is picked on the map, so who sits where changes. Nobody counts the soldiers, so the roster can change without the words.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The west entrance. The glass doors are unlocked, and the first string of lights is here. */
const L7_START = script('l7_start', [
  line('robin', "Closed mall, no guards, and a kid who says Russians built a base under it. Normal Tuesday.", 'worried'),
  line('nancy', 'Stay together. Stay quiet. We find the way down and we do not stop.', 'determined'),
  line('eleven', 'Something is under here. It is waiting.', 'worried'),
  line('dustin', 'I brought the lights. Press {interact} by a string to light it.'),
  line('dustin', 'Go down in here and you start again from the last string you lit.'),
]);

/** The Scoops Ahoy doorway. Steve and Robin's shop, and Erica behind the counter. */
const L7_SCOOPS = script('l7_scoops', [
  line('steve', 'Welcome to Scoops Ahoy. Please do not touch the hat.', 'happy'),
  line('robin', "The sailor suit itches. I'd explain how I ended up in it, but there isn't time."),
  line('erica', "You're late. I've been here since closing. Somebody has to keep the books."),
  line('lucas', 'Erica. Go home.', 'worried'),
  line('erica', "Not a chance. I'm coming, and the rate is a quarter a favor. I'll send a bill."),
]);

/** In front of shutter1. The panel puzzle: a shot, or anyone up close. */
const L7_SHUTTER_HINT = script('l7_shutter_hint', [
  line('robin', "That's the security shutter. It drops when the alarm trips. It once caught a mop bucket.", 'worried'),
  line('nancy', 'The release panel is beside it. Hit it and the shutter goes up.', 'determined'),
  line('lucas', "A slingshot or a pistol reaches it from here. Face the panel and press {attack}."),
  line('dustin', 'Anyone else can walk up and hit it. Same button, close enough to touch.'),
]);

const L7_SHUTTER_DONE = script('l7_shutter_done', [
  line('nancy', 'It is open. Go.', 'determined'),
  line('robin', 'That is the loudest thing I have ever heard a building do. Is the whole mall awake now?', 'shocked'),
  line('eleven', 'Yes. Be ready.', 'worried'),
]);

/** Scoops Ahoy's back room, behind the counter. The SMASH puzzle. */
const L7_CRACK_HINT = script('l7_crack_hint', [
  line('erica', "That's the stock room. The good stuff is in there. Priced accordingly.", 'determined'),
  line('lucas', "It's a wall with a crack in it. A thin one."),
  line('steve', "A crack? I have a bat for that. Okay, kids, stand back. Okay, Robin, stand back.", 'happy'),
  line('mike', 'Tag Steve in, face the crack and press {attack}.', 'determined'),
]);

const L7_CRACK_DONE = script('l7_crack_done', [
  line('steve', 'Wall down. Stock room is open for business.', 'happy'),
  line('erica', 'Take what you need. Put the receipt in my hand.'),
  line('robin', 'Those are good scoops. I would know. I made them.'),
]);

/** The court's doorway. The goo spreads in from a corner, and it moves. */
const L7_COURT = script('l7_court', [
  line('will', "The fountain's still running. It shouldn't be. And the floor in that corner is wet.", 'worried'),
  line('max', 'That is not water. It is spreading.'),
  line('nancy', 'Weapons ready. Do not let anything near you.', 'determined'),
  line('robin', 'It is rising. Why is it rising. I do not like when things rise.', 'shocked'),
]);

/** The east concourse, in front of crate1. The PUSH puzzle. */
const L7_CRATE_HINT = script('l7_crate_hint', [
  line('mike', 'That kiosk fell over the shop door. There might be supplies behind it.'),
  line('dustin', "It's too heavy to lift. It needs a shove, the kind that moves vans."),
  line('eleven', 'I can do that. Stand back.', 'determined'),
  line('lucas', 'Tag her in, face the kiosk and press {attack}.'),
]);

const L7_CRATE_DONE = script('l7_crate_done', [
  line('eleven', 'It moved.', 'determined'),
  line('erica', 'Nice work. That is another favor on the bill.'),
  line('mike', 'Grab what you need. We keep going.', 'determined'),
]);

/** The service corridor door. Nancy spots the soldiers. The third string of lights. */
const L7_SERVICE = script('l7_service', [
  line('nancy', 'Soldiers. Rifles. They are watching the corridor.', 'determined'),
  line('lucas', 'Russians. The kid was right.', 'worried'),
  line('nancy', 'Stay behind the boxes. Cover me. I am going in.', 'determined'),
  line('robin', 'I speak four languages and none cover this.', 'shocked'),
  line('dustin', 'Light the string first, and then we go.'),
]);

/** In the loading dock. The goo rises in three waves. */
const L7_AMBUSH = script('l7_ambush', [
  line('will', 'The floor is moving. All of it.', 'shocked'),
  line('robin', 'Do not panic. Rule one. Rule two. I do not have a rule two. Panic a little.', 'shocked'),
  line('nancy', 'Back to back. Pick one target at a time.', 'determined'),
  line('eleven', 'More are coming. Stay close.', 'worried'),
  line('mike', 'When the d20 meter fills, press {burst}.', 'determined'),
]);

/** The last words before the results. The freight lift goes down to the base. */
const L7_CLEAR = script('l7_clear', [
  line('nancy', 'That is the last of them. The lift is clear.', 'determined'),
  line('dustin', "It's a freight lift. Rated for a truck. It goes down, all the way to the base.", 'happy'),
  line('eleven', 'The Russians are down there.', 'worried'),
  line('robin', 'Great. Wonderful. Everyone in the lift. Nobody say anything brave.'),
  line('erica', 'I want hazard pay.'),
]);

export const L7_SCRIPTS: DialogueScript[] = [
  L7_START, L7_SCOOPS, L7_SHUTTER_HINT, L7_SHUTTER_DONE, L7_CRACK_HINT, L7_CRACK_DONE, L7_COURT, L7_CRATE_HINT, L7_CRATE_DONE,
  L7_SERVICE, L7_AMBUSH, L7_CLEAR,
];
