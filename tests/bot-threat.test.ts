// The careful bot's back-off (combat/bot_threat.ts): a vine's lash and a pod's swell, and not while a demodog is closing in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backOffFrom } from '../src/combat/bot_threat.ts';
import { ENEMY_DEFS } from '../src/enemies/defs.ts';

const foe = (kind: string, d: number, windup = true) => ({ kind, x: d, y: 0, d, windup });
const lash = ENEMY_DEFS.vine.x.reach as number;
const cloud = ENEMY_DEFS.pod.x.cloud as number;

test('back-off: a vine winding up inside its lash and a pod swelling inside its cloud are stepped away from', () => {
  const vine = foe('vine', lash + 5), pod = foe('pod', cloud + 5);
  assert.equal(backOffFrom([vine]), vine);
  assert.equal(backOffFrom([foe('rat', 10), pod]), pod, 'the first one that threatens');
});

test('back-off: nothing out of reach, nothing idle, nothing that is not a lash or a swell', () => {
  assert.equal(backOffFrom([foe('vine', lash + 30)]), null, 'out of reach');
  assert.equal(backOffFrom([foe('vine', 10, false), foe('pod', 10, false)]), null, 'not winding up');
  assert.equal(backOffFrom([foe('guard', 10)]), null);
});

test('back-off: not while a demodog is within 240 px, because the dogs are what bite', () => {
  const vine = foe('vine', lash);
  assert.equal(backOffFrom([foe('demodog', 150, false), vine]), null, 'a dog closing in comes first');
  assert.equal(backOffFrom([vine, foe('demodog', 239, false)]), null);
  assert.equal(backOffFrom([foe('demodog', 280, false), vine]), vine, 'a dog far off does not');
});
