// Story copy checks: every script id exists, every line fits the dialogue box, the copy rules hold,
// and every hero has every bark. Imports the pure story modules, so Node runs it without a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { BarkEvent, Expr, HeroId, Speaker } from '../src/core/types.ts';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { settings } from '../src/core/settings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { PROLOGUE, PROLOGUE_PARTS, prologuePart } from '../src/story/prologue_script.ts';
import {
  BARK_MAX, LEVEL_UP_MAX, SHORT_EVENTS, barkSet, elevenTier, levelUpLines, pickBark as bark, resetBarks,
} from '../src/story/barks.ts';

const REQUIRED = [
  'prologue', 'l1_start', 'l1_tut_attack', 'l1_tut_special', 'l1_tut_swap', 'l1_agents', 'l1_gate_hint', 'l1_gate_open',
  'l1_scare', 'l1_eleven_meet', 'l1_eleven_join', 'l1_push_hint', 'l1_log_cleared', 'l1_ambush_start', 'l1_ambush_clear', 'l1_clear',
];
const REQUIRED_L2 = [
  'l2_start', 'l2_agents', 'l2_spotted', 'l2_burn_hint', 'l2_burn_done', 'l2_cages', 'l2_scare', 'l2_shoot_hint', 'l2_relay_done',
  'l2_guards', 'l2_push_hint', 'l2_crate_cleared', 'l2_lockdown_start', 'l2_warden', 'l2_lockdown_clear', 'l2_clear',
];
const SPEAKERS: Speaker[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'joyce', 'dm', 'narrator'];
const EXPRS: Expr[] = ['neutral', 'happy', 'worried', 'determined', 'hurt', 'shocked'];
const HEROES: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven'];
const EVENTS: BarkEvent[] = ['swapIn', 'levelUp', 'ko', 'lowHp', 'special', 'kill', 'eggo', 'crit', 'idle'];
const VARIANTS: Record<string, number> = { swapIn: 3, special: 3, kill: 3, crit: 3, idle: 3, ko: 2, lowHp: 2, eggo: 2 };
const BANNED = /seamless|robust|leverage|unlock|delve/i;
const EN_DASH = String.fromCharCode(0x2013);
const ELLIPSIS = String.fromCharCode(0x2026);

const words = (s: string): number => s.trim().split(/\s+/).length;
/** Key hints use numerals ("1 to 4", "swap her in with 4") and the die is a d20. Everything else spells out numbers under ten. */
const prose = (s: string): string => s.replace(/1 to 4/g, '').replace(/with [34], Q or E/g, '').replace(/\bd20\b/g, '');

const scripts = Object.values(SCRIPTS);
const allLines = scripts.flatMap((s) => s.lines.map((l, i) => ({ id: s.id, i, ...l })));
const SCRIPT_LINES_L2 = allLines.filter((l) => l.id.startsWith('l2_'));

/** The ids a level doc promises: the "Scripts Story writes" line, and the script column of the beat table. */
function docIds(file: string, prefix: string): { fromList: string[]; fromTable: string[] } {
  const doc = readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8');
  const listed = /Scripts Story writes:\s*(.+)/.exec(doc)?.[1] ?? '';
  const fromList = [...listed.matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1] as string);
  const fromTable = doc.split('\n').filter((r) => /^\|\s*`/.test(r))
    .flatMap((r) => [...(r.split('|')[3] ?? '').matchAll(new RegExp(`\`(${prefix}[a-z0-9_]+)\``, 'g'))].map((m) => m[1] as string));
  return { fromList, fromTable };
}

test('every script id from the level docs exists', () => {
  const one = docIds('level-1.md', 'l1_');
  assert.ok(one.fromList.length >= 16, 'the "Scripts Story writes" line should list sixteen ids');
  assert.ok(one.fromTable.length >= 13, 'the beat table should name the l1 scripts');
  for (const id of [...REQUIRED, ...one.fromList, ...one.fromTable]) assert.ok(SCRIPTS[id], `missing script ${id}`);
  const two = docIds('level-2.md', 'l2_');
  assert.equal(two.fromList.length, 16, 'the level 2 "Scripts Story writes" line lists sixteen ids');
  assert.equal(two.fromTable.length, 16, 'the level 2 beat table names sixteen scripts');
  for (const id of [...REQUIRED_L2, ...two.fromList, ...two.fromTable]) assert.ok(SCRIPTS[id], `missing script ${id}`);
  assert.deepEqual([...two.fromList].sort(), [...REQUIRED_L2].sort(), 'the doc and the test agree on the sixteen');
  assert.deepEqual(Object.keys(SCRIPTS).filter((k) => k.startsWith('l2_')).sort(), [...REQUIRED_L2].sort(), 'no stray l2 scripts');
});

