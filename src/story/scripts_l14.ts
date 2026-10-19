// Every dialogue script for Level 14, stage 5.1 Hawkins under lockdown, by id (the beats are in src/world/stages/stage51.ts and docs/level-14.md).
// Pure data: no DOM, so Node can test it. Each line fits the dialogue box: three rows of 32 characters.
// Autumn 1987. Hopper is back from Kamchatka and leads the party through a town the army has shut: Main Street at curfew, the checkpoint,
// the square with its rifts, and the Lab's loading bay. He is gruff and deadpan, and soft underneath, and he teaches the stage the way a man
// talks himself through a job: go round the side of a shield, smash the boom gate, keep out of the open. Only he and the narrator speak, so
// the lines hold whoever else was picked. Dialogue is off by default, so these are for players who turn story on. Keys are {tokens} (see
// keyText in core/bindings.ts), so the lines follow a rebind and read as buttons on a controller.
import type { DialogueLine, DialogueScript, Expr, Speaker } from '../core/types.ts';

function line(who: Speaker, text: string, expr?: Expr): DialogueLine {
  return expr ? { who, text, expr } : { who, text };
}
function script(id: string, lines: DialogueLine[]): DialogueScript {
  return { id, lines };
}

/** Main Street at curfew. The first string of lights is at the start. */
const L14_START = script('l14_start', [
  line('narrator', 'Hawkins, autumn of 1987. The army has shut the town, and a sign says the rest.'),
  line('hopper', 'Soldiers on Main Street. Somebody called this a quarantine.', 'worried'),
  line('hopper', "I know every crack in this road. Never thought I'd walk it with rifles on me."),
  line('hopper', 'Their shields stop whatever comes from the front. Get round to the side.', 'determined'),
]);

/** The three tiles in front of the boom gate. The squad behind the sandbags wakes when this ends. */
const L14_CHECKPOINT = script('l14_checkpoint', [
  line('narrator', 'A booth, a wall of sandbags and a boom gate across the road. Floodlights sweep the asphalt.'),
  line('hopper', 'A checkpoint. Soldiers behind the bags, and a gate in my way.', 'worried'),
  line('hopper', "That gate is a plank and a bad attitude. Face it and press {attack}.", 'determined'),
]);

/** The west end of the town square, past the sandbags. The rifts. */
const L14_SQUARE = script('l14_square', [
  line('narrator', 'Red light seeps up through cracks in the asphalt. The air smells like a storm.'),
  line('hopper', "Same cracks as at the Gate. They're opening all over town.", 'worried'),
  line('hopper', "Keep moving. Don't stand still in the open with a rifle on you.", 'determined'),
]);

/** In front of the cache's neck in the south corridor. The crate that wants a shove. */
const L14_CACHE_HINT = script('l14_cache_hint', [
  line('hopper', 'A crate wedged in that doorway. Somebody hid something behind it.'),
  line('hopper', "Too heavy for me. A kid with a gift for shoving things could move it."),
  line('hopper', "Eggos, if I'm lucky. I'm always a little lucky.", 'happy'),
]);

/** Inside the loading bay. The door shuts behind the party and the Commander wakes when this ends. */
const L14_COMMANDER = script('l14_commander', [
  line('narrator', 'The loading bay. The door slams shut, and a whistle cuts across the concrete.'),
  line('hopper', 'A captain. Full shield, and he knows exactly how to use it.', 'shocked'),
  line('hopper', "A punch from the front just bounces. Get round his back, and smash that shield.", 'determined'),
  line('hopper', "When he whistles, more soldiers come. Don't let them pin you.", 'worried'),
]);

/** The Commander is down. The door opens. */
const L14_CLEAR = script('l14_clear', [
  line('narrator', 'The Commander goes down, and the whistle goes quiet with him.'),
  line('hopper', 'Good soldier. Wrong war.', 'hurt'),
  line('hopper', "That was the Lab's front line. Whatever is behind it, we go through.", 'determined'),
  line('hopper', "Door's open. Let's finish this."),
]);

export const L14_SCRIPTS: DialogueScript[] = [L14_START, L14_CHECKPOINT, L14_SQUARE, L14_CACHE_HINT, L14_COMMANDER, L14_CLEAR];
