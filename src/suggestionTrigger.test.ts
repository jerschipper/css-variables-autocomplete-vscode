import assert = require('node:assert/strict');
import test = require('node:test');

import { hasCompletedTriggerPrefix } from './suggestionTrigger';

test('hasCompletedTriggerPrefix recognizes a completed CSS variable expression', () => {
  assert.equal(hasCompletedTriggerPrefix('color: var(--', 'var(--'), true);
  assert.equal(hasCompletedTriggerPrefix('color: var(-', 'var(--'), false);
  assert.equal(hasCompletedTriggerPrefix('color: var(--brand', 'var(--'), false);
});
