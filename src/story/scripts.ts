// Every dialogue script for Level 1, by id (ids and triggers are in docs/level-1.md). Pure data: no DOM, so Node can test it.
// Each line fits the dialogue box: three rows of 32 characters. Eleven speaks one or two words.
// The tutorial lines teach the real keys in character: Z attack, X special (costs MP), C and V or 1 to 4 swap, Space for lights.
// They name keys as {tokens} (see keyText in core/bindings.ts), so they follow a rebind and read as button names on a controller.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';
import { PROLOGUE } from './prologue_script.ts';
import { L2_SCRIPTS } from './scripts_l2.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** Joyce, Mike and Dustin in the Byers yard. Will is missing. Movement and the first lights. */
const L1_START = script('l1_start', [
  line('joyce', "Will's bike is out by the fence. Will isn't.", 'worried'),
  line('mike', "He left my basement at dusk. I should've walked him home.", 'worried'),
  line('joyce', "Stop. That won't help him. Take the trail behind the house and bring him back.", 'determined'),
  line('dustin', "Hear me out. Lost kids walk in circles, so we stay on the trail and don't guess."),
  line('joyce', 'I hung lights along the trail. Press {interact} by one to light it.'),
  line('joyce', 'If you go down, you start again from the last one you lit.'),
  line('dustin', 'Quick briefing: {move} to move. {interact} to talk or light a string.', 'happy'),
  line('mike', "Lucas, Dustin, on me. We're finding Will.", 'determined'),
]);

/** Dustin on attack (Z). The rats wake when it ends. */
const L1_TUT_ATTACK = script('l1_tut_attack', [
  line('dustin', 'Hold up. Hear that squeaking? Rats. Big ones, nesting in the roots.', 'worried'),
  line('dustin', 'Rats bite when startled, so hit first. {attack} attacks. Tap it three times to chain a combo.'),
  line('mike', "I'll take the front. Stay behind me.", 'determined'),
  line('dustin', 'Too late. They heard us.', 'shocked'),
]);

/** Mike on special (X) and MP. */
const L1_TUT_SPECIAL = script('l1_tut_special', [
  line('mike', "Everyone okay? Good. Listen up, I'm only saying this once."),
  line('mike', "{special} is your special. It costs MP, and MP only comes back slowly. Don't waste it."),
  line('mike', "Mine is the DM screen. It blocks shots and covers whoever's behind me.", 'determined'),
  line('dustin', "Mine is hairspray and a lighter. Technically that's a flamethrower.", 'happy'),
]);

/** Lucas on swapping (C and V, or 1 to 4). */
const L1_TUT_SWAP = script('l1_tut_swap', [
  line('lucas', 'Nobody does this alone. {swap} cycle through us.{pickHint}'),
  line('lucas', "Swapping has a cooldown, so don't flick back and forth."),
  line('lucas', 'Whoever swaps in lands a small shockwave. Use it to clear space.'),
  line('lucas', 'Benched kids get their MP back faster, but only half the XP. Rotate smart.'),
  line('mike', "Lucas is right. Check who's hurt before you rotate."),
]);

/** Lucas on dodging darts as the first agents patrol the creek bank. */
const L1_AGENTS = script('l1_agents', [
  line('lucas', "Two men in suits past the creek. They walk a loop. I don't like it.", 'worried'),
  line('mike', 'Can we avoid them?'),
  line('lucas', 'Not really. They throw darts, so keep moving and step out of the way.'),
  line('lucas', 'In a pinch, swap. Whoever swaps in gets a split second where nothing can touch them.'),
  line('dustin', 'Their loop has a pattern. Count it out, then go.', 'happy'),
]);

/** Lucas spots the lantern across the creek. Hitting it opens the gate. */
const L1_GATE_HINT = script('l1_gate_hint', [
  line('lucas', "The gate's chained. See that lantern across the creek? That's the release."),
  line('mike', 'Can anyone reach it from here?'),
  line('lucas', 'My wrist rocket can. Swap me in with {swapTo3}. Face the lantern and press {attack}.', 'determined'),
]);

const L1_GATE_OPEN = script('l1_gate_open', [
  line('lucas', "Lantern's out. The latch dropped."),
  line('mike', 'Nice shot, Lucas.', 'happy'),
  line('lucas', "I know. Let's go."),
]);

/** The lights flicker, something growls, a dark shape crosses the trail. No fight. */
const L1_SCARE = script('l1_scare', [
  line('dustin', 'Okay. Did everybody see that, or is it just me?', 'shocked'),
  line('lucas', "Tall. Fast. It crossed the trail like we weren't even here.", 'worried'),
  line('mike', 'Count off. I want to hear everyone.', 'determined'),
  line('dustin', 'Present. Slightly less present than a minute ago, but present.'),
  line('lucas', "It's gone. That doesn't mean it left."),
  line('mike', 'Stay tight and keep moving.', 'determined'),
]);

