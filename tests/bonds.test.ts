// Bonds (docs/game-design.md, "Bonds"): the rules that say which bonds a party has and what each gives, the data the Chapter 4 session
// switches on, and everything that prints them: the picks panel's card tags and bond line, the character sheet's lines, the
// stage-start callout. The sim side is in bonds-combat.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { HERO_IDS } from '../src/heroes/index.ts';
import { BONDS, NO_MODS, activeBonds, bondRows, bondsOf, gainedBonds, liveBonds, missingFrom, modsFor } from '../src/heroes/bonds.ts';
import type { BondDef, BondHero } from '../src/heroes/bonds.ts';
import { TINY_GLYPHS } from '../src/gfx/data/font.ts';
import { tinyWidth } from '../src/gfx/font.ts';
import { poolFor } from '../src/core/campaign.ts';
import { BOND_LINE_W, bondLine, createPicks, moveTo, rowOf, toggle } from '../src/ui/picks_logic.ts';
import type { PicksState } from '../src/ui/picks_logic.ts';
import { BOND_MAX, BOND_PITCH, BOND_Y, FOOT_Y, MOVES_Y, MOVE_PITCH, NOTE_DY, PANEL, RIGHT, RULE_Y, STAT_ROWS, TEXT_X } from '../src/ui/charsheetlayout.ts';
import { BANNER_FRAMES, BANNER_MAX, createBondBanner } from '../src/world/bondbanner.ts';

const ids = (bs: readonly BondDef[]): string[] => bs.map((b) => b.id);
const byId = (id: string): BondDef => BONDS.find((b) => b.id === id) as BondDef;

// ---------------------------------------------------------------- which bonds a party has
test('the design\'s seven bonds are in the data, and Hopper and Eddie\'s two are off', () => {
  assert.deepEqual(BONDS.map((b) => [b.id, b.on]), [
    ['friends', true], ['party-of-four', true], ['chief-and-kid', false], ['mad-max', true],
    ['babysitters-club', true], ['scoops-troop', true], ['hellfire', false],
  ]);
  assert.deepEqual(liveBonds().map((b) => b.id), ['friends', 'party-of-four', 'mad-max', 'babysitters-club', 'scoops-troop']);
  assert.deepEqual(byId('friends').heroes, ['mike', 'eleven']);
  assert.deepEqual(byId('party-of-four').heroes, ['mike', 'dustin', 'lucas', 'will']);
  assert.deepEqual(byId('chief-and-kid').heroes, ['hopper', 'eleven']);
  assert.deepEqual(byId('mad-max').heroes, ['lucas', 'max']);
  assert.deepEqual(byId('babysitters-club').heroes, ['steve', 'dustin']);
  assert.deepEqual(byId('scoops-troop').heroes, ['steve', 'robin']);
  assert.deepEqual(byId('hellfire').heroes, ['eddie', 'dustin']);
});

test('a pair\'s bond is active when both are in the party, in any order and beside anyone, and not otherwise', () => {
  assert.deepEqual(ids(activeBonds(['mike', 'eleven'])), ['friends']);
  assert.deepEqual(ids(activeBonds(['eleven', 'lucas', 'steve', 'mike'])), ['friends'], 'order and company do not matter');
  assert.deepEqual(ids(activeBonds(['mike', 'dustin', 'lucas', 'eleven'])), ['friends']);
  assert.deepEqual(ids(activeBonds(['mike', 'dustin', 'lucas', 'max'])), ['mad-max']);
  assert.deepEqual(ids(activeBonds(['steve', 'dustin'])), ['babysitters-club']);
  assert.deepEqual(ids(activeBonds(['robin', 'steve', 'nancy'])), ['scoops-troop']);
  assert.deepEqual(ids(activeBonds(['mike', 'dustin', 'lucas', 'robin'])), [], 'four heroes, no pair among them');
  assert.deepEqual(ids(activeBonds(['mike', 'dustin', 'steve', 'nancy'])), ['babysitters-club'], 'Steve and Dustin, with strangers');
});

test('a party can hold several at once, in list order', () => {
  assert.deepEqual(ids(activeBonds(['max', 'mike', 'lucas', 'eleven'])), ['friends', 'mad-max']);
  assert.deepEqual(ids(activeBonds(['steve', 'dustin', 'robin', 'mike'])), ['babysitters-club', 'scoops-troop']);
});

