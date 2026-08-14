import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { VariableEntry, VariableRegistry } from './variableRegistry';
import { SAFE_COLOR, SAFE_FONT_FAMILY, SAFE_SPACING, escapeHtml } from './valueSafety';

export class TokenDashboardPanel {
  private static panel: vscode.WebviewPanel | undefined;

  static show(registry: VariableRegistry): void {
    const entries = uniqueEntries(registry);

    if (TokenDashboardPanel.panel) {
      TokenDashboardPanel.panel.webview.html = TokenDashboardPanel.getHtmlContent(TokenDashboardPanel.panel.webview, entries);
      TokenDashboardPanel.panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'cssVariableDashboard',
      'CSS Token Dashboard',
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
    );

    TokenDashboardPanel.panel = panel;
    panel.webview.html = TokenDashboardPanel.getHtmlContent(panel.webview, entries);
    panel.onDidDispose(() => {
      TokenDashboardPanel.panel = undefined;
    });
  }

  private static getHtmlContent(webview: vscode.Webview, entries: readonly VariableEntry[]): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const rows = entries.map((entry) => renderRow(entry)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>CSS Token Dashboard</title>
  <style nonce="${nonce}">
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 16px; }
    input { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; width: 100%; margin-bottom: 16px; box-sizing: border-box; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .card { border: 1px solid var(--vscode-contrastBorder); padding: 10px; }
    .name { font-weight: bold; overflow-wrap: anywhere; }
    .value { color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family); overflow-wrap: anywhere; }
    .swatch { height: 32px; margin: 8px 0; border: 1px solid var(--vscode-contrastBorder); }
  </style>
</head>
<body>
  <input id="search" type="text" placeholder="Filter tokens by name..." nonce="${nonce}">
  <div class="grid" id="grid">
    ${rows}
  </div>
  <script nonce="${nonce}">
    document.getElementById('search').addEventListener('input', (event) => {
      const query = event.target.value.toLowerCase();
      for (const card of document.querySelectorAll('.card')) {
        card.style.display = card.dataset.name.includes(query) ? '' : 'none';
      }
    });
  </script>
</body>
</html>`;
  }
}

function renderRow(entry: VariableEntry): string {
  const name = escapeHtml(entry.name);
  const value = escapeHtml(entry.value);
  const swatch = renderSwatch(entry);

  return `<div class="card" data-name="${name.toLowerCase()}">
    <div class="name">${name}</div>
    ${swatch}
    <div class="value">${value}</div>
    <div class="value">${entry.type} · ${escapeHtml(entry.file)}</div>
  </div>`;
}

function renderSwatch(entry: VariableEntry): string {
  switch (entry.type) {
    case 'color':
      return SAFE_COLOR.test(entry.value) ? `<div class="swatch" style="background-color:${entry.value};"></div>` : '';
    case 'typography':
      return SAFE_FONT_FAMILY.test(entry.value) ? `<div style="font-family:${entry.value};">Sample text</div>` : '';
    case 'spacing':
      return SAFE_SPACING.test(entry.value) ? `<div class="swatch" style="padding:${entry.value};"></div>` : '';
    default:
      return '';
  }
}

function uniqueEntries(registry: VariableRegistry): VariableEntry[] {
  const byName = new Map<string, VariableEntry>();
  for (const uri of registry.getAllIndexedFileUris()) {
    for (const entry of registry.getVariablesForFile(uri)) {
      if (!byName.has(entry.name)) {
        byName.set(entry.name, entry);
      }
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}
