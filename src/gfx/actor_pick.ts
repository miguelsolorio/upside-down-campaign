// Which frame of an actor's atlas the sim's view asks for: an anim and a frame in it. Most actors go by the anim and the frames spent in
// it (idle breathes every 30 ticks, the walk holds each frame for 7, the attack and cast poses switch at 6 and 8, an npc holding the
// Gate shut holds the third cast frame). The chapter 3 foes go by what the sim says they are doing, because their wind-up lasts longer
// than the first six ticks of an anim: the soldier aims under the "!" and fires after it, and a Flayed reaches after it, so the frame
// follows `alert`, and the poses (a Flayed's grab, Grigori's grab and stun) follow `pose`. Pure: no DOM.
import type { ActorView, AnimId } from '../core/types.ts';

export type Slot = [AnimId, number];
type Asked = Pick<ActorView, 'id' | 'kind' | 'anim' | 't' | 'alert' | 'pose' | 'strained'>;

/** Frames of the walk cycle hold for 7 ticks. */
const walkFrame = (t: number): number => ((t / 7) | 0) & 3;

/** The frame an anim shows at t, by the common rule. */
export function plainSlot(anim: AnimId, t: number, channeling = false): Slot {
  if (channeling) return ['cast', 2];
  switch (anim) {
    case 'idle': return ['idle', ((t / 30) | 0) & 1];
    case 'walk': return ['walk', walkFrame(t)];
    case 'attack': return ['attack', t < 6 ? 0 : 1];
    case 'cast': return ['cast', t < 8 ? 0 : 1];
    default: return [anim, 0];
  }
}

/** The wind-up is the first attack frame and the blow the second: told apart by the "!", not the clock. */
const byAlert = (v: Asked): Slot => ['attack', v.alert ? 0 : 1];

export function slotOf(v: Asked): Slot {
  switch (v.id) {
    case 'soldier': case 'kguard': case 'melter':
      return v.anim === 'attack' ? byAlert(v) : plainSlot(v.anim, v.t);
    case 'flayed':
      if (v.pose === 'grab') return ['cast', 1];
      return v.anim === 'attack' ? byAlert(v) : plainSlot(v.anim, v.t);
    case 'grigori':
      // The wind-up of the grab is the reach, the lunge is the dash frame, and the hold is both arms clamped. The haymaker's wind-up is
      // the "!" and its swing is the first frames of the recovery.
      if (v.pose === 'stun') return ['cast', 2];
      if (v.pose === 'grab') return v.anim === 'dash' ? ['dash', 0] : v.alert ? ['cast', 0] : ['cast', 1];
      return v.anim === 'attack' ? byAlert(v) : plainSlot(v.anim, v.t);
    default:
      return plainSlot(v.anim, v.t, v.kind === 'npc' && v.strained && v.anim === 'cast');
  }
}
