import * as vscode from 'vscode';
import { VariableRegistry } from './variableRegistry';

export interface CompletionConfiguration {
  triggerPrefix: string;
}

export class CompletionProvider implements vscode.CompletionItemProvider {
  constructor(
    private readonly registry: VariableRegistry,
    private configuration: CompletionConfiguration,
  ) {}

  updateConfiguration(configuration: CompletionConfiguration): void {
    this.configuration = configuration;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.CompletionItem[] | undefined {
    if (token.isCancellationRequested || !this.isCompletionContext(document, position)) {
      return undefined;
    }

    const range = this.completionRange(document, position);
    const query = document.getText(new vscode.Range(range.start, position)).toLowerCase();
    const variables = this.registry.getCompletionVariables(document.uri.toString());

    const items: vscode.CompletionItem[] = [];

    for (const entry of variables) {
      const customPropertyName = entry.name.slice(2);
      if (!customPropertyName.toLowerCase().includes(query)) {
        continue;
      }

      const item = new vscode.CompletionItem(entry.name, vscode.CompletionItemKind.Variable);
      item.range = range;
      item.insertText = customPropertyName;
      item.filterText = customPropertyName;
      item.detail = `${entry.value} (${entry.scope})`;
      item.documentation = new vscode.MarkdownString(
        `**${entry.name}**\n\n${entry.value}\n\nType: ${entry.type}\n\nSource: ${entry.file}`,
      );

      item.command = {
        command: 'cssVariables.showPreview',
        title: 'Show Preview',
        arguments: [{ name: entry.name, value: entry.value, type: entry.type }]
      };

      items.push(item);
    }

    return items;
  }

  private isCompletionContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const beforeCursor = document.lineAt(position.line).text.slice(0, position.character);
    return beforeCursor.lastIndexOf(this.configuration.triggerPrefix) >= 0;
  }

  private completionRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
    const beforeCursor = document.lineAt(position.line).text.slice(0, position.character);
    const prefixIndex = beforeCursor.lastIndexOf(this.configuration.triggerPrefix);
    return new vscode.Range(
      new vscode.Position(position.line, prefixIndex + this.configuration.triggerPrefix.length),
      position,
    );
  }
}
