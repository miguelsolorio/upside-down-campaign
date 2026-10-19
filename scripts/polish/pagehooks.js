// Injected before the page: a fake controller the script drives, and a hook that says what scene is on top.
(() => {
  const mk = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
  window.__pad = { on: false, buttons: mk(), axes: [0, 0, 0, 0] };
  const pad = () => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), buttons: window.__pad.buttons, axes: window.__pad.axes, vibrationActuator: null });
  navigator.getGamepads = () => (window.__pad.on ? [pad(), null, null, null] : [null, null, null, null]);
  const ids = new WeakMap(); let n = 0;
  window.__obs = () => {
    const g = window.__ud && window.__ud.g;
    const top = g && g.scenes.top();
    if (top && !ids.has(top)) ids.set(top, ++n);
    return { top: top ? ids.get(top) : 0, set: g ? { ...g.settings } : null, device: g ? g.input.device() : null };
  };
  const sc = document.createElement('canvas'); sc.width = 64; sc.height = 40; const sg = sc.getContext('2d', { willReadFrequently: true });
  window.__shot = () => { sg.drawImage(document.getElementById('game'), 0, 0, 64, 40); const d = sg.getImageData(0, 0, 64, 40).data; const out = []; for (let i = 0; i < d.length; i += 4) out.push(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11); return out; };
})();
