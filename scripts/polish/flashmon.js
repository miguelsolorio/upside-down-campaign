// Per animation frame, the average relative luminance of each block of a 8x5 grid over the displayed canvas, plus the game's own
// flash and shake values. Raw rows land in window.__fl for flash.mjs to analyse.
(() => {
  // Sampled at 128x80, then averaged by hand into 8x5 blocks of 16x16 samples: the browser's own big downscale only looks at a few pixels.
  const SW = 128, SH = 80, W = 8, H = 5, N = W * H, BW = SW / W, BH = SH / H;
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const s = i / 255; lin[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
  const rows = window.__fl = { t: [], blocks: [], red: [], shakeAmp: [], flash: [], sim: [], fx: [] };
  window.__flOn = true;
  function frame(now) {
    requestAnimationFrame(frame);
    const src = document.getElementById('game');
    if (!src || !window.__flOn) return;
    g.drawImage(src, 0, 0, SW, SH);
    const d = g.getImageData(0, 0, SW, SH).data;
    const ys = new Float64Array(N), rs = new Float64Array(N);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const p = (y * SW + x) * 4, k = Math.floor(y / BH) * W + Math.floor(x / BW);
      ys[k] += 0.2126 * lin[d[p]] + 0.7152 * lin[d[p + 1]] + 0.0722 * lin[d[p + 2]];
      const tot = d[p] + d[p + 1] + d[p + 2];
      if (tot > 0 && d[p] / tot >= 0.8) rs[k] += Math.min(255, Math.max(0, ((d[p] - d[p + 1] - d[p + 2]) / 255) * 320));
    }
    const b = Array.from(ys, (v) => Math.round((v / (BW * BH)) * 1000) / 1000), r = Array.from(rs, (v) => Math.round(v / (BW * BH)));
    const ud = window.__ud;
    const sim = ud && ud.play && ud.play.sim;
    const v = sim ? sim.view() : null;
    rows.t.push(Math.round(now)); rows.blocks.push(b); rows.red.push(r);
    rows.shakeAmp.push(v ? Math.max(Math.abs(v.shake.x), Math.abs(v.shake.y)) : 0);
    rows.flash.push(v ? Math.round(v.flash * 100) / 100 : 0);
    rows.sim.push(sim ? sim.stats().frames : -1);
    rows.fx.push(v ? v.fx.map((f) => f.kind).join(',') : '');
  }
  requestAnimationFrame(frame);
})();
