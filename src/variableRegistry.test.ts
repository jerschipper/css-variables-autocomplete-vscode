import assert = require('node:assert/strict');
import test = require('node:test');

import { parseCssVariables } from './cssVariableParser';
import { effectiveExcludePatterns, matchesWorkspaceGlob, normalizeWorkspaceGlob } from './globPattern';

test('normalizes and matches a node_modules stylesheet glob', () => {
  const include = normalizeWorkspaceGlob('./node_modules/**/**/**/*.css');

  assert.equal(include, 'node_modules/**/**/**/*.css');
  assert.equal(matchesWorkspaceGlob('node_modules/library/dist/styles/tokens.css', include), true);
  assert.equal(matchesWorkspaceGlob('src/styles/tokens.css', include), false);
  assert.deepEqual(
    effectiveExcludePatterns([include], ['node_modules/**', '.git/**']),
    ['.git/**'],
  );
});

test('parseCssVariables extracts a workspace token map and infers types', () => {
  const css = `
    :root {
      --brand-color: #ff0000;
      --title-font: "Segoe UI", sans-serif;
      --space-2: 8px;
      --danger: rgb(255, 0, 0);
    }

    .card {
      --card-padding: 16px;
    }
  `;

  const variables = parseCssVariables(css, 'sample.css');

  assert.equal(variables.length, 5);
  assert.deepEqual(
    variables.map((entry) => ({ name: entry.name, type: entry.type })),
    [
      { name: '--brand-color', type: 'color' },
      { name: '--title-font', type: 'typography' },
      { name: '--space-2', type: 'spacing' },
      { name: '--danger', type: 'color' },
      { name: '--card-padding', type: 'spacing' },
    ],
  );
});

test('parseCssVariables keeps malformed declarations from crashing the parser', () => {
  const css = `
    :root {
      --valid: #fff;
      --broken: 12px
      --still-valid: green;
    }
  `;

  const variables = parseCssVariables(css, 'sample.css');

  assert.equal(variables.length, 2);
  assert.deepEqual(
    variables.map((entry) => entry.name),
    ['--valid', '--still-valid'],
  );
});

test('parseCssVariables preserves a nearest selector and unknown values', () => {
  const css = `
    :root {
      --raw-token: widget;
    }

    .card {
      --card-gap: 1rem;
    }
  `;

  const variables = parseCssVariables(css, 'sample.css');

  assert.deepEqual(
    variables.map((entry) => ({ name: entry.name, scope: entry.scope, type: entry.type })),
    [
      { name: '--raw-token', scope: ':root', type: 'unknown' },
      { name: '--card-gap', scope: '.card', type: 'spacing' },
    ],
  );
});
