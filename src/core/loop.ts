import { createCapture, exposeCapture } from './capture.ts';
import { FPS } from './config.ts';
import { flags } from './flags.ts';
import { perfOn, perfRecord } from './perf.ts';

/**
 * Fixed 60 Hz update with a catch-up cap, one render per animation frame. In capture mode (?capture=1) there is no animation
 * frame at all: the recorder steps the game through __ud.cap, and nothing runs until it does.
 */
export function startLoop(tick: () => void, render: () => void): void {
  if (flags.capture) { exposeCapture(createCapture(tick, render)); return; }
  const STEP = 1000 / FPS;
  let last = performance.now();
  let acc = 0;
  function frame(now: number): void {
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    const t0 = perfOn ? performance.now() : 0;
    while (acc >= STEP && n < 5) { tick(); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    const t1 = perfOn ? performance.now() : 0;
    render();
    if (perfOn) perfRecord(t1 - t0, performance.now() - t1, n, t1);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