test('Party of four needs all four of them, not two or three', () => {
  assert.deepEqual(ids(activeBonds(['mike', 'dustin', 'lucas', 'will'])), ['party-of-four']);
  assert.deepEqual(ids(activeBonds(['will', 'lucas', 'dustin', 'mike'])), ['party-of-four']);
  for (const left of ['mike', 'dustin', 'lucas', 'will'] as const) {
    const three = (['mike', 'dustin', 'lucas', 'will'] as const).filter((h) => h !== left);
    assert.deepEqual(activeBonds([...three, 'robin']), [], `without ${left}`);
  }
});

test('a bond that is switched off never counts, even with both heroes there, until `on` is flipped', () => {
  const party: BondHero[] = ['hopper', 'eleven', 'eddie', 'dustin'];
  assert.deepEqual(activeBonds(party), [], 'Chief and kid and Hellfire wait');
  assert.equal(modsFor(party, 'hopper').def, 0);
  const chief = byId('chief-and-kid'), hellfire = byId('hellfire');
  chief.on = true; hellfire.on = true;
  try {
    assert.deepEqual(ids(activeBonds(party)), ['chief-and-kid', 'hellfire'], 'switching them on is all chapter 4 does');
    assert.equal(modsFor(party, 'hopper').def, 0.1);
    assert.equal(modsFor(party, 'eleven').def, 0.1);
    assert.equal(modsFor(party, 'eddie').solo, 120, 'the solo lasts 2 s longer, at 60 Hz');
    assert.equal(modsFor(party, 'dustin').solo, 0, 'it is Eddie\'s solo');
  } finally {
    chief.on = false; hellfire.on = false;
  }
  assert.deepEqual(activeBonds(party), []);
});

test('gainedBonds names what one more hero brings, and missingFrom who a bond still waits for', () => {
  assert.deepEqual(ids(gainedBonds(['mike', 'lucas'], ['mike', 'lucas', 'eleven'])), ['friends']);
  assert.deepEqual(gainedBonds(['mike', 'eleven'], ['mike', 'eleven', 'lucas']), [], 'a bond the party already had is not new');
  assert.deepEqual(ids(gainedBonds(['mike', 'dustin', 'lucas'], ['mike', 'dustin', 'lucas', 'will'])), ['party-of-four']);
  assert.deepEqual(missingFrom(byId('party-of-four'), ['mike', 'lucas']), ['dustin', 'will']);
  assert.deepEqual(missingFrom(byId('friends'), ['mike', 'eleven']), []);
  assert.deepEqual(bondsOf('steve').map((b) => b.id), ['babysitters-club', 'scoops-troop']);
  assert.deepEqual(bondsOf('nancy'), [], 'Nancy has none yet');
  assert.deepEqual(bondsOf('hopper'), [], 'and a bond that is off is not listed');
});

// ---------------------------------------------------------------- what they give
test('what each bond gives each member, as the design says', () => {
  const m = (party: BondHero[], id: BondHero) => modsFor(party, id);
  assert.deepEqual(m(['mike', 'eleven'], 'mike'), { ...NO_MODS, atk: 0.1 });
  assert.deepEqual(m(['mike', 'eleven'], 'eleven'), { ...NO_MODS, atk: 0.1, cover: 32 }, 'the DM screen covers her too');
  for (const h of ['mike', 'dustin', 'lucas', 'will'] as const) assert.deepEqual(m(['will', 'lucas', 'dustin', 'mike'], h), { ...NO_MODS, def: 0.08 });
  for (const h of ['lucas', 'max'] as const) assert.deepEqual(m(['lucas', 'max'], h), { ...NO_MODS, spd: 0.1 });
  assert.deepEqual(m(['steve', 'dustin'], 'steve'), { ...NO_MODS, babysit: 0.2 });
  assert.deepEqual(m(['steve', 'dustin'], 'dustin'), NO_MODS, 'Dustin only gets patched up, he gives nothing');
  for (const h of ['steve', 'robin'] as const) assert.deepEqual(m(['steve', 'robin'], h), { ...NO_MODS, crit: 0.1 });
});

