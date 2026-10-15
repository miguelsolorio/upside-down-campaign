// Shared by the audio tests that check a recorded measurement: a fingerprint of the data that was measured, and a
// stub of Web Audio that records what the synth asks for, so Node can check the level that comes out of the real code.

/** FNV-1a of the data, so a measured number can't outlive the thing it was measured from. */
export function print(x: unknown): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(x)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------- a stub of Web Audio that records what the synth asks for

interface Stub {
  param: { value: number; setValueAtTime(v: number): void; linearRampToValueAtTime(v: number): void; exponentialRampToValueAtTime(v: number): void };
  [k: string]: unknown;
}
export interface Played {
  /** Every gain that feeds the destination: one per part, cue note or blip. */
  voices: number[][];
  /** The frequencies each pitched voice was set to, and the wave it was given. */
  tones: { freq: number[]; wave: { real: Float32Array; imag: Float32Array } }[];
}

export function play(run: (ctx: BaseAudioContext, dest: AudioNode) => void): Played {
  const dest = {};
  const made: Record<string, unknown>[] = [];
  const param = (log: number[]): Stub['param'] => ({
    value: 0,
    setValueAtTime: (v) => { log.push(v); },
    linearRampToValueAtTime: (v) => { log.push(v); },
    exponentialRampToValueAtTime: (v) => { log.push(v); },
  });
  const node = (extra: Record<string, unknown>): Record<string, unknown> => {
    const n: Record<string, unknown> = {
      connect: (to: unknown) => { n.to = to; },
      disconnect: () => {}, start: () => {}, stop: () => {}, ...extra,
    };
    made.push(n);
    return n;
  };
  const ctx = {
    createGain: () => { const log: number[] = []; return node({ gain: param(log), log }); },
    createOscillator: () => {
      const freq: number[] = [];
      const n: Record<string, unknown> = node({
        frequency: param(freq), detune: { value: 0 }, freq, setPeriodicWave: (w: unknown) => { n.wave = w; },
      });
      return n;
    },
    createPeriodicWave: (real: Float32Array, imag: Float32Array) => ({ real, imag }),
    createBufferSource: () => node({ playbackRate: param([]), buffer: null, loop: false }),
    createBiquadFilter: () => node({ type: '', Q: { value: 0 }, frequency: param([]) }),
    createBuffer: (_c: number, length: number) => ({ length, copyToChannel: () => {} }),
  };
  run(ctx as unknown as BaseAudioContext, dest as unknown as AudioNode);
  return {
    voices: made.filter((n) => n.to === dest).map((n) => n.log as number[]),
    tones: made.filter((n) => n.wave).map((n) => ({ freq: n.freq as number[], wave: n.wave as Played['tones'][number]['wave'] })),
  };
}
export const peakOf = (log: number[]): number => Math.max(...log);

