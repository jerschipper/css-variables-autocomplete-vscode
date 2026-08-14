import assert = require('node:assert/strict');
import test = require('node:test');

import { findTokenUsages } from './tokenUsageScanner';

test('findTokenUsages locates var() usage sites, not declarations', () => {
  const css = `
    :root {
      --brand-color: #ff0000;
    }

    .card {
      color: var(--brand-color);
      padding: var(--space-2);
    }
  `;

  const usages = findTokenUsages(css);

  assert.deepEqual(usages.map((usage) => usage.name), ['--brand-color', '--space-2']);
  assert.equal(css.slice(usages[0].start, usages[0].end), '--brand-color');
});
