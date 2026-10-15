// NORMAL and HARD (docs/controls.md, "Options"): normal sits under chief, NORMAL is the default, a settings v1 save's chief
// reads as NORMAL once, a bad saved value falls back to NORMAL, the options row cycles, and a change mid-stage takes hold at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from '../src/core/scene.ts';
import type { MenuItem } from '../src/ui/menu.ts';

Object.assign(globalThis, { addEventListener: () => {} });
(globalThis as unknown as { document: unknown }).document = {
  createElement: () => ({ width: 1, height: 1, getContext: () => ({}) }),
  body: { classList: { toggle: () => {} } },
};
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
  configurable: true,
});

const { DIFFICULTY_MULT } = await import('../src/enemies/defs.ts');
const { PLAYER_DIFFICULTIES, loadSettings, saveSettings, settings } = await import('../src/core/settings.ts');
const { settingItems } = await import('../src/ui/menu.ts');
const { hurtHero } = await import('../src/combat/damage.ts');
const { agent, makeWhite } = await import('./sim-helpers.ts');

const KEY = 'upside-down:settings:v1';
const saved = (): Record<string, unknown> => JSON.parse(store.get(KEY) ?? '{}') as Record<string, unknown>;
const hpMax = (b: ReturnType<typeof makeWhite>, i = 0): number => (b.s.enemies[i] as { hpMax: number }).hpMax;
/** The same attack on the same hero with the same random stream. */
const hit = (b: ReturnType<typeof makeWhite>): number => hurtHero(b.s, b.s.heroes[0]!, 0, 0, 1, 20);

test('difficulty: normal sits under chief and over kid, and HARD is chief, the balance every stage was measured at', () => {
  assert.equal(DIFFICULTY_MULT.chief, 1);
  assert.ok(DIFFICULTY_MULT.kid < DIFFICULTY_MULT.normal && DIFFICULTY_MULT.normal < DIFFICULTY_MULT.chief, `normal is ${DIFFICULTY_MULT.normal}`);
  assert.deepEqual([...PLAYER_DIFFICULTIES], ['normal', 'chief'], 'the options offer NORMAL and HARD, and kid and upside stay internal');
  // In the sim, on a stage with its own factor: fewer HP and softer hits, by about the ratio.
  const normal = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.15, difficulty: 'normal' });
  const chief = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.15, difficulty: 'chief' });
  assert.equal(hpMax(normal), Math.round(24 * 1.15 * DIFFICULTY_MULT.normal));
  assert.ok(hpMax(normal) < hpMax(chief), `${hpMax(normal)} under ${hpMax(chief)}`);
  const soft = hit(normal), hard = hit(chief);
  assert.ok(soft < hard, `${soft} under ${hard}`);
  assert.ok(Math.abs(soft - hard * DIFFICULTY_MULT.normal) <= 1.2, `normal ${soft}, chief ${hard}`);
});

test('difficulty: NORMAL is the default, before any save', () => {
  assert.equal(settings.difficulty, 'normal');
  store.clear();
  loadSettings();
  assert.equal(settings.difficulty, 'normal', 'no save leaves it alone');
});

test('difficulty: a settings v1 save that holds chief reads as NORMAL, once, and a HARD picked after that stays HARD', () => {
  // Before the row, every save held chief, which nobody picked.
  store.set(KEY, JSON.stringify({ musicVol: 0.3, difficulty: 'chief', shell: 'dark' }));
  loadSettings();
  assert.equal(settings.difficulty, 'normal');
  assert.equal(settings.musicVol, 0.3, 'the rest of the save is kept');
  assert.equal(saved().difficulty, 'normal', 'written back at once, so it happens once');
  assert.equal(saved().rev, 2);
  assert.ok(!('rev' in settings), 'the rev is the save\'s, not a setting');

  settings.difficulty = 'chief';
  saveSettings();
  settings.difficulty = 'normal';
  loadSettings();
  assert.equal(settings.difficulty, 'chief', 'a HARD the player picked loads as HARD');
  loadSettings();
  assert.equal(settings.difficulty, 'chief', 'and again');
  // A v1 save that held something other than chief had it put there by hand: the guard below decides.
  settings.musicVol = 0.7;
  settings.shell = 'auto';
});

