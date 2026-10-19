// ?perf=1: records how long each animation frame spends in tick() and in render(), for frame-time checks in the browser.
// Read window.__perf from the console or a script. It is off, and costs a branch per frame, without the flag.
const SIZE = 8192;

export interface PerfLog {
  /** Frames recorded so far. Frame i sits at index i % SIZE, so only the last SIZE are kept. */
  n: number;
  /** Per frame: ms in tick() (all the ticks the frame ran), ms in render(), ticks run, and the performance.now() stamp. */
  tick: Float32Array;
  draw: Float32Array;
  /** The part of draw spent copying the 1x frame up onto the page's canvas (main.ts). */
  copy: Float32Array;
  steps: Uint8Array;
  at: Float64Array;
  reset(): void;
}

export const perfOn = typeof location !== 'undefined' && new URLSearchParams(location.search).get('perf') === '1';

export const perfLog: PerfLog = {
  n: 0,
  tick: new Float32Array(perfOn ? SIZE : 0),
  draw: new Float32Array(perfOn ? SIZE : 0),
  copy: new Float32Array(perfOn ? SIZE : 0),
  steps: new Uint8Array(perfOn ? SIZE : 0),
  at: new Float64Array(perfOn ? SIZE : 0),
  reset() { this.n = 0; },
};

/** main.ts sets this to the copy's ms during render(); the next perfRecord keeps it. */
export const perfMark = { copy: 0 };

export function perfRecord(tickMs: number, drawMs: number, steps: number, at: number): void {
  const i = perfLog.n++ % SIZE;
  perfLog.tick[i] = tickMs;
  perfLog.draw[i] = drawMs;
  perfLog.copy[i] = perfMark.copy;
  perfLog.steps[i] = steps;
  perfLog.at[i] = at;
}

if (perfOn) (window as unknown as { __perf: PerfLog }).__perf = perfLog;
