import assert = require('node:assert/strict');
import test = require('node:test');

import { closestMatches, levenshteinDistance } from './textDistance';

test('levenshteinDistance measures single-character edits', () => {
  assert.equal(levenshteinDistance('--brand-color', '--brand-colour'), 1);
  assert.equal(levenshteinDistance('--space-2', '--space-2'), 0);
});

test('closestMatches ranks nearest candidates within the threshold', () => {
  const candidates = ['--brand-color', '--brand-colour', '--space-2'];
  assert.deepEqual(closestMatches('--brand-colr', candidates, 3), ['--brand-color', '--brand-colour']);
  assert.deepEqual(closestMatches('--totally-different', candidates, 3), []);
});