test('script keys match ids and sizes are sane', () => {
  for (const [key, s] of Object.entries(SCRIPTS)) {
    assert.equal(s.id, key);
    if (key === 'prologue') assert.ok(s.lines.length >= 13 && s.lines.length <= 17, 'prologue is about 15 lines');
    else assert.ok(s.lines.length >= 2 && s.lines.length <= 8, `${key} has ${s.lines.length} lines`);
  }
});

test('every line fits three rows of 32 characters, with its key tokens filled in for a keyboard and a controller', () => {
  try {
    for (const device of ['keyboard', 'gamepad'] as const) {
      setPromptDevice(device);
      for (const l of allLines) {
        const shown = keyText(l.text);
        assert.ok(shown.length > 0 && shown.length <= 96, `${device} ${l.id}[${l.i}] is ${shown.length} characters`);
        assert.ok(fitsBox(shown), `${device} ${l.id}[${l.i}] needs ${wrapText(shown).length} rows: ${shown}`);
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
});

test('a controller player is never told to press a key', () => {
  try {
    setPromptDevice('gamepad');
    for (const l of allLines) {
      const shown = keyText(l.text);
      assert.ok(!/\{|\}/.test(shown), `${l.id}[${l.i}] has an unfilled token: ${shown}`);
      assert.ok(!/\b(WASD|SPACE|TAB|SHIFT|ESC|[JKLQEUVZC])\b/.test(shown), `${l.id}[${l.i}] names a key: ${shown}`);
    }
    const text = (id: string): string => keyText((SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' '));
    assert.match(text('l1_tut_attack'), /\bA attacks\b/);
    assert.match(text('l1_tut_special'), /\bX is your special\b/);
    assert.match(text('l1_tut_swap'), /LB and RB/);
    assert.doesNotMatch(text('l1_tut_swap'), /1 to 4/, 'a controller has no hero numbers');
    assert.match(text('l1_start'), /stick or D-pad/);
    assert.match(text('l1_gate_hint'), /with LB or RB/);
    assert.match(text('l1_push_hint'), /with LB or RB/);
    for (const id of ['l2_burn_hint', 'l2_shoot_hint', 'l2_push_hint']) assert.match(text(id), /with LB or RB/, `${id} names the bumpers`);
    assert.match(text('l2_burn_hint'), /\bX\b/, 'the burn hint names the special button');
    assert.match(text('l2_shoot_hint'), /\bA\b/, 'the shoot hint names the attack button');
    assert.match(text('l2_lockdown_start'), /\bY\b/, 'the lockdown names the burst button');
    assert.match(text('l2_start'), /\bto light them\b/);
  } finally {
    setPromptDevice('keyboard');
  }
});

test('copy rules: no em dashes, banned words, odd dashes or spelled-out digits', () => {
  const texts = [...allLines.map((l) => l.text), ...HEROES.flatMap((h) => levelUpLines(h))];
  for (const h of HEROES) for (let lv = 1; lv <= 9; lv++) for (const e of SHORT_EVENTS) for (const t of barkSet(h, lv)?.[e] ?? []) texts.push(t);
  for (const t of texts) {
    assert.ok(!hasEmDash(t), `em dash in: ${t}`);
    assert.ok(!t.includes(EN_DASH) && !t.includes(ELLIPSIS), `en dash or ellipsis character in: ${t}`);
    assert.ok(!BANNED.test(t), `banned word in: ${t}`);
    assert.ok(!/\b[0-9]\b/.test(prose(t)), `write numbers under ten out in prose: ${t}`);
  }
});

test('speakers and expressions are valid', () => {
  for (const l of allLines) {
    assert.ok(SPEAKERS.includes(l.who), `${l.id}[${l.i}] has speaker ${l.who}`);
    if (l.expr) assert.ok(EXPRS.includes(l.expr), `${l.id}[${l.i}] has expr ${l.expr}`);
  }
});

test('tutorial scripts teach the real keys', () => {
  // Lines name keys as {tokens}. With the default bindings they read as the keys the game ships with.
  const text = (id: string): string => keyText((SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' '));
  assert.match(text('l1_tut_attack'), /\bZ\b/);
  assert.match(text('l1_tut_special'), /\bX\b/);
  assert.match(text('l1_tut_special'), /\bMP\b/);
  assert.match(text('l1_tut_swap'), /\bC and V\b/);
  assert.match(text('l1_tut_swap'), /1 to 4/);
  assert.doesNotMatch(text('l1_agents'), /\bdash/i, 'there is no dash to teach');
  assert.match(text('l1_start'), /\bSPACE\b/);
  assert.match(text('l1_start'), /WASD/);
  assert.match(text('l1_push_hint'), /\bZ\b/);
  // The puzzle hints name the hero's slot as well as the attack key.
  assert.match(text('l1_gate_hint'), /with 3, C or V/);
  assert.match(text('l1_gate_hint'), /\bZ\b/);
  assert.match(text('l1_push_hint'), /with 4, C or V/);
});

test('level 2 puzzle scripts name the hero slot and the key, like the level 1 hints do', () => {
  const text = (id: string): string => keyText((SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' '));
  assert.match(text('l2_burn_hint'), /with 2, C or V/);
  assert.match(text('l2_burn_hint'), /\bX\b/);
  assert.match(text('l2_shoot_hint'), /with 3, C or V/);
  assert.match(text('l2_shoot_hint'), /\bZ\b/);
  assert.match(text('l2_push_hint'), /with 4, C or V/);
  assert.match(text('l2_push_hint'), /\bZ\b/);
  assert.match(text('l2_start'), /\bSPACE\b/);
  assert.match(text('l2_lockdown_start'), /press SPACE\./, 'Space is the burst key the prompts teach');
});

test('each script is voiced by the people who should be in it', () => {
  const who = (id: string): Set<Speaker> => new Set((SCRIPTS[id]?.lines ?? []).map((l) => l.who));
  for (const s of ['joyce', 'mike', 'dustin'] as Speaker[]) assert.ok(who('l1_start').has(s), `l1_start needs ${s}`);
  assert.ok(who('l1_tut_attack').has('dustin'));
  assert.ok(who('l1_tut_special').has('mike'));
  assert.ok(who('l1_tut_swap').has('lucas'));
  assert.ok(who('l1_agents').has('lucas'));
  assert.ok(who('l1_gate_hint').has('lucas'));
  assert.ok(who('l1_eleven_meet').has('eleven') && who('l1_eleven_join').has('eleven'));
  assert.ok(!who('l1_start').has('eleven'), 'Eleven has not joined yet');
  // Level 2: the same four kids, and the hint belongs to whoever solves the puzzle or explains it.
  for (const s of ['mike', 'dustin', 'lucas', 'eleven'] as Speaker[]) assert.ok(who('l2_start').has(s), `l2_start needs ${s}`);
  assert.ok(who('l2_agents').has('lucas'));
  assert.ok(who('l2_burn_hint').has('dustin') && who('l2_burn_done').has('dustin'));
  assert.ok(who('l2_shoot_hint').has('lucas') && who('l2_relay_done').has('lucas'));
  assert.ok(who('l2_push_hint').has('dustin') && who('l2_push_hint').has('eleven') && who('l2_crate_cleared').has('eleven'));
  assert.ok(who('l2_scare').has('eleven') && who('l2_cages').has('eleven'));
  assert.ok(who('l2_guards').has('dustin') && who('l2_guards').has('eleven'), 'the shield lesson is Dustin\'s, and Eleven answers it');
  assert.ok(who('l2_warden').has('eleven') && who('l2_spotted').has('lucas'));
  for (const l of SCRIPT_LINES_L2) assert.ok(l.who !== 'will' && l.who !== 'joyce', `${l.id}[${l.i}]: Will and Joyce are not in the Lab`);
});

test('Eleven speaks one or two words in every script', () => {
  for (const l of allLines) if (l.who === 'eleven') assert.ok(words(l.text) <= 2, `${l.id}[${l.i}]: ${l.text}`);
  assert.ok(SCRIPT_LINES_L2.filter((l) => l.who === 'eleven').length >= 8, 'Eleven has lines in level 2');
});

test('level 2 teaches the hard Lab: the cameras, the shields, the slam and the live floor', () => {
  const text = (id: string): string => (SCRIPTS[id]?.lines ?? []).map((l) => l.text).join(' ');
  assert.match(text('l2_agents'), /camera/i, 'corridor A names the cameras');
  assert.match(text('l2_agents'), /knock them out|shoot/i, 'and says Lucas can take them out');
  assert.match(text('l2_spotted'), /saw us/i);
  assert.match(text('l2_guards'), /shield/i);
  assert.match(text('l2_guards'), /side or the back/i, 'the counter is to go round');
  assert.match(text('l2_warden'), /ring/i, 'the slam telegraph is named');
  assert.match(text('l2_burn_hint'), /plates/i, 'the power room warns about the panels');
  assert.match(text('l2_shoot_hint'), /steam/i, 'the corridor warns about the grates');
  assert.match(text('l2_lockdown_start'), /floor/i, 'the lockdown warns about the live floor');
});

test('level 2 ends on a hook for the school and starts at the dock', () => {
  const last = SCRIPTS.l2_clear?.lines.map((l) => l.text).join(' ') ?? '';
  assert.match(last, /school/i, 'the last script points at stage 1.3');
  assert.match(SCRIPTS.l2_start?.lines[0]?.text ?? '', /dock/i, 'the first script is at the loading dock');
});

test('prologue: about fifteen lines, four parts, ends on a roll request and a fade', () => {
  assert.equal(PROLOGUE.id, 'prologue');
  assert.equal(PROLOGUE.lines.length, 15);
  assert.deepEqual(PROLOGUE.lines, PROLOGUE_PARTS.flat());
  assert.equal(SCRIPTS.prologue, PROLOGUE);
  assert.deepEqual(PROLOGUE_PARTS.map((p) => p.length), [6, 3, 3, 3]);
  const beforeRoll = PROLOGUE_PARTS[0]?.at(-1);
  assert.equal(beforeRoll?.who, 'will', 'Will reacts, then the die rolls');
  assert.match(PROLOGUE_PARTS[0]?.[4]?.text ?? '', /roll/i);
  assert.equal(PROLOGUE_PARTS[0]?.[4]?.who, 'mike');
  assert.match(PROLOGUE_PARTS[1]?.[0]?.text ?? '', /\btwo\b/i, 'the die lands low');
  const ids = PROLOGUE_PARTS.map((_, i) => prologuePart(i).id);
  assert.equal(new Set(ids).size, ids.length);
  const speakers = new Set(PROLOGUE.lines.map((l) => l.who));
  for (const s of ['dm', 'mike', 'dustin', 'lucas', 'will'] as Speaker[]) assert.ok(speakers.has(s), `prologue needs ${s}`);
});

// ---------------------------------------------------------------- the scene, driven without a canvas
test('the prologue scene runs its timeline in order and calls onDone once', async (t) => {
  let story: typeof import('../src/story/index.ts');
  let audioMod: typeof import('../src/audio/index.ts');
  try {
    story = await import('../src/story/index.ts');
    audioMod = await import('../src/audio/index.ts');
  } catch {
    t.skip('the scene imports ui, gfx and audio, which need a DOM in this build');
    return;
  }
  const audio = audioMod.audio;
  const real = { sfx: audio.sfx, music: audio.music, blip: audio.blip };
  const heard: string[] = [];
  audio.sfx = (id) => { heard.push(id); };
  audio.music = () => { /* silent */ };
  audio.blip = () => { /* silent */ };
  // Skip story is on by default and the prologue would end on its first frame, so play it for real.
  const skipWas = settings.skipDialogue;
  settings.skipDialogue = false;
  try {
    let done = 0;
    const scene = story.createPrologueScene({ onDone() { done++; } });
    assert.equal(scene.opaque, true);
    let press = false;
    const g = { input: { pressed: (a: string) => press && a === 'confirm' }, settings: { reduceFlashing: false } };
    scene.enter?.(g as never);
    let frames = 0;
    while (done === 0 && frames < 20000) {
      press = frames % 14 === 0;
      scene.update(g as never);
      frames++;
    }
    for (let i = 0; i < 300; i++) scene.update(g as never);
    assert.equal(done, 1, 'onDone fires once and only once');
    assert.ok(frames > 600 && frames < 3000, `ran ${frames} frames`);
    const at = (id: string, from = 0): number => heard.indexOf(id, from);
    const open = heard.map((id, i) => (id === 'dialogOpen' ? i : -1)).filter((i) => i >= 0);
    assert.equal(open.length, 4, 'four dialogue parts');
    assert.deepEqual(heard.filter((id) => id === 'roll').length, 7, 'seven clatters');
    const land = at('rollLand');
    assert.ok(open[0] < at('roll') && at('roll') < land && land < open[1], 'part one, the roll, then the lands-low part');
    const flicker = at('flicker');
    const growl = at('growl');
    assert.ok(open[2] < flicker && flicker < growl && growl < open[3], 'flicker, then growl, then the last part');
  } finally {
    settings.skipDialogue = skipWas;
    audio.sfx = real.sfx; audio.music = real.music; audio.blip = real.blip;
  }
});

// ---------------------------------------------------------------- barks
test('every hero has every bark event at every level', () => {
  for (const h of HEROES) {
    for (const e of EVENTS) {
      for (const lv of [1, 2, 3, 4, 5, 6, 9]) {
        const t = bark(h, e, lv);
        assert.ok(t && t.length > 0, `${h} ${e} level ${lv}`);
      }
    }
  }
});

test('short barks are 22 characters or fewer', () => {
  assert.equal(BARK_MAX, 22);
  for (const h of HEROES) {
    for (const lv of [1, 2, 3, 4, 5, 6, 9]) {
      for (const e of SHORT_EVENTS) {
        for (const t of barkSet(h, lv)?.[e] ?? []) assert.ok(t.length <= BARK_MAX, `${h} ${e} level ${lv}: "${t}" is ${t.length}`);
      }
    }
  }
});

test('variant counts: three for swapIn, special, kill, crit, idle and two for ko, lowHp, eggo', () => {
  for (const h of HEROES) {
    for (const lv of [1, 4, 7]) {
      for (const e of SHORT_EVENTS) {
        const list = barkSet(h, lv)?.[e] ?? [];
        assert.equal(list.length, VARIANTS[e], `${h} ${e} level ${lv}`);
        assert.equal(new Set(list).size, list.length, `${h} ${e} level ${lv} repeats a line`);
      }
    }
  }
});

test('barks cycle in a fixed order and start over on reset', () => {
  resetBarks();
  const first = Array.from({ length: 7 }, () => bark('dustin', 'kill', 1));
  assert.deepEqual(first.slice(0, 3), barkSet('dustin', 1)?.kill);
  assert.deepEqual(first.slice(3, 6), first.slice(0, 3));
  assert.equal(first[6], first[0]);
  resetBarks();
  const again = Array.from({ length: 7 }, () => bark('dustin', 'kill', 1));
  assert.deepEqual(again, first);
  // Other events and heroes keep their own counters.
  resetBarks();
  bark('mike', 'kill', 1);
  assert.equal(bark('lucas', 'kill', 1), barkSet('lucas', 1)?.kill[0]);
  assert.equal(bark('mike', 'idle', 1), barkSet('mike', 1)?.idle[0]);
});

test('level-up lines exist for levels 2 and 3, fit 64 characters, and wrap in the callout', () => {
  assert.equal(LEVEL_UP_MAX, 64);
  for (const h of HEROES) {
    const two = bark(h, 'levelUp', 2);
    const three = bark(h, 'levelUp', 3);
    const other = bark(h, 'levelUp', 4);
    assert.ok(two && three && other, `${h} level-up lines`);
    assert.notEqual(two, three);
    assert.notEqual(three, other);
    assert.equal(bark(h, 'levelUp', 2), two, 'level-up lines do not cycle');
    for (const t of levelUpLines(h)) {
      assert.ok(t.length <= LEVEL_UP_MAX, `${h}: "${t}" is ${t.length}`);
      assert.ok(wrapText(t, 26).length <= 3, `${h}: "${t}" needs more than three callout rows`);
    }
  }
});

test("Eleven's level 1 barks are two words or fewer", () => {
  for (const lv of [1, 2]) {
    for (const e of SHORT_EVENTS) for (const t of barkSet('eleven', lv)?.[e] ?? []) assert.ok(words(t) <= 2, `level ${lv} ${e}: ${t}`);
  }
  resetBarks();
  for (const e of EVENTS) assert.ok(words(bark('eleven', e, 1) ?? '') <= 2, `bark(eleven, ${e}, 1)`);
  assert.ok(words(bark('eleven', 'levelUp', 2) ?? '') <= 2);
  resetBarks();
  assert.equal(bark('eleven', 'kill', 1), 'Bad.');
  assert.equal(bark('eleven', 'eggo', 1), 'Mine.');
});

test("Eleven's vocabulary grows with her level", () => {
  assert.deepEqual([1, 2, 3, 5, 6, 9].map(elevenTier), [0, 0, 1, 1, 2, 2]);
  const avg = (lv: number): number => {
    const all = SHORT_EVENTS.flatMap((e) => barkSet('eleven', lv)?.[e] ?? []);
    return all.reduce((n, t) => n + words(t), 0) / all.length;
  };
  assert.ok(avg(1) < avg(3) && avg(3) < avg(6), `${avg(1)} ${avg(3)} ${avg(6)}`);
  assert.ok(avg(1) <= 2 && avg(3) <= 5, 'tier two stays short');
  for (const e of SHORT_EVENTS) for (const t of barkSet('eleven', 4)?.[e] ?? []) assert.ok(words(t) <= 5, `level 4 ${e}: ${t}`);
  const low = words(bark('eleven', 'levelUp', 4) ?? '');
  const high = words(bark('eleven', 'levelUp', 6) ?? '');
  assert.ok(high > low, 'her level-up line is fuller from level 6');
});
