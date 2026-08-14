# CSS Variable Autocomplete

CSS Variable Autocomplete indexes custom-property declarations in configured CSS, SCSS, and Less files. It provides workspace-wide IntelliSense in `var(--...)` expressions and opens a type-aware preview after accepting a completion.

## Features

- Scans configured workspace stylesheets for declarations such as `--brand-color: #0057ff;`.
- Updates the token index after source files are created, changed, deleted, opened, or closed.
- Prefers declarations in the active document when a custom property exists in multiple files.
- Suggests color, typography, spacing, and unclassified tokens in CSS, SCSS, and Less editors.
- Renders recognized values in a CSP-restricted preview webview.
- Shows an inline color swatch next to every `var(--token)` usage.
- Hover over a `var(--token)` usage for its resolved value and a rendered swatch.
- Go to Definition jumps from a usage to its declaration.
- Rename Symbol renames a token's declaration and every usage across the workspace.
- Warns about `var(--token)` usages that don't match any known declaration, with quick fixes suggesting the nearest known name.
- Shows a CodeLens on declarations that are shadowed by the same token in other files.
- "CSS Variables: Show Token Dashboard" opens a searchable grid of every known token.
- "CSS Variables: Insert Token" opens a Quick Pick to insert a token at the cursor.

## Usage

1. Declare a custom property in a configured stylesheet:

   ```css
   :root {
     --brand-color: #0057ff;
     --space-3: 12px;
   }
   ```

2. In a CSS, SCSS, or Less file, type `var(--` and choose a completion.
3. The selected property name replaces only the partial name, preserving the surrounding `var(` expression.
4. A preview panel opens beside the editor. Disable it with `cssVariables.preview.enabled` when it is not wanted.

Completions are requested after `-` or `(` is typed and are offered only when the text before the cursor contains the configured prefix. The default prefix is `var(--`.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `cssVariables.preview.enabled` | `true` | Opens the preview panel after accepting a completion. |
| `cssVariables.scopes.include` | `**/*.css`, `**/*.scss`, `**/*.less` | Workspace glob patterns to index. |
| `cssVariables.scopes.exclude` | `node_modules/**`, `.git/**` | Workspace glob patterns to skip. |
| `cssVariables.triggerPrefix` | `var(--` | Required text before a completion is offered. |
| `cssVariables.decorations.enabled` | `true` | Shows an inline color swatch next to `var(--token)` usages. |
| `cssVariables.diagnostics.enabled` | `true` | Warns about `var(--token)` usages with no matching declaration. |

To index tokens from a dependency, add a `node_modules` include. An explicit dependency include overrides the default `node_modules/**` exclusion; other exclusions still apply.

```json
{
  "cssVariables.scopes.include": [
    "**/*.css",
    "**/*.scss",
    "**/*.less",
    "./node_modules/**/**/**/*.css"
  ]
}
```

`./node_modules/**/**/**/*.css` is accepted, though `node_modules/**/*.css` is the shorter equivalent.

## Installation

Install from the VS Code Marketplace or install locally from a built package:

```sh
code --install-extension <publisher>.css-variable-autocomplete
```

## GitHub

- Repository: https://github.com/jerschipper/css-variables-autocomplete-vscode
- Issues: https://github.com/jerschipper/css-variables-autocomplete-vscode/issues

## Development

```sh
npm install
npm run compile
npm test
```

Press `F5` in VS Code to launch an Extension Development Host. Test completion using a token declared in one configured stylesheet and consumed from another.

## Packaging

```sh
npm run package
```

The generated `.vsix` contains the compiled `out/` runtime and package documentation. Before Marketplace publication, confirm the verified repository URL, publisher identity, extension icon, and license file.

## Limitations

The index performs best-effort declaration extraction; it does not evaluate CSS cascade order, imports, `var()` chains, or computed values. Unrecognized values remain available as completions but do not receive a rendered preview.