test('difficulty: a bad saved value falls back to NORMAL, like a bad shell falls back to AUTO', () => {
  for (const bad of ['nightmare', 42, null, 'kid', 'upside']) {
    store.set(KEY, JSON.stringify({ rev: 2, difficulty: bad }));
    settings.difficulty = 'chief';
    loadSettings();
    assert.equal(settings.difficulty, 'normal', `saved ${String(bad)}`);
  }
  store.set(KEY, '{not json');
  settings.difficulty = 'chief';
  loadSettings();
  assert.equal(settings.difficulty, 'chief', 'a corrupt save keeps what is there, as before');
});

test('difficulty: the DIFFICULTY row leads the options on every input, cycles NORMAL and HARD both ways, and saves each change', () => {
  store.clear();
  settings.difficulty = 'normal';
  for (const device of ['keyboard', 'gamepad', 'touch']) {
    const items = settingItems({ input: { device: () => device }, settings } as unknown as Game);
    assert.equal(items[0]?.label, 'DIFFICULTY', device);
  }
  const row = settingItems({ input: { device: () => 'keyboard' }, settings } as unknown as Game)[0] as MenuItem;
  const seen: string[] = [];
  const step = (go: () => void): void => {
    go();
    seen.push(`${row.value?.()} ${settings.difficulty} ${String(saved().difficulty)}`);
  };
  assert.equal(row.value?.(), 'NORMAL');
  step(() => row.adjust?.(1));
  step(() => row.adjust?.(1));
  step(() => row.adjust?.(-1));
  step(() => row.adjust?.(-1));
  step(() => row.activate?.());
  step(() => row.activate?.());
  assert.deepEqual(seen, [
    'HARD chief chief', 'NORMAL normal normal', 'HARD chief chief', 'NORMAL normal normal', 'HARD chief chief', 'NORMAL normal normal',
  ]);
});

test('difficulty: a change mid-stage takes hold at once, hits at the new factor and each living enemy keeping its share of HP', () => {
  // A stage factor whose rounding would drift if the HP were scaled from the rounded number: 24 x 1.15 is 28 on HARD, and
  // 24 x 0.85 x 1.15 is 23 on NORMAL, where 28 x 0.85 would give 24.
  const spawns = [agent('a', 8, 8), agent('b', 10, 8), agent('c', 12, 8), agent('e', 14, 8, 'g', { tier: 'elite' })];
  const b = makeWhite({ spawns, difficulty: 'chief', enemyMult: 1.15 });
  const [hurt, whole, dead, elite] = b.s.enemies as { hp: number; hpMax: number; dead: boolean }[];
  assert.ok(hurt && whole && dead && elite);
  assert.equal(whole.hpMax, 28);
  hurt.hp = 14;
  dead.hp = 0;
  dead.dead = true;
  b.sim.setDifficulty('normal');
  assert.equal(b.s.mult, DIFFICULTY_MULT.normal);
  const built = makeWhite({ spawns, difficulty: 'normal', enemyMult: 1.15 });
  assert.equal(whole.hpMax, hpMax(built), 'the same HP a stage started on NORMAL builds');
  assert.equal(whole.hpMax, 23);
  assert.equal(elite.hpMax, hpMax(built, 3), 'an elite too');
  assert.equal(whole.hp, whole.hpMax);
  assert.equal(hurt.hpMax, 23);
  assert.equal(hurt.hp, 12, 'half HP stays half: 14 of 28 is 12 of 23 (11.5 rounds up)');
  assert.equal(dead.hp, 0, 'the dead stay dead');
  assert.equal(hit(b), hit(built), 'and a hit lands like one on a stage started on NORMAL');

  b.sim.setDifficulty('normal');
  assert.equal(whole.hpMax, hpMax(built), 'the same difficulty again changes nothing');
  b.sim.setDifficulty('chief');
  assert.equal(whole.hpMax, 28, 'and back to HARD, with no drift');
  assert.equal(hurt.hp, 15, '12 of 23 is about half of 28');
});