test('bonuses from two bonds add, and a hero outside every bond, or outside the party, gets nothing', () => {
  assert.deepEqual(modsFor(['steve', 'dustin', 'robin', 'mike'], 'steve'), { ...NO_MODS, babysit: 0.2, crit: 0.1 });
  assert.deepEqual(modsFor(['lucas', 'max', 'mike', 'dustin', 'will'], 'lucas'), { ...NO_MODS, def: 0.08, spd: 0.1 }, 'five, as a roster can hold');
  assert.deepEqual(modsFor(['mike', 'eleven', 'lucas', 'max'], 'lucas'), { ...NO_MODS, spd: 0.1 });
  assert.deepEqual(modsFor(['mike', 'eleven', 'lucas', 'max'], 'nancy'), NO_MODS);
  assert.deepEqual(modsFor([], 'mike'), NO_MODS);
  assert.deepEqual(modsFor(['mike'], 'mike'), NO_MODS);
});

test('NO_MODS is frozen, so no hero can write a bonus into the shared object', () => {
  assert.ok(Object.isFrozen(NO_MODS));
  assert.deepEqual(modsFor(['mike'], 'mike'), NO_MODS);
  assert.notEqual(modsFor(['mike'], 'mike'), NO_MODS, 'each call hands back its own copy');
});

// ---------------------------------------------------------------- the words
const TEXTS = BONDS.flatMap((b) => [b.name, b.tag, b.perk, b.text]);

test('the words are the game\'s own: no em dashes, tags in 8 letters, perks in 24 characters', () => {
  for (const t of TEXTS) assert.ok(!/[\u2013\u2014]/.test(t), `"${t}" has a dash`);
  for (const b of BONDS) {
    assert.ok(b.tag.length <= 8, `${b.tag}`);
    assert.ok(b.perk.length <= 24, `${b.perk}`);
    assert.ok(b.name.length <= 17, `${b.name}`);
    assert.ok(b.text.length > b.perk.length, `${b.id} has a sentence`);
  }
  assert.equal(new Set(BONDS.map((b) => b.id)).size, BONDS.length);
  assert.equal(new Set(BONDS.map((b) => b.tag)).size, BONDS.length, 'every tag differs');
});

