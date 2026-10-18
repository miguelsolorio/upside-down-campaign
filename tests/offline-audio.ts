// A small OfflineAudioContext for Node, so the audio tests can render what the game plays without a browser. It runs the real
// synth, sequencer and mix graph (renderWith and renderOffline in src/audio/render.ts) and implements only the nodes they use:
// gain, oscillator (PeriodicWave and detune), looping buffer source, biquad, delay, compressor and channel merger. Not a test
// file: call installOfflineAudio, then render.
// It follows the Web Audio spec and Chrome's filters, but it is not Chrome: the compressor is a plain hard-knee limiter, the
// wave tables are our own band-limiting of the same Fourier series, and oscillators start on a whole sample. Against the
// browser's own measurements it reproduces a track's loudness to 0.05 dB (Sour and Starcourt, tests/tracks-sour.test.ts and
// tests/tracks-starcourt.test.ts), a track's peak to about 10 percent, and the peak of an effect made of tones to 3 percent
// (reach, scoop, babble, howl). A noise burst's peak depends on where in the noise loop it starts, and the game starts it
// somewhere new on every play, so measure those as a median over several starts, as tests/audio-ch4.test.ts does.
const SR = 44100;
const Q = 128;
const TABLE = 4096;
/** The harmonic counts of the band-limited tables, from the fullest down. */
const HARMONICS = [512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

interface Ev { type: 'set' | 'lin' | 'exp' | 'target'; time: number; v: number; tau: number }

/** An AudioParam: automation events plus whatever audio is connected to it. */
export class Param {
  readonly mods: Node[] = [];
  value: number;
  private ev: Ev[] = [];
  constructor(value: number) { this.value = value; }
  private add(type: Ev['type'], v: number, time: number, tau = 0): this {
    let i = this.ev.length;
    while (i > 0 && this.ev[i - 1].time > time) i--;
    this.ev.splice(i, 0, { type, time, v, tau });
    return this;
  }
  setValueAtTime(v: number, t: number): this { return this.add('set', v, t); }
  linearRampToValueAtTime(v: number, t: number): this { return this.add('lin', v, t); }
  exponentialRampToValueAtTime(v: number, t: number): this { return this.add('exp', v, t); }
  setTargetAtTime(v: number, t: number, tau: number): this { return this.add('target', v, t, tau); }
  cancelScheduledValues(t: number): this { this.ev = this.ev.filter((e) => e.time < t); return this; }
  /** The value at time t from the events alone. */
  at(t: number): number {
    const ev = this.ev;
    let j = 0;
    while (j < ev.length && ev[j].time <= t) j++;
    if (j === 0) return this.value;
    const prev = ev[j - 1];
    const next = ev[j];
    if (next && (next.type === 'lin' || next.type === 'exp')) {
      const v0 = this.before(j - 1 + (prev.type === 'target' ? 0 : 1));
      const x = (t - prev.time) / Math.max(1e-9, next.time - prev.time);
      if (next.type === 'lin') return v0 + (next.v - v0) * x;
      return v0 > 0 && next.v > 0 ? v0 * Math.pow(next.v / v0, x) : v0;
    }
    if (prev.type === 'target') return prev.v + (this.before(j - 1) - prev.v) * Math.exp(-(t - prev.time) / prev.tau);
    return prev.v;
  }
  /** The value just before event i begins, from the events ahead of it. */
  private before(i: number): number {
    if (i === 0) return this.value;
    const p = this.ev[i - 1];
    if (p.type === 'target' && this.ev[i]) return p.v + (this.before(i - 1) - p.v) * Math.exp(-(this.ev[i].time - p.time) / p.tau);
    return p.v;
  }
  /** Fills a block, automation plus connected audio. */
  fill(out: Float32Array, block: number): void {
    const t0 = (block * Q) / SR;
    const last = this.ev[this.ev.length - 1];
    if (!last) out.fill(this.value);
    else if (t0 >= last.time && last.type !== 'target') out.fill(last.v);
    else for (let i = 0; i < Q; i++) out[i] = this.at(t0 + i / SR);
    for (const m of this.mods) if (block >= m.a0 && block <= m.a1) for (let i = 0; i < Q; i++) out[i] += m.out[i];
  }
}

class Edge {
  readonly from: Node;
  readonly slot: number;
  constructor(from: Node, slot: number) { this.from = from; this.slot = slot; }
}

abstract class Node {
  readonly inputs: Edge[] = [];
  readonly params: Param[] = [];
  readonly out = new Float32Array(Q);
  a0 = Infinity;
  a1 = -Infinity;
  /** Blocks this node keeps sounding after its inputs stop. */
  tail = 0;
  endless = false;
  rank = 0;
  private live: Edge[] = [];
  private next = -1;
  constructor(ctx: Ctx) { ctx.nodes.push(this); }
  connect<T extends Node | Param>(to: T, _output = 0, input = 0): T {
    if (to instanceof Param) to.mods.push(this);
    else (to as Node).inputs.push(new Edge(this, input));
    return to;
  }
  disconnect(): void {}
  /** Sums the outputs of the inputs on one slot that are sounding in this block. A bus has thousands, so only the live ones are walked. */
  protected gather(b: number, slot: number, into: Float32Array): void {
    if (this.next < 0) { this.inputs.sort((x, y) => x.from.a0 - y.from.a0); this.next = 0; }
    while (this.next < this.inputs.length && this.inputs[this.next].from.a0 <= b) this.live.push(this.inputs[this.next++]);
    if (this.live.some((e) => e.from.a1 < b)) this.live = this.live.filter((e) => e.from.a1 >= b);
    into.fill(0);
    for (const e of this.live) {
      if (e.slot !== slot) continue;
      const o = e.from.out;
      for (let i = 0; i < Q; i++) into[i] += o[i];
    }
  }
  abstract process(b: number): void;
  post?(b: number): void;
}

const scratch = new Float32Array(Q);
const gainBuf = new Float32Array(Q);

class Gain extends Node {
  readonly gain = new Param(1);
  constructor(ctx: Ctx) { super(ctx); this.params.push(this.gain); }
  process(b: number): void {
    this.gather(b, 0, scratch);
    this.gain.fill(gainBuf, b);
    for (let i = 0; i < Q; i++) this.out[i] = scratch[i] * gainBuf[i];
  }
}

const COS = Float64Array.from({ length: TABLE }, (_, k) => Math.cos((2 * Math.PI * k) / TABLE));
const SIN = Float64Array.from({ length: TABLE }, (_, k) => Math.sin((2 * Math.PI * k) / TABLE));
/** The band-limited tables of one wave. Every context builds its waves again, so the tables are kept by the wave's first coefficients. */
interface Tables { byHarmonics: Map<number, Float64Array>; scale: number }
const KEPT = new Map<string, Tables>();

class Wave {
  private real: Float32Array;
  private imag: Float32Array;
  private kept: Tables;
  constructor(real: Float32Array, imag: Float32Array) {
    this.real = real;
    this.imag = imag;
    const key = [real.length, ...[1, 2, 3, 5].flatMap((n) => [real[n], imag[n]])].join();
    this.kept = KEPT.get(key) ?? { byHarmonics: new Map(), scale: 0 };
    KEPT.set(key, this.kept);
  }
  private build(h: number): Float64Array {
    const t = new Float64Array(TABLE);
    const top = Math.min(h, this.real.length - 1);
    for (let n = 1; n <= top; n++) {
      const a = this.real[n];
      const c = this.imag[n];
      if (a === 0 && c === 0) continue;
      for (let k = 0; k < TABLE; k++) {
        const i = (n * k) % TABLE;
        t[k] += a * COS[i] + c * SIN[i];
      }
    }
    return t;
  }
  /** The table for a pitch: as many harmonics as fit under the Nyquist frequency, scaled so the fullest table peaks at 1. */
  table(freq: number): Float64Array {
    const kept = this.kept;
    if (!kept.scale) {
      const full = this.build(HARMONICS[0]);
      kept.scale = 1 / Math.max(1e-9, ...Array.from(full, Math.abs));
      for (let k = 0; k < TABLE; k++) full[k] *= kept.scale;
      kept.byHarmonics.set(HARMONICS[0], full);
    }
    const fit = SR / 2 / Math.max(1, Math.abs(freq));
    const h = HARMONICS.find((l) => l <= fit) ?? 1;
    let t = kept.byHarmonics.get(h);
    if (!t) {
      t = this.build(h);
      for (let k = 0; k < TABLE; k++) t[k] *= kept.scale;
      kept.byHarmonics.set(h, t);
    }
    return t;
  }
}

class Source extends Node {
  startAt = -1;
  stopAt = Infinity;
  start(when = 0, offset = 0): void { this.startAt = Math.ceil(when * SR - 1e-6); this.offset = offset; }
  stop(when = 0): void { this.stopAt = Math.ceil(when * SR - 1e-6); }
  protected offset = 0;
  onended: (() => void) | null = null;
  process(): void {}
}

class Osc extends Source {
  readonly frequency = new Param(440);
  readonly detune = new Param(0);
  private wave: Wave | null = null;
  private phase = 0;
  private f = new Float32Array(Q);
  private d = new Float32Array(Q);
  constructor(ctx: Ctx) { super(ctx); this.params.push(this.frequency, this.detune); }
  setPeriodicWave(w: Wave): void { this.wave = w; }
  process(b: number): void {
    this.frequency.fill(this.f, b);
    this.detune.fill(this.d, b);
    for (let i = 0; i < Q; i++) {
      const s = b * Q + i;
      if (s < this.startAt || s >= this.stopAt) { this.out[i] = 0; continue; }
      const fe = this.f[i] * Math.pow(2, this.d[i] / 1200);
      if (this.wave) {
        const t = this.wave.table(fe);
        const p = this.phase * TABLE;
        const k = Math.floor(p);
        const fr = p - k;
        this.out[i] = t[k % TABLE] * (1 - fr) + t[(k + 1) % TABLE] * fr;
      } else this.out[i] = Math.sin(2 * Math.PI * this.phase);
      this.phase += fe / SR;
      this.phase -= Math.floor(this.phase);
    }
  }
}

class Buf {
  readonly data: Float32Array;
  readonly length: number;
  readonly sampleRate: number;
  constructor(length: number, sampleRate: number) { this.length = length; this.sampleRate = sampleRate; this.data = new Float32Array(length); }
  copyToChannel(a: Float32Array): void { this.data.set(a); }
  getChannelData(): Float32Array { return this.data; }
}

class BufferSrc extends Source {
  buffer: Buf | null = null;
  loop = false;
  readonly playbackRate = new Param(1);
  private pos = -1;
  private rate = new Float32Array(Q);
  constructor(ctx: Ctx) { super(ctx); this.params.push(this.playbackRate); }
  process(b: number): void {
    const buf = this.buffer;
    this.playbackRate.fill(this.rate, b);
    for (let i = 0; i < Q; i++) {
      const s = b * Q + i;
      if (!buf || s < this.startAt || s >= this.stopAt) { this.out[i] = 0; continue; }
      if (this.pos < 0) this.pos = this.offset * buf.sampleRate;
      const n = buf.length;
      const k = Math.floor(this.pos);
      const fr = this.pos - k;
      this.out[i] = buf.data[k % n] * (1 - fr) + buf.data[(k + 1) % n] * fr;
      this.pos += (this.rate[i] * buf.sampleRate) / SR;
      if (this.loop) this.pos %= n;
      else if (this.pos >= n) this.stopAt = s;
    }
  }
}

class Biquad extends Node {
  type = 'lowpass';
  readonly frequency = new Param(350);
  readonly Q = new Param(1);
  private z1 = 0;
  private z2 = 0;
  constructor(ctx: Ctx) { super(ctx); this.params.push(this.frequency, this.Q); this.tail = Math.ceil(0.1 * SR / Q); }
  process(b: number): void {
    this.gather(b, 0, scratch);
    const f = this.frequency.at((b * Q) / SR);
    const q = this.Q.at((b * Q) / SR);
    const nyq = SR / 2;
    let [b0, b1, b2, a1, a2] = [1, 0, 0, 0, 0];
    if (f >= nyq) [b0, b1, b2] = this.type === 'lowpass' ? [1, 0, 0] : [0, 0, 0];
    else if (f <= 0) [b0, b1, b2] = this.type === 'highpass' ? [1, 0, 0] : [0, 0, 0];
    else if (this.type === 'bandpass') {
      const w = (2 * Math.PI * f) / SR;
      const alpha = Math.sin(w) / (2 * Math.max(q, 1e-4));
      [b0, b1, b2, a1, a2] = [alpha / (1 + alpha), 0, -alpha / (1 + alpha), (-2 * Math.cos(w)) / (1 + alpha), (1 - alpha) / (1 + alpha)];
    } else {
      // Chrome's low and high pass: the resonance is in dB and sets the damping d, so 0 dB is a Butterworth filter.
      const g = Math.pow(10, 0.05 * Math.max(0, q));
      const d = Math.sqrt((4 - Math.sqrt(16 - 16 / (g * g))) / 2);
      const w = (2 * Math.PI * f) / SR;
      const sn = 0.5 * d * Math.sin(w);
      const beta = (0.5 * (1 - sn)) / (1 + sn);
      const sign = this.type === 'lowpass' ? -1 : 1;
      const gamma = (0.5 + beta) * Math.cos(w);
      const alpha = 0.25 * (0.5 + beta + sign * gamma);
      [b0, b1, b2, a1, a2] = [2 * alpha, -sign * 4 * alpha, 2 * alpha, -2 * gamma, 2 * beta];
    }
    for (let i = 0; i < Q; i++) {
      const x = scratch[i];
      const y = b0 * x + this.z1;
      this.z1 = b1 * x - a1 * y + this.z2;
      this.z2 = b2 * x - a2 * y;
      this.out[i] = y;
    }
  }
}

class Delay extends Node {
  readonly delayTime = new Param(0);
  private ring: Float32Array;
  constructor(ctx: Ctx, max: number) { super(ctx); this.ring = new Float32Array(Math.ceil(max * SR) + 2 * Q); this.endless = true; }
  private get d(): number { return Math.max(Q, Math.round(this.delayTime.value * SR)); }
  process(b: number): void {
    const n = this.ring.length;
    for (let i = 0; i < Q; i++) this.out[i] = this.ring[(((b * Q + i - this.d) % n) + n) % n];
  }
  post(b: number): void {
    this.gather(b, 0, scratch);
    for (let i = 0; i < Q; i++) this.ring[(b * Q + i) % this.ring.length] = scratch[i];
  }
}

/** A hard-knee limiter with the static curve, makeup gain and release of the browser's compressor. */
class Compressor extends Node {
  readonly threshold = new Param(-24);
  readonly knee = new Param(30);
  readonly ratio = new Param(12);
  readonly attack = new Param(0.003);
  readonly release = new Param(0.25);
  private g = 1;
  constructor(ctx: Ctx) { super(ctx); this.endless = true; }
  private curve(x: number): number {
    const thr = this.threshold.value;
    const db = 20 * Math.log10(Math.max(x, 1e-9));
    return db <= thr ? 1 : Math.pow(10, (thr + (db - thr) / this.ratio.value - db) / 20);
  }
  process(b: number): void {
    this.gather(b, 0, scratch);
    const makeup = Math.pow(1 / this.curve(1), 0.6);
    const rel = Math.exp(-1 / (Math.max(1e-3, this.release.value) * SR));
    for (let i = 0; i < Q; i++) {
      const want = this.curve(Math.abs(scratch[i]));
      this.g = want < this.g ? want : want + (this.g - want) * rel;
      this.out[i] = scratch[i] * this.g * makeup;
    }
  }
}

class Merger extends Node {
  readonly right = new Float32Array(Q);
  process(b: number): void { this.gather(b, 0, this.out); this.gather(b, 1, this.right); }
}

class Dest extends Node {
  readonly left: Float32Array;
  readonly right: Float32Array;
  constructor(ctx: Ctx, length: number) { super(ctx); this.left = new Float32Array(length); this.right = new Float32Array(length); this.endless = true; }
  process(b: number): void {
    const from = this.inputs[0]?.from;
    if (!from) return;
    const r = from instanceof Merger ? from.right : from.out;
    const n = Math.min(Q, this.left.length - b * Q);
    for (let i = 0; i < n; i++) { this.left[b * Q + i] = from.out[i]; this.right[b * Q + i] = r[i]; }
  }
}

class Ctx {
  readonly sampleRate = SR;
  currentTime = 0;
  readonly nodes: Node[] = [];
  readonly destination: Dest;
  readonly length: number;
  constructor(_channels: number, length: number, rate: number) {
    if (rate !== SR) throw new Error('the offline shim renders at 44100 Hz');
    this.length = length;
    this.destination = new Dest(this, length);
  }
  createGain(): Gain { return new Gain(this); }
  createOscillator(): Osc { return new Osc(this); }
  createBufferSource(): BufferSrc { return new BufferSrc(this); }
  createBiquadFilter(): Biquad { return new Biquad(this); }
  createDelay(max = 1): Delay { return new Delay(this, max); }
  createDynamicsCompressor(): Compressor { return new Compressor(this); }
  createChannelMerger(): Merger { return new Merger(this); }
  createPeriodicWave(real: Float32Array, imag: Float32Array): Wave { return new Wave(real, imag); }
  createBuffer(_channels: number, length: number, rate: number): Buf { return new Buf(length, rate); }

  /** Runs every node block by block, in an order where each node comes after what feeds it, skipping nodes with nothing to say. */
  startRendering(): Promise<{ getChannelData(c: number): Float32Array }> {
    const blocks = Math.ceil(this.length / Q);
    const order = this.order();
    for (const n of this.nodes) {
      if (n instanceof Source && n.startAt >= 0) {
        n.a0 = Math.floor(n.startAt / Q);
        n.a1 = Math.min(blocks, Math.floor(n.stopAt / Q) + 1);
      } else if (n.endless) { n.a0 = 0; n.a1 = blocks; }
    }
    for (let changed = true; changed;) {
      changed = false;
      for (const n of this.nodes) {
        if (n instanceof Source) continue;
        const feeds = [...n.inputs.map((e) => e.from), ...n.params.flatMap((p) => p.mods)];
        for (const f of feeds) {
          const a0 = Math.min(n.a0, f.a0);
          const a1 = n.endless ? blocks : Math.min(blocks, Math.max(n.a1, f.a1 + n.tail));
          if (a0 !== n.a0 || a1 !== n.a1) { n.a0 = a0; n.a1 = a1; changed = true; }
        }
      }
    }
    // Nodes join the live list when their first block comes, in the order that puts each after what feeds it, and leave after their last.
    order.forEach((n, i) => { n.rank = i; });
    const starts: Node[][] = Array.from({ length: blocks + 1 }, () => []);
    for (const n of order) if (n.a0 <= n.a1 && n.a0 < blocks) starts[n.a0].push(n);
    let live: Node[] = [];
    for (let b = 0; b < blocks; b++) {
      if (starts[b].length) { live.push(...starts[b]); live.sort((x, y) => x.rank - y.rank); }
      if (live.some((n) => n.a1 < b)) live = live.filter((n) => n.a1 >= b);
      for (const n of live) n.process(b);
      for (const n of live) n.post?.(b);
    }
    const d = this.destination;
    return Promise.resolve({ getChannelData: (c: number) => (c === 0 ? d.left : d.right) });
  }

  /** Kahn's sort. A delay's input does not count: its output depends on the past only. */
  private order(): Node[] {
    const deps = new Map<Node, Node[]>();
    for (const n of this.nodes) {
      const d = n instanceof Delay ? [] : [...n.inputs.map((e) => e.from), ...n.params.flatMap((p) => p.mods)];
      deps.set(n, d);
    }
    const done = new Set<Node>();
    const out: Node[] = [];
    const visit = (n: Node, trail: Set<Node>): void => {
      if (done.has(n)) return;
      if (trail.has(n)) throw new Error('a cycle without a delay');
      trail.add(n);
      for (const m of deps.get(n) ?? []) visit(m, trail);
      trail.delete(n);
      done.add(n);
      out.push(n);
    };
    for (const n of this.nodes) visit(n, new Set());
    return out;
  }
}

/** Makes OfflineAudioContext exist in this process, so render.ts renders. */
export function installOfflineAudio(): void {
  (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext = Ctx;
}
