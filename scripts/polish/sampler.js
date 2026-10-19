(() => {
  const SIZE = 8192;
  window.__raw = { tot: [], tick: [], draw: [], copy: [], sec: [] };
  window.__samples = [];
  let lastN = 0, sec = 0;
  setInterval(() => {
    const p = window.__perf; if (!p) return;
    const n = p.n, from = Math.max(lastN, n - SIZE);
    for (let i = from; i < n; i++) {
      const k = i % SIZE;
      window.__raw.tick.push(p.tick[k]); window.__raw.draw.push(p.draw[k]); window.__raw.copy.push(p.copy[k]); window.__raw.tot.push(p.tick[k] + p.draw[k]); window.__raw.sec.push(sec);
    }
    const first = from % SIZE, last = (n - 1) % SIZE;
    const span = n > from + 1 ? (p.at[last] - p.at[first]) / 1000 : 0;
    lastN = n;
    const sim = window.__ud && window.__ud.play && window.__ud.play.sim;
    let c = null;
    if (sim) {
      const v = sim.view();
      c = { frames: sim.stats().frames, alive: sim.enemiesAlive(), actors: v.actors.length, fx: v.fx.length, haz: v.hazards.length, pools: v.pools.length,
        floaters: v.floaters.length, props: v.props.length, items: v.items.length, boss: v.hud.boss ? v.hud.boss.name : null, flash: v.flash };
    }
    window.__samples.push({ sec, fps: span ? (n - from - 1) / span : 0, frames: n - from, ctx: c });
    sec++;
  }, 1000);
})();
