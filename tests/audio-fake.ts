// A stand-in for Web Audio for the tests that drive the sequencer and the live player in Node. Every node is a tolerant
// stub: any property is another stub, calling it returns one, and setting a value keeps it. Only two things are recorded,
// because they are all the tests need: when each pitched oscillator and each noise source was told to start.

type Stub = Record<PropertyKey, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function stub(): Stub {
  const store: Record<PropertyKey, unknown> = {};
  return new Proxy(function () {}, {
    get(_target, key) {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === 'then') return undefined;
      if (!(key in store)) store[key] = stub();
      return store[key];
    },
    set(_target, key, value) {
      store[key] = value;
      return true;
    },
    apply: () => stub(),
  }) as unknown as Stub;
}

export interface Voice {
  kind: 'tone' | 'noise';
  /** Context time the source starts. */
  t: number;
  /** The pitch it was set to, in Hz. Zero for noise. */
  freq: number;
}

export interface FakeContext {
  /** Seconds. A test moves the clock by setting this. */
  currentTime: number;
  state: string;
  sampleRate: number;
  destination: Stub;
  voices: Voice[];
  resume(): Promise<void>;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function fakeContext(): FakeContext {
  const voices: Voice[] = [];
  const base: FakeContext = {
    currentTime: 0,
    state: 'running',
    sampleRate: 44100,
    destination: stub(),
    voices,
    resume: () => Promise.resolve(),
    createOscillator() {
      const node = stub();
      let tonal = false;
      let freq = 0;
      node.setPeriodicWave = () => { tonal = true; };
      node.frequency = Object.assign(stub(), { setValueAtTime: (v: number) => { if (!freq) freq = v; } });
      node.start = (t: number) => { if (tonal) voices.push({ kind: 'tone', t, freq }); };
      return node;
    },
    createBufferSource() {
      const node = stub();
      node.start = (t: number) => { voices.push({ kind: 'noise', t, freq: 0 }); };
      return node;
    },
  };
  // Every other create* method hands back a plain stub.
  return new Proxy(base, {
    get: (target, key) => (key in target ? target[key as string] : typeof key === 'string' && key.startsWith('create') ? () => stub() : undefined),
  });
}

/** The onsets of a list of voices, in seconds from `from`, sorted and with repeats removed (to the microsecond). */
export function onsets(voices: readonly Voice[], from: number): number[] {
  return [...new Set(voices.map((v) => Math.round((v.t - from) * 1e6) / 1e6))].sort((a, b) => a - b);
}
