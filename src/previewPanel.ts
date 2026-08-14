import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { VariableType } from './variableRegistry';
import { escapeHtml, SAFE_COLOR, SAFE_FONT_FAMILY, SAFE_SPACING } from './valueSafety';

export interface PreviewArgument {
  name: string;
  value: string;
  type: VariableType;
}

export class PreviewPanel {
  private static panel: vscode.WebviewPanel | undefined;

  static show(arg: unknown): void {
    if (!isPreviewArgument(arg)) {
      void vscode.window.showWarningMessage('Unable to preview an invalid CSS variable.');
      return;
    }

    if (PreviewPanel.panel) {
      PreviewPanel.panel.title = `CSS Variable: ${arg.name}`;
      PreviewPanel.panel.webview.html = PreviewPanel.getHtmlContent(PreviewPanel.panel.webview, arg);
      PreviewPanel.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'cssVariablePreview',
      `CSS Variable: ${arg.name}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );

    PreviewPanel.panel = panel;
    panel.webview.html = PreviewPanel.getHtmlContent(panel.webview, arg);
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (isCloseMessage(message)) {
        panel.dispose();
      }
    }, undefined, []);
    panel.onDidDispose(() => {
      PreviewPanel.panel = undefined;
    });
  }

  private static getHtmlContent(webview: vscode.Webview, arg: PreviewArgument): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const title = escapeHtml(arg.name);
    const value = escapeHtml(arg.value);
    const preview = previewMarkup(arg);
    const previewStyles = previewStyleRules(arg);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>CSS Variable Preview</title>
  <style nonce="${nonce}">
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 16px; }
    header { align-items: center; display: flex; gap: 12px; justify-content: space-between; }
    h1 { font-size: 16px; margin: 0; overflow-wrap: anywhere; }
    button { color: inherit; background: transparent; border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder)); cursor: pointer; padding: 4px 8px; }
    .metadata { color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family); overflow-wrap: anywhere; }
    .swatch { border: 1px solid var(--vscode-contrastBorder); height: 64px; margin: 16px 0 8px; }
    .sample { border: 1px solid var(--vscode-contrastBorder); margin-top: 16px; padding: 12px; }
    ${previewStyles}
  </style>
</head>
<body>
  <header><h1>${title}</h1><button id="close" type="button">Close</button></header>
  <p class="metadata">${value}</p>
  ${preview}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('close').addEventListener('click', () => vscode.postMessage({ command: 'close' }));
  </script>
</body>
</html>`;
  }
}

function previewMarkup(arg: PreviewArgument): string {
  switch (arg.type) {
    case 'color':
      return SAFE_COLOR.test(arg.value)
        ? '<div class="swatch color-preview"></div><p>Color preview</p>'
        : '<p>Color value cannot be safely rendered.</p>';
    case 'typography':
      return SAFE_FONT_FAMILY.test(arg.value)
        ? '<p class="sample typography-preview">Sample text preview</p>'
        : '<p>Typography value cannot be safely rendered.</p>';
    case 'spacing':
      return SAFE_SPACING.test(arg.value)
        ? '<div class="sample spacing-preview">Spacing preview</div>'
        : '<p>Spacing value cannot be safely rendered.</p>';
    default:
      return '<p>Preview is unavailable for this CSS value.</p>';
  }
}

function previewStyleRules(arg: PreviewArgument): string {
  const value = escapeHtml(arg.value);

  switch (arg.type) {
    case 'color':
      return SAFE_COLOR.test(arg.value) ? `.color-preview { background-color: ${value}; }` : '';
    case 'typography':
      return SAFE_FONT_FAMILY.test(arg.value) ? `.typography-preview { font-family: ${value}; }` : '';
    case 'spacing':
      return SAFE_SPACING.test(arg.value) ? `.spacing-preview { padding: ${value}; }` : '';
    default:
      return '';
  }
}

function isPreviewArgument(value: unknown): value is PreviewArgument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === 'string'
    && /^--[\w-]+$/.test(candidate.name)
    && typeof candidate.value === 'string'
    && ['color', 'typography', 'spacing', 'unknown'].includes(candidate.type as string);
}

function isCloseMessage(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && (value as { command?: unknown }).command === 'close');
}
