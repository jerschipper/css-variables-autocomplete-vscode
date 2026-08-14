import * as vscode from 'vscode';
import { VariableEntry, VariableRegistry } from './variableRegistry';
import { usageAtOffset } from './tokenUsageLookup';
import { SAFE_COLOR, SAFE_FONT_FAMILY, SAFE_SPACING, escapeHtml } from './valueSafety';

export class TokenHoverProvider implements vscode.HoverProvider {
  constructor(private readonly registry: VariableRegistry) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const usage = usageAtOffset(document.getText(), document.offsetAt(position));
    if (!usage) {
      return undefined;
    }

    const entry = this.registry.getCompletionVariables(document.uri.toString())
      .find((candidate) => candidate.name === usage.name);
    if (!entry) {
      return undefined;
    }

    const range = new vscode.Range(document.positionAt(usage.start), document.positionAt(usage.end));
    return new vscode.Hover(renderHoverContent(entry), range);
  }
}

function renderHoverContent(entry: VariableEntry): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString();
  markdown.supportHtml = true;
  markdown.appendMarkdown(`**${escapeHtml(entry.name)}**: \`${escapeHtml(entry.value)}\`\n\n`);
  markdown.appendMarkdown(`${renderSwatch(entry)}\n\n`);
  markdown.appendMarkdown(`Type: ${entry.type} · Source: ${escapeHtml(entry.file)}`);
  return markdown;
}

function renderSwatch(entry: VariableEntry): string {
  switch (entry.type) {
    case 'color':
      return SAFE_COLOR.test(entry.value)
        ? `<span style="background-color:${entry.value};">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
        : '';
    case 'typography':
      return SAFE_FONT_FAMILY.test(entry.value)
        ? `<span style="font-family:${entry.value};">Sample text</span>`
        : '';
    case 'spacing':
      return SAFE_SPACING.test(entry.value)
        ? `<span style="display:inline-block;padding:${entry.value};border:1px solid gray;">&nbsp;</span>`
        : '';
    default:
      return '';
  }
}
