import { FPS } from './config.ts';

/** Fixed 60 Hz update with a catch-up cap, one render per animation frame. */
export function startLoop(tick: () => void, render: () => void): void {
  const STEP = 1000 / FPS;
  let last = performance.now();
  let acc = 0;
  function frame(now: number): void {
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 5) { tick(); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
