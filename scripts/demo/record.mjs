// node scripts/demo/record.mjs [--shot id[,id]] [--draft] [--sheet]      (also: npm run demo)
// Records the 45 second video ad of the game into demo/out/demo.mp4: 1920 by 1080, 60 fps, H.264 and AAC, with the game's own music
// and effects. The game runs in headless Chrome in capture mode (?capture=1), stepped one tick at a time, so every frame is exact and a
// second run on the same code is the same video. docs/demo.md says how it works and how to change a shot.
//   --shot id   re-record only these shots (comma list) and reuse the cached frames and sound of the others
//   --draft     half size, in demo/out/draft, for a quick look
//   --sheet     also write a contact sheet, one frame per shot, to demo/out/sheet.png
//   --jobs n    how many shots to record at once (default 3)
//   --encode    record nothing: join the cached frames and sound into the video again
//   --crf n     x264 quality (default 14, which is about 47 MiB). A different one writes demo-crf<n>.mp4 beside demo.mp4; 21 is 25 MiB, under a 30 MiB upload limit
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FPS, SHOTS, TOTAL_FRAMES } from './shots.mjs';
import { ROOT, ensureDir, openShot, pad, sha, startServer, wavOf, writeJson } from './lib.mjs';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const draft = flag('draft');
const only = value('shot')?.split(',').filter(Boolean) ?? null;
const OUT = join(ROOT, 'demo', 'out', draft ? 'draft' : '');
const FRAMES = join(OUT, 'frames');
const AUDIO = join(OUT, 'audio');
const FRAME_SAMPLES = 44100 / FPS;

for (const id of only ?? []) if (!SHOTS.some((s) => s.id === id)) throw new Error(`there is no shot called ${id}. The shots are ${SHOTS.map((s) => s.id).join(', ')}`);

/** The stills and the sound of one shot: the game runs to the shot's trigger, then makes a frame at a time. */
async function recordShot(server, shot) {
  const t0 = Date.now();
  let page = await openShot(server.port, shot);
  try {
    const run = async (stopAt) => {
      if (shot.setup) await page.evaluate(`(${shot.setup.toString()})(window.__ud)`);
      return page.evaluate(`window.__ud.demo.seek(${JSON.stringify(shot.trigger.toString())}, ${shot.timeout}, ${JSON.stringify(shot.auto ?? [])}, ${stopAt ?? 'undefined'})`);
    };
    let found = await run();
    if (!found.found) {
      const why = found.error ? ` (the last error in the trigger: ${found.error})` : '';
      throw new Error(`shot ${shot.id}: the trigger never fired in ${shot.timeout} ticks${why}`);
    }
    if (shot.lead) {
      // The shot starts `lead` frames before its trigger: run the same game again and stop short of it.
      const stopAt = found.ticks - shot.lead;
      if (stopAt < 0) throw new Error(`shot ${shot.id}: the trigger fired on tick ${found.ticks}, before the ${shot.lead} frames of lead`);
      await page.close();
      page = await openShot(server.port, shot);
      found = await run(stopAt);
    }
    const spec = { id: shot.id, len: shot.len, cam: shot.cam, captions: shot.captions, flashes: shot.flashes, flashOn: shot.flashOn, fadeIn: shot.fadeIn, fadeOut: shot.fadeOut, keys: shot.keys, card: shot.card };
    const start = await page.evaluate(`window.__ud.demo.begin(${JSON.stringify(spec)})`);
    const dir = ensureDir(join(FRAMES, shot.id));
    for (const f of readdirSync(dir)) rmSync(join(dir, f));
    const hashes = [];
    for (let i = 0; i < shot.len; i++) {
      const url = await page.evaluate(`window.__ud.demo.frame(${i}, ${draft})`);
      const png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      writeFileSync(join(dir, `${pad(i + 1)}.png`), png);
      hashes.push(sha(png));
    }
    const mix = await page.evaluate(`window.__ud.demo.mix(${shot.audio.fadeIn}, ${shot.audio.fadeOut}, ${JSON.stringify(shot.audio.bed ?? null)} ?? undefined)`);
    const pcm = Buffer.from(mix.pcm, 'base64');
    if (pcm.length !== shot.len * FRAME_SAMPLES * 2) throw new Error(`shot ${shot.id}: ${pcm.length / 2} samples of sound for ${shot.len} frames`);
    ensureDir(AUDIO);
    writeFileSync(join(AUDIO, `${shot.id}.pcm`), pcm);
    const errors = page.errors();
    if (errors.length) throw new Error(`shot ${shot.id}: the page threw ${errors.join(' | ')}`);
    const meta = { id: shot.id, frames: shot.len, startTick: start, hash: sha(hashes.join('')), audio: mix.info, seconds: (Date.now() - t0) / 1000 };
    writeJson(join(dir, 'meta.json'), meta);
    console.log(`${shot.id.padEnd(14)} ${shot.len} frames from tick ${start}  ${meta.seconds.toFixed(0)} s  peak ${mix.info.peak.toFixed(2)}`);
  } finally {
    await page.close();
  }
}