test('the 3 by 5 font has every mark a bond line uses', () => {
  const marks = new Set<string>();
  for (const b of BONDS) for (const ch of `${b.name} ${b.tag} ${b.perk} NEEDS DUSTIN, WILL 2 BONDS ADDS :`) marks.add(ch.toUpperCase());
  for (const ch of marks) if (ch !== ' ') assert.ok(TINY_GLYPHS[ch], `the tiny font lacks ${JSON.stringify(ch)}`);
  for (const ch of ["'", '+', '%', ',', ':', '.', '-']) {
    const rows = (TINY_GLYPHS[ch] ?? '').split('/');
    assert.equal(rows.length, 5, `${ch} has five rows`);
    for (const r of rows) assert.match(r, /^[.#]{3}$/, `${ch} rows are three columns`);
  }
});

// ---------------------------------------------------------------- the picks panel
const POOL9: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven', 'will', 'max', 'steve', 'robin', 'nancy'];
const pool9 = poolFor('3.3', POOL9.map((id) => ({ id, level: 6 })));
const open9 = (seed: HeroId[]): PicksState => createPicks(pool9, [], seed);
const at9 = (s: PicksState, id: HeroId): number => s.pool.findIndex((p) => p.id === id);
const on9 = (s: PicksState, id: HeroId): PicksState => moveTo(s, at9(s, id));

test('picks panel: a card carries the tag of its hero\'s bond, N BONDS for two, and nothing on the bench', () => {
  const s = open9(['mike', 'eleven', 'lucas', 'max']);
  assert.equal(rowOf(s, at9(s, 'mike')).bond, 'FRIENDS');
  assert.equal(rowOf(s, at9(s, 'eleven')).bond, 'FRIENDS');
  assert.equal(rowOf(s, at9(s, 'lucas')).bond, 'MAD MAX');
  assert.equal(rowOf(s, at9(s, 'max')).bond, 'MAD MAX');
  assert.equal(rowOf(s, at9(s, 'dustin')).bond, '', 'a hero on the bench has no tag');
  const two = open9(['steve', 'dustin', 'robin', 'mike']);
  assert.equal(rowOf(two, at9(two, 'steve')).bond, '2 BONDS');
  assert.equal(rowOf(two, at9(two, 'dustin')).bond, 'BABYSIT');
  assert.equal(rowOf(two, at9(two, 'robin')).bond, 'SCOOPS');
  assert.equal(rowOf(two, at9(two, 'mike')).bond, '', 'Mike has no one here');
});

test('picks panel: picking a pair shows the bond, and taking one out takes it away', () => {
  let s = open9(['mike', 'lucas', 'robin']);
  s = on9(s, 'mike');
  assert.equal(bondLine(s), null, 'no bond, no line');
  s = toggle(on9(s, 'eleven'));
  assert.equal(rowOf(s, at9(s, 'mike')).bond, 'FRIENDS');
  assert.deepEqual(bondLine(on9(s, 'mike')), { text: "Friends don't lie: +10% ATK, SHARED SCREEN", preview: false });
  s = toggle(on9(s, 'eleven'));
  assert.equal(rowOf(s, at9(s, 'mike')).bond, '');
  assert.equal(bondLine(on9(s, 'mike')), null);
});

test('picks panel: the cursor on a hero who would complete a bond previews it, only while there is room', () => {
  const s = open9(['mike', 'lucas', 'robin']);
  assert.deepEqual(bondLine(on9(s, 'eleven')), { text: "ADDS Friends don't lie", preview: true }, 'the perk does not fit after ADDS, so it is the name');
  assert.deepEqual(bondLine(on9(s, 'max')), { text: 'ADDS Mad Max: +10% SPD', preview: true });
  assert.equal(bondLine(on9(s, 'nancy')), null, 'Nancy brings nothing');
  const full = toggle(on9(s, 'nancy'));
  assert.equal(bondLine(on9(full, 'eleven')), null, 'a fifth cannot join, so there is nothing to preview');
});

test('picks panel: on START, or on a hero outside the bonds, the line lists the party\'s bonds, names first when there are two', () => {
  const s = open9(['mike', 'eleven', 'lucas', 'max']);
  assert.equal(bondLine(on9(s, 'nancy'))?.text, "Friends don't lie, Mad Max");
  assert.equal(bondLine(moveTo(s, s.pool.length))?.text, "Friends don't lie, Mad Max");
  assert.equal(bondLine(on9(s, 'lucas'))?.text, 'Mad Max: +10% SPD', 'on a bonded hero, that hero\'s bond');
  const club = open9(['steve', 'dustin', 'robin', 'mike']);
  assert.equal(bondLine(on9(club, 'steve'))?.text, "Babysitter's club, Scoops troop");
  assert.equal(bondLine(on9(club, 'dustin'))?.text, "Babysitter's club: BABYSIT HEALS DUSTIN");
  assert.equal(bondLine(on9(club, 'will'))?.text, "Babysitter's club, Scoops troop", 'a full party previews nothing');
});

test('picks panel: the bond line always fits beside START, for every four of nine and every place the cursor can be', () => {
  let longest = 0, lines = 0;
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) for (let c = b + 1; c < 9; c++) for (let d = c + 1; d < 9; d++) {
    const party = [a, b, c, d].map((i) => POOL9[i] as HeroId);
    const s = open9(party);
    for (let i = 0; i <= s.pool.length; i++) {
      const text = bondLine(moveTo(s, i))?.text;
      if (!text) continue;
      lines++;
      longest = Math.max(longest, tinyWidth(text));
      assert.ok(tinyWidth(text) <= BOND_LINE_W, `"${text}" is ${tinyWidth(text)} px`);
    }
  }
  assert.ok(lines > 100, `${lines} lines checked`);
  assert.ok(longest > 150, `the widest is ${longest}, so the check bites`);
});

// ---------------------------------------------------------------- the character sheet
test('sheet: a hero\'s bonds, the active ones first and green, the rest naming who they need', () => {
  const party: HeroId[] = ['mike', 'eleven', 'lucas', 'max'];
  assert.deepEqual(bondRows('mike', party), [
    { text: "Friends don't lie  +10% ATK, SHARED SCREEN", active: true },
    { text: 'Party of four  needs Dustin, Will', active: false },
  ]);
  assert.deepEqual(bondRows('max', party), [{ text: 'Mad Max  +10% SPD', active: true }]);
  assert.deepEqual(bondRows('steve', ['steve', 'dustin']), [
    { text: "Babysitter's club  BABYSIT HEALS DUSTIN", active: true },
    { text: 'Scoops troop  needs Robin', active: false },
  ]);
  assert.deepEqual(bondRows('nancy', party), [], 'Nancy has no bonds yet');
});

test('sheet: every line fits beside the portrait, whoever is missing', () => {
  const widest = (HERO_IDS as BondHero[]).flatMap((id) => [bondRows(id, []), bondRows(id, [id]), bondRows(id, HERO_IDS)].flat());
  assert.ok(widest.length > 15);
  for (const r of widest) assert.ok(tinyWidth(r.text) <= RIGHT - TEXT_X, `"${r.text}" is ${tinyWidth(r.text)} px of ${RIGHT - TEXT_X}`);
  for (const id of HERO_IDS) assert.ok(bondRows(id, []).length <= BOND_MAX, `${id} has more bonds than the sheet has lines`);
});

test('sheet: the bond lines sit between the role and the stats, and the moves still end above the panel\'s foot', () => {
  const lastBond = BOND_Y + (BOND_MAX - 1) * BOND_PITCH + 5;
  assert.ok(BOND_Y >= 69, 'under the 7 px role line');
  assert.ok(lastBond < (STAT_ROWS[0] as number), `${lastBond} against the stats at ${STAT_ROWS[0]}`);
  assert.ok((STAT_ROWS[1] as number) + 7 < RULE_Y && RULE_Y < MOVES_Y, 'stats, then the rule, then the moves');
  const lastNote = MOVES_Y + 5 * MOVE_PITCH + NOTE_DY + 7;
  assert.ok(lastNote <= PANEL.y + PANEL.h - 2, `the last note ends at ${lastNote}, the panel at ${PANEL.y + PANEL.h}`);
  assert.ok(PANEL.y + PANEL.h < FOOT_Y);
  assert.ok(MOVE_PITCH >= NOTE_DY + 7 + 1, 'a note never touches the next move');
});

// ---------------------------------------------------------------- the stage-start callout
test('callout: a stage that starts with a bond names it for 4 seconds of free play, and then it is gone', () => {
  const b = createBondBanner();
  b.sync(['mike', 'dustin', 'lucas', 'nancy']);
  assert.deepEqual(b.showing(), [], 'no bond, no callout');
  b.sync(['mike', 'eleven', 'lucas', 'nancy']);
  assert.deepEqual(ids(b.showing()), ['friends']);
  for (let i = 0; i < BANNER_FRAMES - 1; i++) b.tick();
  assert.deepEqual(ids(b.showing()), ['friends'], 'one frame left');
  b.tick();
  assert.deepEqual(b.showing(), []);
});

test('callout: a bond is told once, so a retry, which builds the sim again, does not repeat it', () => {
  const b = createBondBanner();
  const party: HeroId[] = ['mike', 'eleven', 'lucas', 'max'];
  b.sync(party);
  assert.deepEqual(ids(b.showing()), ['friends', 'mad-max'], 'both, in list order');
  for (let i = 0; i < BANNER_FRAMES; i++) b.tick();
  b.sync(party);
  b.sync(party);
  assert.deepEqual(b.showing(), [], 'asking again changes nothing');
});

test('callout: a hero who joins mid-stage and completes a bond brings it up, and it joins the strip if one is showing', () => {
  const b = createBondBanner();
  b.sync(['mike', 'lucas']);
  for (let i = 0; i < 30; i++) b.tick();
  b.sync(['mike', 'lucas', 'eleven']);
  assert.deepEqual(ids(b.showing()), ['friends'], 'Eleven joins and Friends don\'t lie lights up');
  for (let i = 0; i < 100; i++) b.tick();
  b.sync(['mike', 'lucas', 'eleven', 'max']);
  assert.deepEqual(ids(b.showing()), ['friends', 'mad-max'], 'the strip was up, so the new bond is added under it');
  for (let i = 0; i < BANNER_FRAMES - 1; i++) b.tick();
  assert.equal(b.showing().length, 2, 'and the clock started again');
});

test('callout: it names at most three, and every line of it fits the screen', () => {
  assert.equal(BANNER_MAX, 3);
  const b = createBondBanner();
  b.sync(['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin']);
  assert.equal(b.showing().length, BANNER_MAX);
  for (const x of BONDS) {
    assert.ok(`BOND ${x.name}`.length * 6 + 12 <= 256, `${x.name}`);
    assert.ok(x.perk.length * 6 + 12 <= 256, `${x.perk}`);
  }
});
