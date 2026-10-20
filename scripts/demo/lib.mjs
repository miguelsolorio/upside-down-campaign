// Helpers for the demo recorder (record.mjs): a dev server on a free port, a headless Chrome page in capture mode, and the files under demo/out.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../polish/cdp.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A port nothing is listening on. The recorder never uses 5173 or the ports in .claude/launch.json: the OS picks one. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Starts the Vite dev server on a free port and waits until it answers. `stop()` ends it. */
export async function startServer() {
  const port = await freePort();
  const log = [];
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => log.push(String(d)));
  proc.stderr.on('data', (d) => log.push(String(d)));
  const stop = () => { try { proc.kill(); } catch { /* already gone */ } };
  process.on('exit', stop);
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return { port, stop, log }; } catch { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error(`the dev server stopped:\n${log.join('')}`);
    await sleep(200);
  }
  stop();
  throw new Error(`the dev server did not start:\n${log.join('')}`);
}

/** The game's saved settings for a recording: the defaults, with the story on so the prologue and the dialogue play. */
const SETTINGS = { musicVol: 0.7, sfxVol: 0.8, scanlines: true, shake: 1, reduceFlashing: false, skipDialogue: false, difficulty: 'normal', shell: 'auto', rumble: true, rev: 2 };

/** ?capture=1 first, then the shot's own flags in the order it lists them. */
export function urlOf(port, flags) {
  const q = new URLSearchParams({ capture: '1' });
  for (const [k, v] of Object.entries(flags ?? {})) q.set(k, String(v));
  return `http://127.0.0.1:${port}/?${q}`;
}

/**
 * Opens a fresh headless Chrome (a clean profile, so nothing saved leaks between shots) on the shot's page in capture mode.
 * Resolves once the page's recorder API is up. `evaluate` runs a function of window.__ud in the page.
 */
export async function openShot(port, shot) {
  const chromePort = await freePort();
  const c = await launch(chromePort, ['--force-color-profile=srgb', '--disable-lcd-text']);
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 384, height: 224, deviceScaleFactor: 1, mobile: false });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const store = { 'upside-down:settings:v1': { ...SETTINGS, ...(shot.settings ?? {}) }, ...(shot.storage ?? {}) };
  const seed = `try{localStorage.clear();${Object.entries(store).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(JSON.stringify(v))});`).join('')}}catch{}`;
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: seed });
  const url = urlOf(port, shot.url);
  await c.send('Page.navigate', { url });
  for (let i = 0; ; i++) {
    const ready = await c.evaluate('!!(window.__ud && window.__ud.cap && window.__ud.demo)').catch(() => false);
    if (ready) {
      // Whatever a slow first load threw is behind us: only what the page throws from here on counts.
      c.events.length = 0;
      break;
    }
    // A page that has not come up in ten seconds gets one more go, as the first compile of a busy dev server can be slow.
    if (i === 100) await c.send('Page.navigate', { url });
    if (i > 300) {
      const why = c.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.text).join(' | ');
      throw new Error(`shot ${shot.id}: the page never came up in capture mode ${why}`);
    }
    await sleep(100);
  }
  const errors = () => c.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text);
  return { ...c, errors };
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const pad = (n) => String(n).padStart(5, '0');
export const sha = (buf) => createHash('sha256').update(buf).digest('hex');

/** A 16-bit mono PCM WAV. */
export function wavOf(pcm, rate = 44100) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
