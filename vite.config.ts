import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Dev-only: POST /__snap?name=x&dir=screenshots|music with a data URL body writes
 * docs/screenshots/x.png or music/x.wav. Used by the dev panel and the audio render.
 */
function snapshotSink() {
  return {
    name: 'snapshot-sink',
    configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any) => void) => void } }) {
      server.middlewares.use('/__snap', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const q = new URL(req.url ?? '/', 'http://x').searchParams;
        const rawName = q.get('name') ?? 'shot';
        const ext = rawName.endsWith('.wav') ? '.wav' : '.png';
        const name = rawName.replace(/\.(wav|png)$/i, '').replace(/\.{2,}/g, '.').replace(/[^a-z0-9_./-]/gi, '_').replace(/^[/.]+/, '');
        const dir = q.get('dir') === 'music' ? join(process.cwd(), 'music') : join(process.cwd(), 'docs', 'screenshots');
        let body = '';
        req.on('data', (c: string) => { body += c; });
        req.on('end', () => {
          const b64 = body.replace(/^data:[\w/-]+;base64,/, '');
          const file = join(dir, `${name}${ext}`);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, Buffer.from(b64, 'base64'));
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, file }));
        });
      });
    },
  };
}

export default {
  base: process.env.BASE_PATH ?? '/',
  cacheDir: '.vite',
  plugins: [snapshotSink()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
};
