import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAway, isMuted, setAway, setMuted } from '../src/audio/engine.ts';

test('going away silences the game without touching the player\'s own mute', () => {
  assert.equal(isAway(), false);
  assert.equal(isMuted(), false);
  setAway(true);
  assert.equal(isAway(), true);
  assert.equal(isMuted(), false);
  setAway(false);
  assert.equal(isAway(), false);
});

test('a manual mute survives a focus change in both directions', () => {
  setMuted(true);
  setAway(true);
  setAway(false);
  assert.equal(isMuted(), true);
  setMuted(false);
  assert.equal(isMuted(), false);
  assert.equal(isAway(), false);
});
