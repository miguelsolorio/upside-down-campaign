// Every dialogue script for Level 12, stage 4.3 Upside Down Hawkins, by id (ids and triggers are in docs/level-12.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Spring 1986, the night the gates open. The party crosses Hawkins on the far side, under a storm: the street, the alley's mirror, the
// trailer park and the roof of Eddie's trailer. The story assumes everyone, as in 4.2: any hero may speak, whoever was picked. Eddie is
// theatrical and nervous underneath, and on the roof he is brave anyway: l12_roof and l12_solo are his, and nothing from him after the
// song. l12_fall is the party's. The three clock scripts get shorter each time, since the curse has been taught in 4.2: the first
// reminds, the next two are asides. The mirror hint points at the attack button ({attack}, see keyText in core/bindings.ts), so it
// follows a rebind. No line names a swap slot, counts the foes, or quotes the show. Dialogue is off by default, so these are for players
// who turn story on.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** The tear, the start. The first string of lights hangs above it. */
const L12_START = script('l12_start', [
  line('narrator', 'The Gate shuts behind them. This is Hawkins, rotted red, under a sky full of lightning.'),
  line('dustin', "Same streets, same houses. They're all dipped in rot. Stay close.", 'worried'),
  line('eddie', "Close. Sure. I'm a professional. My knees just haven't heard.", 'worried'),
  line('will', 'It feels like the whole town is holding its breath.'),
  line('mike', 'Light the string above the tear first. Press {interact} and we have somewhere to come back to.'),
]);

/** The street's west end. The flock over the road wakes when this ends. */
const L12_STREET = script('l12_street', [
  line('narrator', 'A long street of dark houses. The lamps are dead, and something moves on the roofs.'),
  line('robin', "Is it just me, or are the roofs breathing? Because I'd rather it was just me.", 'worried'),
  line('will', "Not the roofs. Something on them. It's flapping.", 'worried'),
  line('dustin', "Demobats. They fly in flocks, they circle, and then one dives. Don't stand still."),
  line('nancy', 'Then we keep walking. Eyes up.', 'determined'),
]);

/** The clock in the first yard. The curse step comes first: the chime has sounded and a hero is off the floor. */
const L12_CLOCK1 = script('l12_clock1', [
  line('narrator', 'A grandfather clock stands in the yard, face dark. It chimes, and one of the party rises.'),
  line('dustin', "Another one! Four chimes and that's it. Break the clock!", 'shocked'),
  line('eddie', 'My guitar does it in one swing. Anyone else needs three good hits.', 'determined'),
  line('mike', 'Get to it. Go!'),
]);

/** The side street, in front of the alley's mirror. The riff gate: ghouls wait in the glass, and Eddie can break it. */
const L12_MIRROR_HINT = script('l12_mirror_hint', [
  line('narrator', 'The alley between the houses is shut by a tall mirror. Something pale stands in the glass.'),
  line('will', "She's looking right at us. There are more behind her.", 'worried'),
  line('lucas', "It's the only way through. There's no road around it."),
  line('steve', "Great. A door that stares back. I'll wait here and hold the, uh, street."),
  line('eddie', 'Same trick as the Creel House. A riff and the whole pane goes, and everyone in it.', 'determined'),
  line('dustin', 'Face the mirror with Eddie and press {attack}.'),
]);

/** The corner where the alley comes out. The second clock. */
const L12_CLOCK2 = script('l12_clock2', [
  line('narrator', 'On the corner, another clock. The bell rolls down the street like thunder.'),
  line('max', "Of course there's another one. Break it before the fourth chime.", 'determined'),
  line('eddie', 'Already swinging. Somebody keep an eye on the glass behind us.', 'worried'),
]);

/** The trailer park's gate. The second string of lights hangs behind it on the cross street. The flock over the lanes wakes when this ends. */
const L12_PARK = script('l12_park', [
  line('narrator', 'Forest Hills. Rows of trailers, a sagging fence, and not a window lit for miles.'),
  line('eddie', "Home sweet home. Mine's the one at the far end, with the dent. Try not to judge the lawn.", 'worried'),
  line('robin', "It's very cozy. Very, very quiet. I hate how quiet it is."),
  line('dustin', "Wings over the lanes. They saw us come in.", 'worried'),
  line('nancy', 'Stay together and keep to the middle. Nobody drifts off.', 'determined'),
]);

/** The clock in the lane. The last one on the route. */
const L12_CLOCK3 = script('l12_clock3', [
  line('narrator', 'A clock stands in the lane between the trailers, and it has been waiting for them.'),
  line('lucas', "They put one right in our path. Subtle."),
  line('eddie', "I'll make this one quick. Everybody breathe.", 'determined'),
]);

/** The deck of Eddie's trailer, a few steps in from the ladder. The door shuts behind the party. Eddie's. */
const L12_ROOF = script('l12_roof', [
  line('narrator', "Eddie's roof. A flat deck with a lip round it, and the sky above it black with wings."),
  line('dustin', "They're coming from every side. We can't fight off a sky.", 'worried'),
  line('eddie', "No. But they chase noise, and I happen to be the loudest thing in Hawkins.", 'determined'),
  line('mike', 'Eddie, there are too many of them.', 'worried'),
  line('eddie', "Then I give them something better to chase. Get down below the lip, all of you. Go.", 'determined'),
  line('max', "You're not doing this alone."),
  line('eddie', "I'm not. I've got a guitar. Please. Go.", 'worried'),
]);

/** Eddie's last word before the song. The `solo` step follows, and waits for the song to end. */
const L12_SOLO = script('l12_solo', [
  line('eddie', "Okay. Nervous. I'm allowed to be nervous. It's a big crowd.", 'worried'),
  line('eddie', "Don't watch. Stay down, stay low. I've got this one.", 'determined'),
]);

/** The song is over. The `fall` step comes first. The party's, and the narrator's: Eddie says nothing more. */
const L12_FALL = script('l12_fall', [
  line('narrator', 'The last chord fades. The wings close in over the roof, and the storm goes quiet.'),
  line('dustin', 'Eddie? Eddie!', 'shocked'),
  line('mike', "He bought us the whole song. He knew it'd cost him."),
  line('will', 'The bats are gone. So is he.', 'hurt'),
  line('max', "We're not leaving this town without finishing it. For him."),
]);

export const L12_SCRIPTS: DialogueScript[] = [
  L12_START, L12_STREET, L12_CLOCK1, L12_MIRROR_HINT, L12_CLOCK2, L12_PARK, L12_CLOCK3, L12_ROOF, L12_SOLO, L12_FALL,
];
