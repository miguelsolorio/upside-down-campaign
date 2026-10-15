// The chapter 4 variation sheets (docs/chapter-4.md): every sprite keeps to five fill colors and the ink outline, no role
// letter goes unpainted, every stage look paints a 16 px tile for every letter of its room and keeps its props in the room,
// and the sheet files stay under 500 lines with no em dashes (copy.test.ts covers src, docs and tests, not the root pages).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EM_DASH } from '../src/core/text.ts';
import { FRAMES, FW, eddieFrame } from '../src/gfx/var/eddie_kit.ts';
import { EDDIE_OPTS } from '../src/gfx/var/eddie_opts.ts';
import { fills, paintRoles, unmapped } from '../src/gfx/var/kit.ts';
import { COLS, ROOM_H, ROOM_W, ROWS, ctxAt } from '../src/gfx/var/look_kit.ts';
import type { Room, StageLook } from '../src/gfx/var/look_kit.ts';
import { POSE_ORDER } from '../src/gfx/var/vecna_kit.ts';
import { VECNA_OPTS } from '../src/gfx/var/vecna_opts.ts';
import { PIT_OPTS, PIT_ROOM } from '../src/gfx/var/pit.ts';
import { KAMCHATKA_OPTS, KAMCHATKA_ROOM } from '../src/gfx/var/kamchatka.ts';
import { CREEL_OPTS, CREEL_ROOM } from '../src/gfx/var/creel.ts';
import { HAWKINSUD_OPTS, HAWKINSUD_ROOM } from '../src/gfx/var/hawkinsud.ts';

const ROOT = new URL('..', import.meta.url).pathname;

test('every Eddie keeps to five fill colors and paints every role', () => {
  for (const o of EDDIE_OPTS) {
    const bufs = FRAMES.map((fr) => eddieFrame(o, fr));
    for (const b of bufs) assert.deepEqual(unmapped(b, o.spec.pal), [], `${o.slug} has unmapped roles`);
    assert.ok(fills(...bufs.map((b) => paintRoles(b, FW, o.spec.pal))) <= 5, `${o.slug} uses more than five colors`);
  }
});

test('every Vecna keeps to five fill colors without his fire', () => {
  for (const o of VECNA_OPTS) {
    const n = fills(...POSE_ORDER.filter((p) => p !== 'burn' && p !== 'whip').map((p) => o.draw(p)));
    assert.ok(n <= 5, `${o.slug} uses ${n} colors`);
  }
});

const SHEETS: [string, Room, StageLook[]][] = [['pit', PIT_ROOM, PIT_OPTS], ['kamchatka', KAMCHATKA_ROOM, KAMCHATKA_OPTS], ['creel', CREEL_ROOM, CREEL_OPTS], ['hawkinsud', HAWKINSUD_ROOM, HAWKINSUD_OPTS]];

test('every stage look paints each letter of its room and keeps its props inside', () => {
  for (const [name, room, looks] of SHEETS) {
    assert.equal(room.map.length, ROWS, `${name} room rows`);
    for (const row of room.map) assert.equal(row.length, COLS, `${name} room columns`);
    assert.ok(looks.length >= 3 && looks.length <= 5, `${name} has ${looks.length} looks`);
    for (const look of looks) {
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = 0; tx < COLS; tx++) {
          const t = look.tile(ctxAt(room, tx, ty), 0);
          assert.ok(t.w === 16 && t.h === 16, `${name} ${look.slug} tile ${room.map[ty]![tx]} is ${t.w} by ${t.h}`);
        }
      }
      const props = look.props(0);
      assert.ok(props.length >= room.props.length, `${name} ${look.slug} has ${props.length} props`);
      for (const p of props) assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.px.w <= ROOM_W && p.y + p.px.h <= ROOM_H, `${name} ${look.slug} prop out of the room`);
    }
  }
});

test('the chapter 4 sheet files stay under 500 lines with no em dashes', () => {
  const VAR = join(ROOT, 'src/gfx/var');
  const mods = readdirSync(VAR).filter((f) => /^(ch4|sheet_png|look_|eddie|solo|vecna|pit|kamchatka|creel|hawkinsud)/.test(f)).map((f) => join(VAR, f));
  const pages = ['eddie', 'solo', 'vecna', 'pit', 'kamchatka', 'creel', 'hawkinsud'].map((s) => join(ROOT, `${s}-variations.html`));
  for (const f of [...mods, ...pages, join(ROOT, 'docs/chapter-4.md')]) {
    const text = readFileSync(f, 'utf8');
    assert.ok(text.split('\n').length < 500, `${f} is 500 lines or more`);
    assert.ok(!text.includes(EM_DASH), `${f} has an em dash`);
  }
});