/** Every shot has to have been recorded, in this mode, with the length the list says. */
function cachedOf(shot) {
  const file = join(FRAMES, shot.id, 'meta.json');
  if (!existsSync(file) || !existsSync(join(AUDIO, `${shot.id}.pcm`))) return null;
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  return meta.frames === shot.len ? meta : null;
}

/** Target loudness for the video's sound, in LUFS, and the most the sound may be turned up or down to reach it. */
const TARGET_LUFS = -16;
const MAX_UP = 8;
const MAX_DOWN = 6;

/**
 * The game's mix is quiet for a video: its own limiter leaves a lot of room. This measures the whole sound and turns it up (or down)
 * by one fixed amount to the target, then a limiter catches any peak the gain pushed over. The same sound always gets the same gain.
 */
function levelFilter(wav) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', wav, '-af', `loudnorm=I=${TARGET_LUFS}:TP=-1.5:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const json = /\{[^{}]*"input_i"[^{}]*\}/s.exec(r.stderr)?.[0];
  if (!json) throw new Error(`ffmpeg could not measure the loudness:\n${r.stderr}`);
  const measured = Number(JSON.parse(json).input_i);
  const gain = Math.max(-MAX_DOWN, Math.min(MAX_UP, TARGET_LUFS - measured));
  console.log(`sound ${measured.toFixed(1)} LUFS, ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB to reach ${TARGET_LUFS}`);
  return `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=disabled`;
}

/** The frames in order as one numbered run of links, and the sound as one WAV, then ffmpeg joins them. */
function encode() {
  const seq = ensureDir(join(OUT, 'seq'));
  // unlink, not rm: rmSync leaves a link alone when what it points at is gone, and a re-recorded shot may have fewer frames than before.
  for (const f of readdirSync(seq)) unlinkSync(join(seq, f));
  let n = 0;
  const pcm = [];
  for (const shot of SHOTS) {
    for (let i = 1; i <= shot.len; i++) symlinkSync(join(FRAMES, shot.id, `${pad(i)}.png`), join(seq, `${pad(++n)}.png`));
    pcm.push(readFileSync(join(AUDIO, `${shot.id}.pcm`)));
  }
  const wav = join(OUT, 'demo.wav');
  writeFileSync(wav, wavOf(Buffer.concat(pcm)));
  const crf = value('crf');
  const mp4 = join(OUT, crf ? `demo-crf${crf}.mp4` : 'demo.mp4');
  const quality = draft ? ['-preset', 'veryfast', '-crf', crf ?? '24'] : ['-preset', 'slow', '-crf', crf ?? '14'];
  const r = spawnSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(seq, '%05d.png'), '-i', wav,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', ...quality, '-r', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-af', `${levelFilter(wav)},pan=stereo|c0=c0|c1=c0`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', mp4,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  return mp4;
}

/** One frame from the middle of each shot, laid out by the page in the game's font. */
async function sheet(server) {
  const tiles = SHOTS.map((s) => {
    const png = readFileSync(join(FRAMES, s.id, `${pad(Math.max(1, s.sheetAt ?? Math.floor(s.len / 2)))}.png`));
    return { id: s.id, url: `data:image/png;base64,${png.toString('base64')}` };
  });
  const page = await openShot(server.port, { id: 'sheet', url: {} });
  try {
    const url = await page.evaluate(`window.__ud.demo.sheet(${JSON.stringify(tiles)}, 4)`);
    const file = join(ROOT, 'demo', 'out', draft ? 'draft' : '', 'sheet.png');
    writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    return file;
  } finally {
    await page.close();
  }
}

/** Runs the shots a few at a time, each in a Chrome of its own. The first failure stops the rest from starting. */
async function recordAll(server, shots, jobs) {
  const queue = [...shots];
  let error = null;
  const worker = async () => {
    for (let shot = queue.shift(); shot && !error; shot = queue.shift()) {
      try { await recordShot(server, shot); } catch (e) { error ??= e; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, shots.length) }, worker));
  if (error) throw error;
}

mkdirSync(FRAMES, { recursive: true });
const server = await startServer();
let failed = false;
try {
  for (const shot of SHOTS) if ((only || flag('encode')) && !only?.includes(shot.id) && !cachedOf(shot)) throw new Error(`shot ${shot.id} has no cached frames: run without --shot once first`);
  const todo = flag('encode') ? [] : SHOTS.filter((s) => !only || only.includes(s.id));
  await recordAll(server, todo, Number(value('jobs') ?? 3));
  if (flag('sheet')) console.log('sheet', await sheet(server));
  if (!only || only.length) console.log('video', encode());
  const manifest = Object.fromEntries(SHOTS.map((s) => [s.id, cachedOf(s)?.hash]));
  writeJson(join(OUT, 'manifest.json'), manifest);
} catch (e) {
  failed = true;
  console.error(String(e.message ?? e));
} finally {
  server.stop();
}
process.exit(failed ? 1 : 0);
