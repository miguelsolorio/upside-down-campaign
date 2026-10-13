// The mixer around one playing track: a bus per layer, the echo, and the intensity crossfade.
// Live play and offline renders both build their graph here.
import type { Track } from './tracks/types.ts';

/**
 * Where each layer's voices connect. sendBase and sendCombat feed the echo, and they follow their layer's
 * gain, so a faded-out layer does not leave its echo behind.
 */
export interface Routes {
  base?: AudioNode;
  combat?: AudioNode;
  sendBase?: AudioNode;
  sendCombat?: AudioNode;
}

export interface Rig {
  readonly routes: Routes;
  /** The track's output. Fade this to stop the track. */
  readonly out: GainNode;
  /** 0 is the base layer alone. 1 is the full combat mix. Smoothed unless snap is true. */
  setIntensity(v: number, snap?: boolean): void;
  dispose(): void;
}

/** Base layer gain falls by this much at full intensity, so the combat layer has room. */
const BASE_DUCK = 0.35;
const TAU_UP = 0.16;
const TAU_DOWN = 0.55;

export function mixFor(intensity: number): { base: number; combat: number } {
  const x = Math.max(0, Math.min(1, intensity));
  const combat = x * x * (3 - 2 * x);
  return { base: 1 - BASE_DUCK * combat, combat };
}

export function createRig(ctx: BaseAudioContext, dest: AudioNode, track: Track): Rig {
  const out = ctx.createGain();
  out.connect(dest);
  const nodes: AudioNode[] = [out];
  const hasCombat = track.layers.includes('combat');

  const base = ctx.createGain();
  base.connect(out);
  nodes.push(base);
  const combat = hasCombat ? ctx.createGain() : null;
  if (combat) {
    combat.connect(out);
    nodes.push(combat);
  }

  const routes: Routes = { base };
  if (combat) routes.combat = combat;

  // One echo, fed by whichever voices send to it.
  let sendBase: GainNode | null = null;
  let sendCombat: GainNode | null = null;
  if (track.echo) {
    const e = track.echo;
    const input = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = (e.beats * 60) / track.bpm;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = e.cutoff;
    const feedback = ctx.createGain();
    feedback.gain.value = e.feedback;
    const wet = ctx.createGain();
    wet.gain.value = e.mix;
    input.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(wet);
    wet.connect(out);
    sendBase = ctx.createGain();
    sendBase.connect(input);
    routes.sendBase = sendBase;
    nodes.push(input, delay, tone, feedback, wet, sendBase);
    if (combat) {
      sendCombat = ctx.createGain();
      sendCombat.connect(input);
      routes.sendCombat = sendCombat;
      nodes.push(sendCombat);
    }
  }

  // Where each layer's gain is heading and where it started, so a new request begins from the true current
  // level. Reading AudioParam.value would lag the audio thread by a render quantum.
  interface Glide { from: number; to: number; at: number; tau: number }
  const glide = {
    base: { from: 1, to: 1, at: 0, tau: 1 } as Glide,
    combat: { from: 0, to: 0, at: 0, tau: 1 } as Glide,
  };
  const levelAt = (g: Glide, t: number): number => g.to + (g.from - g.to) * Math.exp(-(t - g.at) / g.tau);

  let last = Number.NaN;
  const rig: Rig = {
    routes,
    out,
    setIntensity(v, snap = false) {
      const x = hasCombat ? Math.max(0, Math.min(1, v)) : 0;
      if (x === last && !snap) return;
      const rising = Number.isNaN(last) || x > last;
      last = x;
      const mix = mixFor(x);
      const now = ctx.currentTime;
      const tau = rising ? TAU_UP : TAU_DOWN;
      const go = (g: Glide, target: number, params: (AudioParam | undefined)[]): void => {
        const from = snap ? target : levelAt(g, now);
        g.from = from;
        g.to = target;
        g.at = now;
        g.tau = tau;
        for (const p of params) {
          if (!p) continue;
          p.cancelScheduledValues(now);
          p.setValueAtTime(from, now);
          if (!snap) p.setTargetAtTime(target, now, tau);
        }
      };
      go(glide.base, mix.base, [base.gain, sendBase?.gain]);
      go(glide.combat, mix.combat, [combat?.gain, sendCombat?.gain]);
    },
    dispose() {
      for (const n of nodes) n.disconnect();
    },
  };
  rig.setIntensity(0, true);
  return rig;
}
