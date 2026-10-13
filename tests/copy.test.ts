import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EM_DASH } from '../src/core/text.ts';

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|md|json|html|css)$/.test(name)) out.push(p);
  }
  return out;
}

test('no em dashes in source, docs, tests or top-level notes', () => {
  const files = [
    ...walk(join(ROOT, 'src')),
    ...walk(join(ROOT, 'docs')),
    ...walk(join(ROOT, 'tests')),
    ...['README.md', 'TODO.md'].map((f) => join(ROOT, f)).filter(existsSync),
  ];
  const bad = files.filter((f) => readFileSync(f, 'utf8').includes(EM_DASH));
  assert.deepEqual(bad, []);
});
