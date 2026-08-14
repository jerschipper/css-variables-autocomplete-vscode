import assert = require('node:assert/strict');
import test = require('node:test');

import { usageAtOffset } from './tokenUsageLookup';

test('usageAtOffset finds the usage containing the given offset', () => {
  const css = 'color: var(--brand-color);';
  const offset = css.indexOf('--brand-color') + 3;

  const usage = usageAtOffset(css, offset);

  assert.equal(usage?.name, '--brand-color');
});

test('usageAtOffset returns undefined outside any usage', () => {
  const css = 'color: var(--brand-color);';
  assert.equal(usageAtOffset(css, 0), undefined);
});