/** The shed. Someone is hiding behind the crates. */
const L1_ELEVEN_MEET = script('l1_eleven_meet', [
  line('lucas', 'Something moved in the shed. Behind the crates.', 'worried'),
  line('mike', "Easy. Whoever's in there, we're not going to hurt you.", 'worried'),
  line('eleven', 'Bad men?', 'worried'),
  line('mike', 'No bad men. Just us. Three kids with flashlights.'),
  line('dustin', 'Hear me out. Hungry people trust whoever has food. Mike, the Eggo.', 'happy'),
  line('eleven', 'Mine.', 'happy'),
]);

/** Eleven joins. Mike's promise gets its one nod here. */
const L1_ELEVEN_JOIN = script('l1_eleven_join', [
  line('mike', "I'm Mike. That's Dustin, and that's Lucas. We're looking for our friend Will.", 'happy'),
  line('eleven', 'Will. Lab.', 'worried'),
  line('lucas', 'Can we trust that? We met her five minutes ago.', 'worried'),
  line('mike', 'She stays with us. We stay together. I promise.', 'determined'),
  line('eleven', 'Friends.', 'happy'),
  line('dustin', 'Her shove moves heavy things. Swap her in with {swapTo4}.', 'happy'),
  line('mike', "Watch her nose. If it bleeds, she's low on MP. Tell me right away.", 'worried'),
]);

/** A log blocks the trail. Eleven's shove clears it. */
const L1_PUSH_HINT = script('l1_push_hint', [
  line('mike', "A log across the trail. It's wedged in tight.", 'worried'),
  line('lucas', "Too heavy for us. Can't go around it, either."),
  line('dustin', "Eleven's basic attack is a shove. Swap her in with {swapTo4}. Face the log and press {attack}.", 'happy'),
  line('eleven', 'Move.', 'determined'),
]);

const L1_LOG_CLEARED = script('l1_log_cleared', [
  line('eleven', 'Done.'),
  line('dustin', "That log weighs two hundred pounds. I'm just saying.", 'shocked'),
  line('mike', "You okay, Eleven? Good. Let's keep moving.", 'worried'),
]);

/** Floodlights and the van on the Lab road. Three waves follow. */
const L1_AMBUSH_START = script('l1_ambush_start', [
  line('lucas', 'Floodlights. A parked van. This is a setup.', 'shocked'),
  line('dustin', "Hear me out: they knew we'd come this way. That's not a good sign.", 'worried'),
  line('mike', 'Nobody runs. Nobody splits up. Check on each other.', 'determined'),
  line('lucas', "They'll come in waves. Watch your MP and rotate hurt kids to the bench."),
  line('dustin', 'When the d20 meter fills, press {burst}. Crit. It hits every enemy in range.'),
  line('eleven', 'Bad.', 'determined'),
  line('mike', 'Here they come. Stay together.', 'determined'),
]);

const L1_AMBUSH_CLEAR = script('l1_ambush_clear', [
  line('lucas', "That's the last of them. The road is clear."),
  line('mike', 'Count off. Is everybody still standing?', 'worried'),
  line('dustin', 'Alive. Bruised. Extremely curious about that van.', 'happy'),
  line('eleven', 'Lab. Close.', 'determined'),
]);

/** The last words before the results. A hook for the Lab. */
const L1_CLEAR = script('l1_clear', [
  line('dustin', "That's the Lab? It looks smaller in the dark.", 'shocked'),
  line('lucas', "Smaller doesn't mean easier. Every exit has a camera.", 'worried'),
  line('mike', 'Then we go in together. Eleven, stay close.', 'determined'),
  line('eleven', 'Together.', 'determined'),
]);

const ALL: DialogueScript[] = [
  PROLOGUE, L1_START, L1_TUT_ATTACK, L1_TUT_SPECIAL, L1_TUT_SWAP, L1_AGENTS, L1_GATE_HINT, L1_GATE_OPEN, L1_SCARE,
  L1_ELEVEN_MEET, L1_ELEVEN_JOIN, L1_PUSH_HINT, L1_LOG_CLEARED, L1_AMBUSH_START, L1_AMBUSH_CLEAR, L1_CLEAR,
  ...L2_SCRIPTS,
];

export const SCRIPTS: Record<string, DialogueScript> = Object.fromEntries(ALL.map((s) => [s.id, s]));
