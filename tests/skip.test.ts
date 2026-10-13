import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settings, skipsDialogue } from '../src/core/settings.ts';
import { flags } from '../src/core/flags.ts';

test('skip story is off by default and follows the setting', () => {
  assert.equal(settings.skipDialogue, false);
  assert.equal(flags.rush, false);
  assert.equal(skipsDialogue(), false);
  settings.skipDialogue = true;
  assert.equal(skipsDialogue(), true);
  settings.skipDialogue = false;
  assert.equal(skipsDialogue(), false);
});
